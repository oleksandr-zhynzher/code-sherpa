export type PenDimension = number | string | null;

export type PenFrameInventory = Readonly<{
  height: PenDimension;
  name: string;
  type: string;
  width: PenDimension;
}>;

export type PenDesignInventory = Readonly<{
  assets: ReadonlyArray<string>;
  textSnippets: ReadonlyArray<string>;
  tokens: ReadonlyArray<string>;
  topLevelFrames: ReadonlyArray<PenFrameInventory>;
  version: string | null;
}>;

type PenObject = Readonly<Record<string, unknown>>;

function isPenObject(value: unknown): value is PenObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringProperty(object: PenObject, key: string): string | null {
  const value = object[key];
  return typeof value === 'string' ? value : null;
}

function getDimensionProperty(object: PenObject, key: string): PenDimension {
  const value = object[key];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function getObjectChildren(object: PenObject): ReadonlyArray<PenObject> {
  const children = object['children'];
  if (!Array.isArray(children)) {
    return [];
  }

  return children.filter(isPenObject);
}

function addUnique(collection: Set<string>, value: string | null): void {
  const normalized = value?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return;
  }

  collection.add(normalized);
}

function collectFromValue(
  value: unknown,
  tokens: Set<string>,
  assets: Set<string>,
  textSnippets: Set<string>,
): void {
  if (typeof value === 'string') {
    if (value.startsWith('$')) {
      tokens.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromValue(item, tokens, assets, textSnippets);
    }
    return;
  }

  if (!isPenObject(value)) {
    return;
  }

  if (getStringProperty(value, 'type') === 'text') {
    addUnique(textSnippets, getStringProperty(value, 'content'));
  }

  addUnique(assets, getStringProperty(value, 'url'));
  for (const childValue of Object.values(value)) {
    collectFromValue(childValue, tokens, assets, textSnippets);
  }
}

function mapFrame(object: PenObject): PenFrameInventory {
  return {
    height: getDimensionProperty(object, 'height'),
    name: getStringProperty(object, 'name') ?? '',
    type: getStringProperty(object, 'type') ?? '',
    width: getDimensionProperty(object, 'width'),
  };
}

export function createPenDesignInventory(designExport: unknown): PenDesignInventory {
  if (!isPenObject(designExport)) {
    return {
      assets: [],
      textSnippets: [],
      tokens: [],
      topLevelFrames: [],
      version: null,
    };
  }

  const tokens = new Set<string>();
  const assets = new Set<string>();
  const textSnippets = new Set<string>();
  const topLevelFrames = getObjectChildren(designExport).map(mapFrame);

  collectFromValue(designExport, tokens, assets, textSnippets);

  return {
    assets: [...assets],
    textSnippets: [...textSnippets],
    tokens: [...tokens].sort(),
    topLevelFrames,
    version: getStringProperty(designExport, 'version'),
  };
}
