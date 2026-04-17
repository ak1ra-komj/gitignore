import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  parseTemplateQuery,
  type TemplateData,
  type TemplateMeta,
  type TemplateRecord,
  uniqueValues,
} from '../shared/templates';

const INDEX_URL = './data/templates-index.json';
const DATA_URL = './data/templates-map.json';
const POPULAR_TEMPLATES = ['Node', 'Python', 'Go', 'Rust', 'Terraform', 'Global/macOS'];

function buildApiBase(): string {
  // Resolve to the directory of the current page so this works at any base path,
  // including GitHub Pages subdirectory deployments (e.g. user.github.io/repo/).
  return new URL('.', window.location.href).href.replace(/\/$/, '');
}

function buildPreview(selection: string[], templates: Record<string, TemplateRecord> | null): string {
  if (!selection.length || !templates) {
    return '';
  }

  return selection
    .map((name) => templates[name]?.body ?? '')
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

type ApiModalProps = {
  apiBase: string;
  selection: string[];
  onClose: () => void;
};

function ApiModal({ apiBase, selection, onClose }: ApiModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const apiTemplatePath = selection.length ? selection.map(encodeURIComponent).join(',') : 'Go,Node';
  const apiTarget = `${apiBase}/api/${apiTemplatePath}`;
  const apiListTarget = `${apiBase}/api/list`;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="api-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="api-modal__inner">
        <div className="api-modal__header">
          <h2>API Compatibility</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="muted-text">Drop-in replacement for curl-based git aliases.</p>

        <div className="api-card">
          <p className="api-card__label">List all templates</p>
          <a href={apiListTarget} target="_blank" rel="noreferrer">
            <code>{apiListTarget}</code>
          </a>
        </div>
        <div className="api-card">
          <p className="api-card__label">Fetch template(s)</p>
          <code>{apiTarget}</code>
        </div>
        <div className="api-card">
          <p className="api-card__label">Git alias</p>
          <pre>{`[alias]\n    ignore = "!gi() { curl -sL ${apiBase}/api/$@ ;}; gi"`}</pre>
        </div>
        <div className="api-card api-card--note">
          <p className="api-card__label">Note</p>
          <p className="muted-text small-text">
            Single-template requests like <code>curl /api/Go</code> are served as static files.
            Multi-template concatenation (<code>curl /api/Go,Node</code>) requires a dynamic
            backend — use the UI above for merged downloads on this static deployment.
          </p>
        </div>
      </div>
    </dialog>
  );
}

export default function App() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showApi, setShowApi] = useState(false);
  const [isIndexLoading, setIsIndexLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const apiBase = buildApiBase();

  useEffect(() => {
    const controller = new AbortController();

    async function loadIndex() {
      setIsIndexLoading(true);

      try {
        const response = await fetch(INDEX_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unable to load template index (${response.status})`);
        }

        const payload = (await response.json()) as TemplateMeta[];
        setTemplates(payload);

        const params = new URLSearchParams(window.location.search);
        const requested = parseTemplateQuery(params.get('templates') ?? '');
        const available = new Set(payload.map((item) => item.canonicalName));
        const safeSelection = requested.filter((item) => available.has(item));
        if (safeSelection.length) {
          setSelection(uniqueValues(safeSelection));
        }
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsIndexLoading(false);
        }
      }
    }

    void loadIndex();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selection.length || templateData) {
      return;
    }

    const controller = new AbortController();

    async function loadTemplateData() {
      setIsContentLoading(true);

      try {
        const response = await fetch(DATA_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unable to load template content (${response.status})`);
        }

        const payload = (await response.json()) as TemplateData;
        setTemplateData(payload);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsContentLoading(false);
        }
      }
    }

    void loadTemplateData();

    return () => controller.abort();
  }, [selection, templateData]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selection.length) {
      url.searchParams.set('templates', selection.join(','));
    } else {
      url.searchParams.delete('templates');
    }

    window.history.replaceState({}, '', url);
  }, [selection]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleTemplates = normalizedQuery
    ? templates
        .filter((t) =>
          [t.canonicalName, t.displayName, t.shortName, ...t.aliases].some((v) =>
            v.toLowerCase().includes(normalizedQuery),
          ),
        )
        .slice(0, 20)
    : [];

  const preview = buildPreview(selection, templateData?.templates ?? null);

  function addTemplate(name: string) {
    startTransition(() => {
      setSelection((prev) => (prev.includes(name) ? prev : [...prev, name]));
    });
    setQuery('');
  }

  function removeTemplate(name: string) {
    startTransition(() => {
      setSelection((prev) => prev.filter((item) => item !== name));
    });
  }

  async function copyPreview() {
    if (preview) {
      await navigator.clipboard.writeText(preview);
    }
  }

  function downloadPreview() {
    if (!preview) {
      return;
    }

    const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '.gitignore';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="shell">
      <header className="site-header">
        <div className="site-header__brand">
          <span className="brand">gitignore</span>
          <span className="muted-text">
            {isIndexLoading ? '…' : `${templates.length} templates`}
          </span>
        </div>
        <button className="button button--ghost" type="button" onClick={() => setShowApi(true)}>
          API
        </button>
      </header>

      <main>
        <section className="search-section">
          <div className="search-pills">
            {POPULAR_TEMPLATES.map((item) => (
              <button
                key={item}
                className={`pill${selection.includes(item) ? ' pill--active' : ''}`}
                type="button"
                onClick={() => (selection.includes(item) ? removeTemplate(item) : addTemplate(item))}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="searchbox-wrap">
            <label className="searchbox">
              <input
                type="search"
                value={query}
                placeholder="Search templates: Node, Go, macOS, VisualStudioCode…"
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            {visibleTemplates.length > 0 && (
              <ul className="results" role="listbox">
                {visibleTemplates.map((template) => {
                  const isSelected = selection.includes(template.canonicalName);
                  return (
                    <li key={template.canonicalName}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`result-item${isSelected ? ' result-item--selected' : ''}`}
                        onClick={() =>
                          isSelected
                            ? removeTemplate(template.canonicalName)
                            : addTemplate(template.canonicalName)
                        }
                      >
                        <span className="result-item__name">{template.displayName}</span>
                        <span className="result-item__group">{template.group}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selection.length > 0 && (
            <div className="selection">
              {selection.map((item) => (
                <button key={item} className="chip" type="button" onClick={() => removeTemplate(item)}>
                  {item} ✕
                </button>
              ))}
            </div>
          )}
        </section>

        {selection.length > 0 && (
          <section className="panel output-panel">
            <div className="panel__header">
              <div>
                <h2>Merged .gitignore</h2>
                <p className="muted-text">
                  {selection.length} template{selection.length > 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="button-row">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => void copyPreview()}
                >
                  Copy
                </button>
                <button className="button button--secondary" type="button" onClick={downloadPreview}>
                  Download
                </button>
              </div>
            </div>
            <pre className="preview">
              {isContentLoading ? 'Loading…' : preview || '# Building preview…'}
            </pre>
          </section>
        )}
      </main>

      {showApi && (
        <ApiModal apiBase={apiBase} selection={selection} onClose={() => setShowApi(false)} />
      )}

      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}

