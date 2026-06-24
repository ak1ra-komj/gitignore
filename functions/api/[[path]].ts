interface TemplatesMap {
  aliases: Record<string, string>;
  templates: Record<string, { body: string; canonicalName: string }>;
  list: string[];
}

let data: TemplatesMap | null = null;

async function getData(request: Request): Promise<TemplatesMap> {
  if (!data) {
    const url = new URL('/data/templates-map.json', request.url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load templates data: ${response.status}`);
    }
    data = (await response.json()) as TemplatesMap;
  }

  return data;
}

function columnize(items: string[], width = 120): string {
  if (items.length === 0) return '';
  const maxLen = Math.max(...items.map((s) => s.length));
  const colWidth = maxLen + 2;
  const cols = Math.max(1, Math.floor(width / colWidth));
  const rows = Math.ceil(items.length / cols);
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = c * rows + r;
      if (idx < items.length) {
        line.push(items[idx]!.padEnd(colWidth));
      }
    }
    lines.push(line.join('').trimEnd());
  }
  return lines.join('\n');
}

const LONG_NAME_THRESHOLD = 35;

function formatGroup(items: string[], threshold: number): string {
  const short = items.filter((s) => s.length <= threshold);
  const long = items.filter((s) => s.length > threshold);
  const parts: string[] = [];
  if (short.length > 0) {
    parts.push(columnize(short));
  }
  if (long.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push(long.join('\n'));
  }
  return parts.join('\n');
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.gitignore$/i, '')
    .replace(/[\s_.-]+/g, '')
    .replace(/[/]+/g, '');
}

function makeHeaders(): Headers {
  const headers = new Headers();
  headers.set('content-type', 'text/plain; charset=utf-8');
  headers.set('access-control-allow-origin', '*');
  headers.set('cache-control', 'no-store');
  return headers;
}

export const onRequest: PagesFunction = async (context) => {
  const { pathname } = new URL(context.request.url);
  const catchall = decodeURIComponent(pathname.slice('/api/'.length));

  try {
    const map = await getData(context.request);

    if (!catchall) {
      return new Response('Usage: /api/list, /api/Node, /api/Go,Node\n', {
        status: 400,
        headers: makeHeaders(),
      });
    }

    if (catchall === 'list') {
      const core: string[] = [];
      const global: string[] = [];
      const community: string[] = [];
      for (const name of map.list) {
        if (name.startsWith('Global/')) {
          global.push(name);
        } else if (name.startsWith('community/')) {
          community.push(name);
        } else {
          core.push(name);
        }
      }
      const sections: string[] = [];
      for (const [label, items] of Object.entries({ Core: core, Global: global, Community: community })) {
        if (items.length === 0) continue;
        sections.push(`${label} (${items.length}):\n${formatGroup(items, LONG_NAME_THRESHOLD)}`);
      }
      return new Response(`${sections.join('\n\n')}\n\n${map.list.length} templates.\n`, { headers: makeHeaders() });
    }

    const names = catchall
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const bodies: string[] = [];
    const missing: string[] = [];
    const seen = new Set<string>();

    for (const name of names) {
      let canonical = map.templates[name] ? name : (map.aliases[normalizeKey(name)] ?? null);
      if (!canonical) {
        const communityName = `community/${name}`;
        canonical =
          map.templates[communityName] ?? map.aliases[normalizeKey(communityName)] ?? null;
      }
      if (!canonical || !map.templates[canonical]) {
        if (!missing.includes(name)) missing.push(name);
      } else if (!seen.has(canonical)) {
        seen.add(canonical);
        bodies.push(map.templates[canonical].body);
      }
    }

    if (missing.length) {
      return new Response(
        `Unknown template(s): ${missing.join(', ')}\nSee /api/list for available names.\n`,
        { status: 404, headers: makeHeaders() },
      );
    }

    return new Response(`${bodies.join('\n\n').trim()}\n`, { headers: makeHeaders() });
  } catch {
    return new Response('Internal server error\n', {
      status: 500,
      headers: makeHeaders(),
    });
  }
};
