import { SetupFlow } from "./SetupFlow";
import { useCoupleSetup } from "./setup-hooks";

// Shows the one-time setup to the person who sent the invitation, once their partner has joined.
// It appears on whatever screen is open, and does nothing for the partner who accepted.
export function SetupGate() {
  const setup = useCoupleSetup();
  const data = setup.data;
  if (!data || !data.partner || data.setup_completed || !data.is_setup_owner) return null;
  return <SetupFlow setup={data} />;
}
