import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { supabaseForSession } from "@/lib/supabase";
import { cancelInvite, createInvite, getMyCouple, unlinkCouple } from "./api";

export const coupleQueryKey = ["couple"] as const;

let activeWaitingChannel: ReturnType<ReturnType<typeof supabaseForSession>["channel"]> | null = null;
let waitingSubscribers = 0;

export function useCouple() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: coupleQueryKey,
    queryFn: () => getMyCouple(session!),
    enabled: Boolean(session),
    refetchInterval: (current) => current.state.data?.pendingInvite && !current.state.data.partner ? 5_000 : false,
  });

  React.useEffect(() => {
    if (!session || !query.data?.pendingInvite || query.data.partner) return;
    const client = supabaseForSession(session);
    const channelName = `couple-waiting-${session.user.id}`;

    waitingSubscribers += 1;
    if (!activeWaitingChannel) {
      const existing = client.getChannels().find((c) => c.topic === `realtime:${channelName}`);
      if (existing) {
        void client.removeChannel(existing);
      }
      activeWaitingChannel = client
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "couples", filter: `partner_1_id=eq.${session.user.id}` },
          () => void queryClient.invalidateQueries({ queryKey: coupleQueryKey }),
        )
        .subscribe();
    }

    return () => {
      waitingSubscribers = Math.max(0, waitingSubscribers - 1);
      if (waitingSubscribers === 0 && activeWaitingChannel) {
        const toRemove = activeWaitingChannel;
        activeWaitingChannel = null;
        void client.removeChannel(toRemove);
      }
    };
  }, [query.data?.partner, query.data?.pendingInvite, queryClient, session]);

  return query;
}

function useCoupleMutation(mutationFn: (session: NonNullable<ReturnType<typeof useAuth>["session"]>) => Promise<unknown>) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!session) throw new Error("Please sign in again.");
      return mutationFn(session);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coupleQueryKey }),
  });
}

export function useCreateInvite() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetEmail?: string) => {
      if (!session) throw new Error("Please sign in again.");
      return createInvite(session, targetEmail);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coupleQueryKey }),
  });
}

export function useCancelInvite() {
  return useCoupleMutation(cancelInvite);
}

export function useUnlinkCouple() {
  return useCoupleMutation(unlinkCouple);
}

export function useCoupleStatus() {
  const query = useCouple();
  const couple = query.data?.couple ?? null;
  const partner = query.data?.partner ?? null;
  const pendingInvite = query.data?.pendingInvite ?? null;
  const isPaired = Boolean(partner && couple?.status !== "ended");
  const hasPendingInvite = Boolean(
    pendingInvite && new Date(pendingInvite.expires_at).getTime() > Date.now()
  );

  return {
    ...query,
    couple,
    partner,
    pendingInvite,
    isPaired,
    hasPendingInvite,
  };
}
