import { useMemo, useState } from 'react';
import s from './App.module.css';
import { HistoryPanel } from './components/HistoryPanel';
import { OutputPanel } from './components/OutputPanel';
import { EndpointsTab, FunctionsTab, MessagesTab, ObjectsTab } from './components/ProjectTabs';
import w from './components/Workspace.module.css';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  emptyProject,
  generateProjectJson,
  migrateLegacy,
  reviveProject,
  reviveSavedProjects,
  validateProject,
} from './lib/project';
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

  const json = useMemo(() => generateProjectJson(project), [project]);
  const issues = useMemo(() => validateProject(project), [project]);

  /** Pastille rouge sur un onglet qui contient au moins une erreur. */
  const tabHasError: Record<Tab, boolean> = useMemo(
    () => ({
      endpoints: project.endpoints.some((e) => !e.requestId.trim() || !e.url.trim()),
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
          <OutputPanel output={json} issues={issues} name={project.title} extension="json" what="le JSON" withSaveAs />
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
