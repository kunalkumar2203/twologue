import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useSessionMutation } from "@/hooks/use-session-mutation";
import { getCoupleSetup, saveCoupleSettings, type SettingsChange } from "./setup-api";

export const coupleSetupKey = ["couple-setup"];

export function useCoupleSetup() {
  const { session } = useAuth();
  return useQuery({
    queryKey: coupleSetupKey,
    queryFn: () => getCoupleSetup(session!),
    enabled: Boolean(session),
    // While no partner has joined yet, check now and then so the setup appears without a reload
    refetchInterval: (query) => (query.state.data && !query.state.data.partner ? 20_000 : false),
  });
}

export function useSaveCoupleSettings() {
  return useSessionMutation<{ change: SettingsChange; complete?: boolean }, void>(
    (session, args) => saveCoupleSettings(session, args.change, args.complete ?? false),
    [coupleSetupKey],
  );
}
