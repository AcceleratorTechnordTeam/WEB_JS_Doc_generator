import { useMemo, useState } from 'react';
import s from './App.module.css';
import { DocForm } from './components/DocForm';
import { HistoryPanel } from './components/HistoryPanel';
import { ObjectForm } from './components/ObjectForm';
import { OutputPanel } from './components/OutputPanel';
import { useLocalStorage } from './hooks/useLocalStorage';
import { emptyDoc, emptyObject, LANG_LABEL, reviveDoc, reviveObject } from './lib/defaults';
import { generateMarkdown } from './lib/markdown';
import { generateObjectMarkdown } from './lib/objectMarkdown';
import { uid } from './lib/text';
import { validate, validateObject } from './lib/validate';
import type { Lang, Mode, SavedDoc } from './types';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Les anciennes entrées (sans `mode`) sont des fonctions. */
const reviveHistory = (raw: unknown): SavedDoc[] =>
  Array.isArray(raw)
    ? raw.filter(isRecord).map((r): SavedDoc => {
        const id = String(r.id ?? uid());
        const savedAt = Number(r.savedAt) || Date.now();
        return r.mode === 'object'
          ? { id, savedAt, mode: 'object', doc: reviveObject(r.doc) }
          : { id, savedAt, mode: 'function', doc: reviveDoc(r.doc) };
      })
    : [];

const reviveMode = (raw: unknown): Mode => (raw === 'object' ? 'object' : 'function');

const LANGS: Lang[] = ['ts', 'csharp'];
const MODES: { value: Mode; label: string }[] = [
  { value: 'function', label: 'Fonction' },
  { value: 'object', label: 'Objet' },
];

export default function App() {
  const [mode, setMode] = useLocalStorage<Mode>('jsdocgen:mode', () => 'function', reviveMode);
  const [doc, setDoc] = useLocalStorage('jsdocgen:draft', () => emptyDoc(), reviveDoc);
  const [obj, setObj] = useLocalStorage('jsdocgen:object-draft', () => emptyObject(), reviveObject);
  const [history, setHistory] = useLocalStorage<SavedDoc[]>('jsdocgen:history', () => [], reviveHistory);
  const [savedFlash, setSavedFlash] = useState(false);

  const isObject = mode === 'object';
  const lang = isObject ? obj.lang : doc.lang;
  const name = isObject ? obj.name : doc.name;

  const markdown = useMemo(() => (isObject ? generateObjectMarkdown(obj) : generateMarkdown(doc)), [isObject, obj, doc]);
  const issues = useMemo(() => (isObject ? validateObject(obj) : validate(doc)), [isObject, obj, doc]);

  const setLang = (l: Lang) => (isObject ? setObj((o) => ({ ...o, lang: l })) : setDoc((d) => ({ ...d, lang: l })));

  const save = () => {
    const entry: SavedDoc = isObject
      ? { id: uid(), savedAt: Date.now(), mode: 'object', doc: obj }
      : { id: uid(), savedAt: Date.now(), mode: 'function', doc };
    const key = name.trim();
    setHistory((h) => {
      // Une seule entrée par (type, langage, nom) : on remplace l'ancienne.
      const rest = h.filter((e) => !(key && e.mode === mode && e.doc.lang === lang && e.doc.name.trim() === key));
      return [entry, ...rest].slice(0, 100);
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const reset = () => {
    if (!window.confirm('Effacer le formulaire en cours ? (l’historique est conservé)')) return;
    if (isObject) setObj(emptyObject(obj.lang));
    else setDoc(emptyDoc(doc.lang));
  };

  const load = (item: SavedDoc) => {
    if (item.mode === 'object') setObj(reviveObject(item.doc));
    else setDoc(reviveDoc(item.doc));
    setMode(item.mode);
  };

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.brand}>
          <h1 className={s.title}>Générateur de documentation</h1>
          <span className={s.subtitle}>JSDoc · XML doc C# · Markdown</span>
        </div>
        <div className={s.langSwitch} role="radiogroup" aria-label="Type de documentation">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              className={mode === m.value ? s.langActive : s.lang}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className={s.langSwitch} role="radiogroup" aria-label="Langage">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              className={lang === l ? s.langActive : s.lang}
              onClick={() => setLang(l)}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <div className={s.headerActions}>
          <button type="button" className={s.secondary} onClick={reset}>
            Nouveau
          </button>
          <button type="button" className={s.primary} onClick={save} title="Enregistrer dans l’historique">
            {savedFlash ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.formColumn}>
          {isObject ? <ObjectForm doc={obj} setDoc={setObj} /> : <DocForm doc={doc} setDoc={setDoc} />}
        </div>

        <aside className={s.outputColumn}>
          <OutputPanel markdown={markdown} issues={issues} name={name} />
          <HistoryPanel
            history={history}
            onLoad={load}
            onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))}
          />
        </aside>
      </main>
    </div>
  );
}
