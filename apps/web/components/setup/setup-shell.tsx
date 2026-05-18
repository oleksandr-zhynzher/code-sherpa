import type { ReactNode } from 'react';

import { Logo } from '../ui/design-system';

type SetupShellProps = Readonly<{
  activeNav?: 'home' | 'setup' | 'learn';
  children: ReactNode;
}>;

export function SetupShell({ activeNav = 'setup', children }: SetupShellProps): ReactNode {
  return (
    <div className="setup-shell">
      <header className="setup-shell__topbar">
        <Logo />
        <nav className="setup-shell__nav" aria-label="Main navigation">
          <a aria-current={activeNav === 'home' ? 'page' : undefined} href="/">
            Home
          </a>
          <a aria-current={activeNav === 'setup' ? 'page' : undefined} href="/setup">
            Setup
          </a>
          <a aria-current={activeNav === 'learn' ? 'page' : undefined} href="/learn">
            Learning Space
          </a>
        </nav>
        <div aria-hidden="true" className="setup-shell__avatar">
          OZ
        </div>
      </header>
      <main className="setup-shell__main">
        <div className="setup-sub-content">{children}</div>
      </main>
    </div>
  );
}
