import { SetupShell } from '../../../components/setup/setup-shell';
import { SetupAssistantClient } from './setup-assistant-client';

export default function SetupAssistantPage() {
  return (
    <SetupShell>
      <SetupAssistantClient />
    </SetupShell>
  );
}
