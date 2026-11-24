import { useMemo, useRef, useState } from 'react';
import s from './App.module.css';
import { HistoryPanel } from './components/HistoryPanel';
import { JsonPanel, type Notice } from './components/JsonPanel';
import { EndpointsTab, FunctionsTab, MessagesTab, ObjectsTab } from './components/ProjectTabs';
import w from './components/Workspace.module.css';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  emptyProject,
  generateProjectJson,
  migrateLegacy,
  parseConfigurations,
  reviveProject,
  reviveSavedProjects,
  validateProject,
} from './lib/project';
import { parseProjectJson } from './lib/importJson';
import { uid } from './lib/text';
import { validate, validateObject } from './lib/validate';
import type { ProjectDoc, SavedProject, Tab } from './types';

const TABS: { value: Tab; label: string }[] = [
  { value: 'endpoints', label: 'Endpoints' },
  { value: 'objects', label: 'Objets' },
  { value: 'functions', label: 'Fonctions' },
  { value: 'messages', label: 'Messages' },
];

const reviveTab = (raw: unknown): Tab => (TABS.some((t) => t.value === raw) ? (raw as Tab) : 'endpoints');

type ListKey = 'endpoints' | 'objects' | 'functions' | 'messages';

export default function App() {
  const [project, setProject] = useLocalStorage<ProjectDoc>('jsdocgen:project', migrateLegacy, reviveProject);
  const [saved, setSaved] = useLocalStorage<SavedProject[]>('jsdocgen:projects', () => [], reviveSavedProjects);
  const [tab, setTab] = useLocalStorage<Tab>('jsdocgen:tab', () => 'endpoints', reviveTab);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const json = useMemo(() => generateProjectJson(project), [project]);
  const issues = useMemo(() => validateProject(project), [project]);

  /** Pastille rouge sur un onglet qui contient au moins une erreur. */
  const tabHasError: Record<Tab, boolean> = useMemo(
    () => ({
      endpoints: project.endpoints.some(
        (e) =>
          !e.requestId.trim() ||
          !e.url.trim() ||
          (e.type === 'non-standard' && !parseConfigurations(e.payload.configurations).valid),
      ),
      objects: project.objects.some((o) => validateObject(o.doc).some((i) => i.level === 'error')),
      functions: project.functions.some((x) => validate(x.doc).some((i) => i.level === 'error')),
      messages: project.messages.some((m) => !m.messageId.trim() || !m.message.trim()),
    }),
    [project],
  );

  const updater =
    <K extends ListKey>(key: K) =>
    (fn: (list: ProjectDoc[K]) => ProjectDoc[K]) =>
      setProject((p) => ({ ...p, [key]: fn(p[key]) }));

  const save = () => {
    const title = project.title.trim();
    setSaved((h) => {
      // Une seule sauvegarde par titre : on remplace l'ancienne.
      const rest = h.filter((e) => !(title && e.project.title.trim() === title));
      return [{ id: uid(), savedAt: Date.now(), project }, ...rest].slice(0, 50);
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const reset = () => {
    if (!window.confirm('Commencer un nouveau projet ? Le projet en cours sera effacé (les projets enregistrés sont conservés).'))
      return;
    setProject(emptyProject());
    setSelectedObject(null);
    setSelectedFunction(null);
  };

  /** Remplace le projet par le JSON donné. Renvoie un message d'erreur, ou null si c'est appliqué. */
  const applyJson = (text: string, source: 'edit' | 'import'): string | null => {
    try {
      const { project: next, warnings } = parseProjectJson(text);
      setProject(next);
      setSelectedObject(null);
      setSelectedFunction(null);
      setNotice({
        level: warnings.length ? 'warning' : 'success',
        title:
          (source === 'import' ? '✓ JSON importé' : '✓ Modifications appliquées') +
          (warnings.length ? ` — ${warnings.length} point(s) à vérifier` : ''),
        lines: warnings,
      });
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  const isEmpty =
    !project.title.trim() &&
    project.endpoints.length + project.objects.length + project.functions.length + project.messages.length === 0;

  const importFile = async (file: File) => {
    if (!isEmpty && !window.confirm(`Importer « ${file.name} » ? Le projet en cours sera remplacé (enregistre-le avant si besoin).`))
      return;
    const error = applyJson(await file.text(), 'import');
    if (error) setNotice({ level: 'error', title: `Import de « ${file.name} » impossible`, lines: [error] });
  };

  const load = (item: SavedProject) => {
    if (!window.confirm(`Ouvrir « ${item.project.title || 'Sans titre'} » ? Le projet en cours sera remplacé.`)) return;
    setProject(reviveProject(item.project));
    setSelectedObject(null);
    setSelectedFunction(null);
  };

  const counts: Record<Tab, number> = {
    endpoints: project.endpoints.length,
    objects: project.objects.length,
    functions: project.functions.length,
    messages: project.messages.length,
  };

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.brand}>
          <h1 className={s.title}>Générateur de documentation</h1>
          <span className={s.subtitle}>Endpoints · objets · TSDoc · messages → JSON</span>
        </div>
        <div className={s.headerActions}>
          <button type="button" className={s.secondary} onClick={reset}>
            Nouveau
          </button>
          <button
            type="button"
            className={s.secondary}
            onClick={() => fileInput.current?.click()}
            title="Ouvrir un fichier .json exporté par l'outil"
          >
            Importer
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ''; // permet de réimporter le même fichier
              if (file) void importFile(file);
            }}
          />
          <button type="button" className={s.primary} onClick={save} title="Enregistrer le projet dans ce navigateur">
            {savedFlash ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.formColumn}>
          <input
            className={w.titleInput}
            value={project.title}
            onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
            placeholder="Titre général — ex. Declare Activity"
            aria-label="Titre général"
          />

          <div className={w.tabs} role="tablist" aria-label="Catégories">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                className={tab === t.value ? w.tabActive : w.tab}
                onClick={() => setTab(t.value)}
              >
                {t.label}
                <span className={w.tabCount}>{counts[t.value]}</span>
                {tabHasError[t.value] && <span className={w.tabError} title="Contient des erreurs" />}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === 'endpoints' && <EndpointsTab endpoints={project.endpoints} update={updater('endpoints')} />}
            {tab === 'objects' && (
              <ObjectsTab
                objects={project.objects}
                update={updater('objects')}
                selectedId={selectedObject}
                onSelect={setSelectedObject}
              />
            )}
            {tab === 'functions' && (
              <FunctionsTab
                functions={project.functions}
                update={updater('functions')}
                selectedId={selectedFunction}
                onSelect={setSelectedFunction}
              />
            )}
            {tab === 'messages' && <MessagesTab messages={project.messages} update={updater('messages')} />}
          </div>
        </div>

        <aside className={s.outputColumn}>
          <JsonPanel
            json={json}
            issues={issues}
            title={project.title}
            notice={notice}
            onDismissNotice={() => setNotice(null)}
            onApply={(text) => applyJson(text, 'edit')}
          />
          <HistoryPanel
            history={saved}
            onLoad={load}
            onDelete={(id) => setSaved((h) => h.filter((e) => e.id !== id))}
          />
        </aside>
      </main>
    </div>
  );
}
