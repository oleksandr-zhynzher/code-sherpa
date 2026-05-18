import { SetupShell } from '../../../components/setup/setup-shell';
import { SetupPreferencesClient } from './setup-preferences-client';

export default function SetupPreferencesPage() {
  return (
    <SetupShell>
      <SetupPreferencesClient />
    </SetupShell>
  );
}
