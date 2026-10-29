import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useSessionMutation } from "@/hooks/use-session-mutation";
import * as api from "./api";

const CAPSULES_KEY = ["time-capsules"];

export function useTimeCapsules() {
  const { session } = useAuth();
  return useQuery({
    queryKey: CAPSULES_KEY,
    queryFn: () => api.listTimeCapsules(session!),
    enabled: Boolean(session),
  });
}

export const useCreateTimeCapsule = () =>
  useSessionMutation<api.NewCapsule, string>((session, args) => api.createTimeCapsule(session, args), [CAPSULES_KEY]);

export const useUpdateTimeCapsule = () =>
  useSessionMutation<api.UpdateCapsule, void>((session, args) => api.updateTimeCapsule(session, args), [CAPSULES_KEY]);

export const useDeleteTimeCapsule = () =>
  useSessionMutation<string, void>((session, capsuleId) => api.deleteTimeCapsule(session, capsuleId), [CAPSULES_KEY]);

export const useOpenTimeCapsule = () =>
  useSessionMutation<string, string>((session, capsuleId) => api.openTimeCapsule(session, capsuleId), [CAPSULES_KEY]);

export const useSetAnniversary = () =>
  useSessionMutation<{ coupleId: string; date: string }, void>(
    (session, args) => api.setAnniversaryDate(session, args.coupleId, args.date),
    [CAPSULES_KEY],
  );