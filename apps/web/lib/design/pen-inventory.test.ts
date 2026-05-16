import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPenDesignInventory } from './pen-inventory';

const expectedTopLevelFrames = [
  'Home Page',
  'Setup Page',
  'Your Learning Space',
  'Learning Space — Theory View',
  'Setup — AI Assistant Config',
  'Setup — Practice Folder Config',
  'Setup — Preferences Expanded',
  'Setup — Error State',
  'Learning Space — Quiz',
  'Learning Space — Quiz Results',
];

describe('createPenDesignInventory', () => {
  it('summarizes the current design export without losing page frames', () => {
    const designExport = JSON.parse(
      readFileSync(new URL('../../../../code-sherpa.pen', import.meta.url), 'utf8'),
    ) as unknown;

    const inventory = createPenDesignInventory(designExport);

    expect(inventory.version).toBe('2.11');
    expect(inventory.topLevelFrames.map((frame) => frame.name)).toEqual(expectedTopLevelFrames);
    expect(inventory.assets).toContain('images/generated-1778944760160.png');
    expect(inventory.assets).toContain('./images/generated-1778948563108.png');
    expect(inventory.tokens).toContain('$--accent-primary');
    expect(inventory.tokens).toContain('$--surface-primary');
    expect(inventory.textSnippets).toContain('Your guide to mastering problem-solving');
    expect(inventory.textSnippets).toContain('Quiz Complete');
  });
});
