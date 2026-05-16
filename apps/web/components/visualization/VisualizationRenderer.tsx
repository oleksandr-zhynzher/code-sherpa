'use client';

import type { Visualization } from '../../lib/types';

type Props = Readonly<{
  visualization: Visualization;
}>;

function ChartJsPreview({ payload }: Readonly<{ payload: string }>) {
  let formatted: string;

  try {
    formatted = JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    formatted = payload;
  }

  return (
    <pre className="overflow-auto rounded bg-[var(--surface-2)] p-3 text-xs text-[var(--fg-muted)]">
      {formatted}
    </pre>
  );
}

function MermaidPreview({ payload }: Readonly<{ payload: string }>) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--fg-muted)]">Mermaid diagram source:</p>
      <pre className="overflow-auto rounded bg-[var(--surface-2)] p-3 text-xs text-[var(--fg-base)]">
        {payload}
      </pre>
    </div>
  );
}

function SvgPreview({ payload }: Readonly<{ payload: string }>) {
  return (
    <div
      className="overflow-auto rounded border border-[var(--border)] p-2"
      // The payload has been sanitized server-side before storage.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}

export function VisualizationRenderer({ visualization }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--fg-muted)]">{visualization.prompt}</p>
      {visualization.kind === 'mermaid' && <MermaidPreview payload={visualization.payload} />}
      {visualization.kind === 'svg' && <SvgPreview payload={visualization.payload} />}
      {visualization.kind === 'chartjs' && <ChartJsPreview payload={visualization.payload} />}
    </div>
  );
}
