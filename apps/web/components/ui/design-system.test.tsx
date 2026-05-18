import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  Button,
  Card,
  Logo,
  Pill,
  ProgressBar,
  StatusBanner,
  Tabs,
  TextField,
  Toggle,
} from './design-system';

describe('design system primitives', () => {
  it('defines the design tokens used by the pen export', () => {
    const globalsCss = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

    expect(globalsCss).toContain('--surface-primary');
    expect(globalsCss).toContain('--surface-card');
    expect(globalsCss).toContain('--foreground-primary');
    expect(globalsCss).toContain('--accent-primary');
    expect(globalsCss).toContain('--success');
    expect(globalsCss).toContain('--warning');
    expect(globalsCss).toContain('--error');
    expect(globalsCss).toContain('--rounded-sm');
    expect(globalsCss).toContain('--font-heading');
  });

  it('renders accessible shared primitives', () => {
    const markup = renderToStaticMarkup(
      <main>
        <Logo />
        <Button>Start Learning</Button>
        <Card title="AI Assistant" description="The guide that answers questions">
          <Pill tone="success">Connected</Pill>
        </Card>
        <StatusBanner tone="warning" title="Needs attention">
          Check your local assistant connection.
        </StatusBanner>
        <ProgressBar label="Learning path progress" value={5} max={12} />
        <Tabs
          activeId="exercise"
          items={[
            { id: 'theory', label: 'Theory' },
            { id: 'exercise', label: 'Exercises' },
          ]}
        />
        <TextField id="repo" label="GitHub Repository" placeholder="username/repo" />
        <Toggle id="safe-run" label="Ask before running checks" pressed />
      </main>,
    );

    expect(markup).toContain('aria-label="code-sherpa home"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('<section');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="5"');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('for="repo"');
    expect(markup).toContain('aria-pressed="true"');
  });
});
