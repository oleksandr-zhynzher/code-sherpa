import { SetupShell } from '../../../components/setup/setup-shell';
import { SetupFolderClient } from './setup-folder-client';

export default function SetupFolderPage() {
  return (
    <SetupShell>
      <SetupFolderClient />
    </SetupShell>
  );
}
