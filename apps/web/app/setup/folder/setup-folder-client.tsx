'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/api';
import type { SetupState } from '../../../lib/types';

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

type FolderMode = 'github' | 'local';

export function SetupFolderClient() {
  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [mode, setMode] = useState<FolderMode>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getSetup().then((s) => {
      setSetup(s);
      setRepoUrl(s.repoUrl ?? '');
      setLocalPath(s.workspacePath ?? '');
      if (s.repoUrl) setMode('github');
    });
  }, []);

  const isConnected = mode === 'github' ? !!setup.repoUrl : !!setup.workspacePath;
  const displayRepo = setup.repoUrl ?? 'username/code-sherpa-practice';

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await (mode === 'github'
        ? api.linkWorkspace({ repoUrl, ...(localPath ? { workspacePath: localPath } : {}) })
        : api.saveSetup({ ...setup, workspacePath: localPath }));
      window.location.href = '/setup';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save folder configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const disconnect = async () => {
    await api.saveSetup({ ...setup, repoUrl: null });
    const updated = await api.getSetup();
    setSetup(updated);
  };

  return (
    <>
      <a className="setup-back-link" href="/setup">
        ← Back to Setup
      </a>

      <div className="setup-sub-title">
        <h1>Connect Your Practice Folder</h1>
        <p>Choose where your work and progress are saved</p>
      </div>

      <div className="setup-options">
        <button
          className={`setup-option-card${mode === 'github' ? ' setup-option-card--selected' : ''}`}
          type="button"
          onClick={() => setMode('github')}
        >
          <div className="setup-option-card__icon">🐙</div>
          <h3>GitHub Repository</h3>
          <p>Sync your practice work to a GitHub repository for easy access anywhere</p>
        </button>

        <button
          className={`setup-option-card${mode === 'local' ? ' setup-option-card--selected' : ''}`}
          type="button"
          onClick={() => setMode('local')}
        >
          <div className="setup-option-card__icon setup-option-card__icon--neutral">📂</div>
          <h3>Local Folder</h3>
          <p>Keep your practice files on your computer without any cloud sync</p>
        </button>
      </div>

      {mode === 'github' ? (
        <div className="setup-form-card">
          <div className="setup-field">
            <label htmlFor="repo-url">Repository URL</label>
            <input
              id="repo-url"
              placeholder="https://github.com/username/repo"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <p className="setup-field__hint">
              Enter a GitHub repository URL to sync your practice files
            </p>
          </div>
        </div>
      ) : (
        <div className="setup-form-card">
          <div className="setup-field">
            <label htmlFor="local-path">Folder Path</label>
            <input
              id="local-path"
              placeholder="/Users/you/code-sherpa-practice"
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
            />
            <p className="setup-field__hint">
              Enter the full path to a local folder for your practice files
            </p>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="setup-connected-card">
          <p className="setup-connected-card__label">Connected Repository</p>
          <div className="setup-connected-card__repo-row">
            <p className="setup-connected-card__repo">{displayRepo}</p>
            <div className="setup-connected-card__status">
              <span className="setup-connected-card__status-dot" />
              <p className="setup-connected-card__status-text">Connected</p>
            </div>
          </div>
          <div className="setup-connected-card__branch">
            <p className="setup-connected-card__branch-label">Branch:</p>
            <p className="setup-connected-card__branch-value">main</p>
          </div>
          <button
            className="setup-connected-card__disconnect"
            type="button"
            onClick={() => void disconnect()}
          >
            Disconnect
          </button>
        </div>
      )}

      {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

      <button
        className="setup-save-btn"
        disabled={isSaving}
        type="button"
        onClick={() => void save()}
      >
        {isSaving ? 'Saving…' : 'Save & Continue'}
      </button>
    </>
  );
}
