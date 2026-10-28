import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import type { AuthSession } from "@/lib/supabase";

// A mutation that runs with the signed-in session, then refreshes the given queries
export function useSessionMutation<TArgs, TResult>(
  run: (session: AuthSession, args: TArgs) => Promise<TResult>,
  invalidate: QueryKey[] = [],
) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => {
      if (!session) throw new Error("Please sign in again.");
      return run(session, args);
    },
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}