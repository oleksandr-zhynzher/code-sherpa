import type { PropsWithChildren, ReactNode } from 'react';

import { Logo } from '../ui/design-system';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/setup', label: 'Setup' },
  { href: '/learn', label: 'Learning Space' },
];

type ProductShellProps = PropsWithChildren<
  Readonly<{
    activePath: '/' | '/learn' | '/setup';
  }>
>;

export function ProductShell({ activePath, children }: ProductShellProps): ReactNode {
  return (
    <div className="product-shell">
      <header className="product-shell__topbar">
        <Logo />
        <nav aria-label="Primary navigation" className="product-shell__nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              aria-current={item.href === activePath ? 'page' : undefined}
              className={
                item.href === activePath
                  ? 'product-shell__nav-link active'
                  : 'product-shell__nav-link'
              }
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="product-shell__main">{children}</main>
    </div>
  );
}
