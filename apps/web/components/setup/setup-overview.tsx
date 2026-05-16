import type { ReactNode } from 'react';

import type { SetupState } from '../../lib/types';
import { Button, Card, Pill, StatusBanner } from '../ui/design-system';

type SetupOverviewProps = Readonly<{
  error?: string | null;
  isLoading?: boolean;
  setup: SetupState | null;
}>;

function hasValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

export function SetupOverview({
  error = null,
  isLoading = false,
  setup,
}: SetupOverviewProps): ReactNode {
  const assistantReady = hasValue(setup?.claudePath);
  const folderReady = hasValue(setup?.repoUrl);
  const setupReady = assistantReady && folderReady && !isLoading && error === null;

  return (
    <section className="setup-overview">
      <div className="setup-overview__header">
        <p className="setup-preview__eyebrow">Get Set Up</p>
        <h1>Connect what you need, then start learning</h1>
      </div>

      {setupReady ? (
        <StatusBanner tone="success" title="All systems ready — you're good to go!">
          Your guide and practice folder are connected.
        </StatusBanner>
      ) : (
        <StatusBanner
          tone={error === null ? 'warning' : 'danger'}
          title={
            error === null
              ? 'Some connections need attention — fix them below to continue'
              : 'We could not check setup status'
          }
        >
          {error ?? 'Review each connection and follow the next step shown on the card.'}
        </StatusBanner>
      )}

      <div className="setup-overview__cards">
        <Card
          title="AI Assistant"
          description="The guide that answers questions and builds exercises"
        >
          <div className="setup-card__row">
            <Pill tone={assistantReady ? 'success' : 'danger'}>
              {assistantReady ? 'Connected' : 'Disconnected'}
            </Pill>
            <a className="cs-button cs-button--secondary" href="/setup#assistant">
              {assistantReady ? 'Configure' : 'Reconnect'}
            </a>
          </div>
          {assistantReady ? (
            <p className="setup-card__hint">{setup?.claudePath}</p>
          ) : (
            <p className="setup-card__error">
              We couldn&apos;t reach your guide — check your CLI path or try again.
            </p>
          )}
        </Card>

        <Card title="Practice Folder" description="Where your work and progress are saved">
          <div className="setup-card__row">
            <Pill tone={folderReady ? 'success' : 'warning'}>
              {folderReady ? 'Connected' : 'Needs attention'}
            </Pill>
            <a className="cs-button cs-button--secondary" href="/setup#practice-folder">
              {folderReady ? 'Configure' : 'Fix Connection'}
            </a>
          </div>
          {folderReady ? (
            <p className="setup-card__hint">{setup?.repoUrl}</p>
          ) : (
            <p className="setup-card__error">Your practice folder is not connected yet.</p>
          )}
        </Card>

        <Card title="Preferences" description="Language, safety choices, and exercise settings">
          <div className="setup-card__row">
            <Pill tone="success">Connected</Pill>
            <a className="cs-button cs-button--secondary" href="/setup#preferences">
              Edit
            </a>
          </div>
          <p className="setup-card__hint">2 preferences set</p>
        </Card>
      </div>

      <div className="setup-overview__footer">
        <div>
          <strong>Need help?</strong>
          <p>Everything is working now, but if something breaks, we have you covered.</p>
        </div>
        <a href="/setup#troubleshooting">View troubleshooting guide</a>
      </div>

      <a className="setup-overview__continue" href="/learn">
        <Button disabled={!setupReady}>Go to Learning Space</Button>
      </a>
    </section>
  );
}
