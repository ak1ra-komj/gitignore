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
      return new Response(`${map.list.join(',')}\n`, { headers: makeHeaders() });
    }

    const names = catchall
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const bodies: string[] = [];
    const missing: string[] = [];

    for (const name of names) {
      const canonical = map.templates[name] ? name : (map.aliases[normalizeKey(name)] ?? null);
      if (!canonical || !map.templates[canonical]) {
        missing.push(name);
      } else {
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
