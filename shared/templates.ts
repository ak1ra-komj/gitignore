export type TemplateMeta = {
  canonicalName: string;
  shortName: string;
  displayName: string;
  group: string;
  aliases: string[];
  summary: string;
};

export type TemplateRecord = TemplateMeta & {
  body: string;
};

export type TemplateData = {
  aliases: Record<string, string>;
  templates: Record<string, TemplateRecord>;
  list: string[];
};

export function normalizeTemplateKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.gitignore$/i, '')
    .replace(/[\s_.-]+/g, '')
    .replace(/[\/]+/g, '');
}

export function parseTemplateQuery(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}