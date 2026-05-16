'use client';

import { useEffect, useState } from 'react';

import { SetupConfiguration } from '../../components/setup/setup-configuration';
import { SetupOverview } from '../../components/setup/setup-overview';
import { api } from '../../lib/api';
import type { SetupState } from '../../lib/types';

const defaultSetup: SetupState = {
  agentDriver: 'copilot',
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
  const [draft, setDraft] = useState<SetupState>(defaultSetup);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSetup = async () => {
      try {
        const setupState = await api.getSetup();
        setSetup(setupState);
        setDraft(setupState);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Setup status could not load.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSetup();
  }, []);

  const saveSetup = async () => {
    setIsSaving(true);
    try {
      const setupState = await api.saveSetup(draft);
      setSetup(setupState);
      setDraft(setupState);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Setup could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SetupOverview error={error} isLoading={isLoading} setup={setup} />
      <SetupConfiguration
        draft={draft}
        isSaving={isSaving}
        onChange={setDraft}
        onSave={() => void saveSetup()}
      />
    </>
  );
}
