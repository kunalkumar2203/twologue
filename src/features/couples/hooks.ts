import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { supabaseForSession } from "@/lib/supabase";
import { cancelInvite, createInvite, getMyCouple, unlinkCouple } from "./api";

export const coupleQueryKey = ["couple"] as const;

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
    const channel = supabaseForSession(session)
      .channel(`couple-waiting-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couples", filter: `partner_1_id=eq.${session.user.id}` },
        () => void queryClient.invalidateQueries({ queryKey: coupleQueryKey }),
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
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
