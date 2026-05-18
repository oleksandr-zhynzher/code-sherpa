import type { ReactNode } from 'react';

import type { SetupState } from '../../lib/types';
import { Toggle } from '../ui/design-system';

type SetupOverviewProps = Readonly<{
  error?: string | null;
  isLoading?: boolean;
  setup: SetupState | null;
}>;

function hasValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

const ITEMS = [
  {
    key: 'assistant',
    icon: '🤖',
    title: 'AI Assistant',
    desc: 'The guide that answers questions and builds exercises',
    href: '/setup/assistant',
    btnLabel: 'Configure',
  },
  {
    key: 'folder',
    icon: '📁',
    title: 'Practice Folder',
    desc: 'Where your work and progress are saved',
    href: '/setup/folder',
    btnLabel: 'Configure',
  },
  {
    key: 'preferences',
    icon: '⚙️',
    title: 'Preferences',
    desc: 'Language, safety choices, and exercise settings',
    href: '/setup/preferences',
    btnLabel: 'Edit',
  },
] as const;

export function SetupOverview({
  error = null,
  isLoading = false,
  setup,
}: SetupOverviewProps): ReactNode {
  const assistantPath = setup?.agentDriver === 'claude' ? setup.claudePath : setup?.copilotPath;
  const assistantReady = hasValue(assistantPath);
  const folderReady = hasValue(setup?.workspacePath);
  const setupReady = assistantReady && folderReady && !isLoading && error === null;

  const statuses: Record<string, { label: string; ready: boolean }> = {
    assistant: { label: assistantReady ? 'Connected' : 'Disconnected', ready: assistantReady },
    folder: { label: folderReady ? 'Connected' : 'Not set', ready: folderReady },
    preferences: { label: '2 preferences set', ready: true },
  };

  return (
    <section className="setup-overview">
      <div className="setup-overview__header">
        <h1>Get Set Up</h1>
        <p>Connect what you need, then start learning</p>
      </div>

      <div className="setup-go-banner">
        <span className="setup-go-banner__icon">{setupReady ? '✅' : error ? '⚠️' : '🔧'}</span>
        <p className="setup-go-banner__text">
          {setupReady
            ? "All systems ready — you're good to go!"
            : error
              ? 'We could not check setup status'
              : 'Some connections need attention — fix them below to continue'}
        </p>
        {setupReady && (
          <a className="setup-go-banner__btn" href="/learn">
            Go to Learning Space →
          </a>
        )}
      </div>

      <div className="setup-items">
        {ITEMS.map((item) => {
          const status = statuses[item.key];
          if (!status) return null;
          return (
            <div key={item.key} className="setup-item">
              <div className="setup-item__icon">{item.icon}</div>
              <div className="setup-item__info">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
              <div className="setup-item__right">
                <div className="setup-item__status">
                  <span
                    className="setup-item__status-dot"
                    style={status.ready ? {} : { background: 'var(--warning)' }}
                  />
                  <p
                    className="setup-item__status-text"
                    style={status.ready ? {} : { color: 'var(--warning)' }}
                  >
                    {status.label}
                  </p>
                </div>
                <a className="setup-item__btn" href={item.href}>
                  {item.btnLabel}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="setup-prefs-section">
        <h2>Your Preferences</h2>
        <div className="setup-pref-row">
          <span className="setup-pref-label">Exercise Language</span>
          <span className="setup-chip">{setup?.exerciseLanguage ?? 'Python'}</span>
        </div>
        <div className="setup-pref-row">
          <span className="setup-pref-label">Ask before running checks</span>
          <Toggle
            id="safe-run-checks"
            pressed={setup?.safeRunChecks ?? true}
            onPressedChange={() => {}}
            label="Ask before running checks"
          />
        </div>
      </div>

      <div className="setup-help">
        <strong>Need help?</strong>
        <p>Everything is working now, but if something breaks, we have you covered.</p>
        <a href="/setup#troubleshooting">View troubleshooting guide</a>
      </div>
    </section>
  );
}
