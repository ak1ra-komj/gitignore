import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'github', 'gitignore');
const outputTargets = [
  path.join(rootDir, 'public', 'data', 'templates-index.json'),
];
const mapTargets = [
  path.join(rootDir, 'public', 'data', 'templates-map.json'),
];
const apiDir = path.join(rootDir, 'public', 'api');

function normalizeTemplateKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.gitignore$/i, '')
    .replace(/[\s_.-]+/g, '')
    .replace(/[\/]+/g, '');
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(resolved);
      }

      return [resolved];
    }),
  );

  return files.flat();
}

function groupFor(canonicalName) {
  if (canonicalName.startsWith('Global/')) {
    return 'Global';
  }

  return canonicalName.includes('/') ? canonicalName.split('/')[0] : 'Core';
}

function summaryFor(body) {
  const comment = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('#') && !line.startsWith('##'));

  return comment ? comment.replace(/^#\s*/, '').trim() : 'Generated from github/gitignore.';
}

function aliasPriority(canonicalName) {
  if (canonicalName.startsWith('Global/')) {
    return 2;
  }

  return canonicalName.includes('/') ? 3 : 1;
}

async function main() {
  try {
    await fs.access(sourceDir);
  } catch {
    throw new Error('Missing github/gitignore submodule. Run: git submodule update --init --recursive');
  }

  const files = (await walk(sourceDir))
    .filter((file) => file.endsWith('.gitignore'))
    .filter((file) => !file.includes(`${path.sep}community${path.sep}`))
    .sort((left, right) => left.localeCompare(right));

  const aliases = {};
  const templates = {};
  const list = [];
  const index = [];

  for (const file of files) {
    const relativePath = path.relative(sourceDir, file).split(path.sep).join('/');
    const canonicalName = relativePath.replace(/\.gitignore$/i, '');
    const shortName = path.basename(relativePath, '.gitignore');
    const body = (await fs.readFile(file, 'utf8')).replace(/\s+$/g, '').trim();
    const displayName = canonicalName.startsWith('Global/') ? `${shortName} (Global)` : shortName;
    const record = {
      canonicalName,
      shortName,
      displayName,
      group: groupFor(canonicalName),
      aliases: [...new Set([canonicalName, shortName])],
      summary: summaryFor(body),
      body,
    };

    templates[canonicalName] = record;
    list.push(canonicalName);
    index.push({
      canonicalName: record.canonicalName,
      shortName: record.shortName,
      displayName: record.displayName,
      group: record.group,
      aliases: record.aliases,
      summary: record.summary,
    });

    for (const alias of record.aliases) {
      const normalized = normalizeTemplateKey(alias);
      const existing = aliases[normalized];
      if (!existing) {
        aliases[normalized] = canonicalName;
        continue;
      }

      const existingPriority = aliasPriority(existing);
      const candidatePriority = aliasPriority(canonicalName);
      if (
        candidatePriority < existingPriority ||
        (candidatePriority === existingPriority && canonicalName.length < existing.length)
      ) {
        aliases[normalized] = canonicalName;
      }
    }
  }

  const indexJson = JSON.stringify(index, null, 2);
  const mapJson = JSON.stringify({ aliases, templates, list }, null, 2);

  for (const target of outputTargets) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${indexJson}\n`, 'utf8');
  }

  for (const target of mapTargets) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${mapJson}\n`, 'utf8');
  }

  // Generate static API files for GitHub Pages hosting.
  // /api/list          → comma-separated list of canonical names
  // /api/{canonical}   → template body (e.g. /api/Global/macOS)
  // /api/{shortName}   → alias when shortName differs from canonicalName
  await fs.mkdir(apiDir, { recursive: true });
  await fs.writeFile(path.join(apiDir, 'list'), `${list.join(',')}\n`, 'utf8');

  const writtenAliases = new Set();

  for (const canonicalName of list) {
    const record = templates[canonicalName];
    const content = `${record.body}\n`;

    // Write canonical path (may include slash, e.g. Global/macOS)
    const canonicalFile = path.join(apiDir, ...canonicalName.split('/'));
    await fs.mkdir(path.dirname(canonicalFile), { recursive: true });
    await fs.writeFile(canonicalFile, content, 'utf8');
    writtenAliases.add(canonicalName);

    // Write short-name alias when it differs
    if (record.shortName !== canonicalName && !writtenAliases.has(record.shortName)) {
      const aliasFile = path.join(apiDir, record.shortName);
      await fs.mkdir(path.dirname(aliasFile), { recursive: true });
      await fs.writeFile(aliasFile, content, 'utf8');
      writtenAliases.add(record.shortName);
    }
  }

  process.stdout.write(`Generated ${index.length} templates.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});