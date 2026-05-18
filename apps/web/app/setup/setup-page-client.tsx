'use client';

import { useEffect, useState } from 'react';

import { SetupOverview } from '../../components/setup/setup-overview';
import { api } from '../../lib/api';
import type { SetupState } from '../../lib/types';

const defaultSetup: SetupState = {
  agentDriver: 'copilot',
  agentModel: null,
  autoSaveProgress: true,
  claudePath: null,
  copilotPath: null,
  exerciseLanguage: 'python',
  guideTone: 'encouraging',
  repoUrl: null,
  safeRunChecks: true,
  workspacePath: './workspace',
};

export function SetupPageClient() {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSetup = async () => {
      try {
        const setupState = await api.getSetup();
        setSetup(setupState);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Setup status could not load.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSetup();
  }, []);

  return <SetupOverview error={error} isLoading={isLoading} setup={setup ?? defaultSetup} />;
}
