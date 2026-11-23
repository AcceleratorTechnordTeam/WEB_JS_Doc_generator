import { useState } from 'react';
import type { Issue } from '../types';
import s from './Output.module.css';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli pour les contextes sans API Clipboard
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [state, setState] = useState<'idle' | 'ok' | 'ko'>('idle');
  const onClick = async () => {
    setState((await copyText(text)) ? 'ok' : 'ko');
    window.setTimeout(() => setState('idle'), 1500);
  };
  return (
    <button type="button" className={primary ? s.primary : s.button} onClick={onClick}>
      {state === 'ok' ? '✓ Copié' : state === 'ko' ? 'Échec de la copie' : label}
    </button>
  );
}

export function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* API File System Access (Chrome, Edge, Opera) : non typée dans lib.dom pour l'instant. */
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
interface WritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
type ShowSaveFilePicker = (options?: SaveFilePickerOptions) => Promise<{ createWritable(): Promise<WritableFile> }>;

const saveFilePicker = (): ShowSaveFilePicker | undefined =>
  (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;

/** Mêmes types MIME que l'extension : utile pour le filtre de la boîte « Enregistrer sous ». */
const MIME: Record<string, string> = {
  json: 'application/json',
  ts: 'text/typescript',
  cs: 'text/plain',
  md: 'text/markdown',
};

/**
 * Ouvre la boîte « Enregistrer sous » du système pour choisir le dossier et le nom.
 * Renvoie `false` si l'utilisateur annule ; lève une erreur si l'écriture échoue.
 */
async function saveAs(filename: string, content: string, extension: string): Promise<boolean> {
  const picker = saveFilePicker();
  if (!picker) {
    download(filename, content);
    return true;
  }
  try {
    const handle = await picker({
      suggestedName: filename,
      types: [{ description: `Fichier .${extension}`, accept: { [MIME[extension] ?? 'text/plain']: [`.${extension}`] } }],
    });
    const file = await handle.createWritable();
    await file.write(content);
    await file.close();
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
}

export function SaveAsButton({ filename, content, extension }: { filename: string; content: string; extension: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'ko'>('idle');
  const supported = Boolean(saveFilePicker());
  const onClick = async () => {
    try {
      if (!(await saveAs(filename, content, extension))) return;
      setState('ok');
    } catch {
      setState('ko');
    }
    window.setTimeout(() => setState('idle'), 2000);
  };
  return (
    <button
      type="button"
      className={s.button}
      onClick={onClick}
      title={
        supported
          ? 'Choisir le dossier et le nom du fichier'
          : 'Ce navigateur ne permet pas de choisir le dossier : le fichier part dans Téléchargements (Chrome ou Edge le permettent).'
      }
    >
      {state === 'ok' ? '✓ Enregistré' : state === 'ko' ? "Échec de l'enregistrement" : 'Enregistrer sous…'}
    </button>
  );
}

interface Props {
  /** Code généré (commentaire, type ou classe). */
  output: string;
  issues: Issue[];
  /** Nom de base du fichier téléchargé (sans extension). */
  name: string;
  /** Extension du fichier téléchargé, sans point : md, ts, cs… */
  extension: string;
  /** Ce qui est copié, pour le libellé du bouton : « le commentaire », « le type »… */
  what: string;
  /** Ajoute « Enregistrer sous… » pour choisir l'emplacement du fichier. */
  withSaveAs?: boolean;
}

export function OutputPanel({ output, issues, name, extension, what, withSaveAs }: Props) {
  const errors = issues.filter((i) => i.level === 'error').length;
  const filename = `${name.trim().replace(/[^\w.-]+/g, '_') || 'documentation'}.${extension}`;

  return (
    <section className={s.panel} aria-label="Résultat">
      <div className={s.toolbar}>
        <div className={s.actions}>
          <CopyButton text={output} label={`Copier ${what}`} primary />
          {withSaveAs && <SaveAsButton filename={filename} content={output} extension={extension} />}
          <button type="button" className={s.button} onClick={() => download(filename, output)}>
            Télécharger .{extension}
          </button>
        </div>
      </div>

      {issues.length > 0 ? (
        <ul className={s.issues} aria-live="polite">
          {issues.map((issue, i) => (
            <li key={i} className={issue.level === 'error' ? s.error : s.warning}>
              {issue.level === 'error' ? '✕' : '!'} {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.ok}>✓ Documentation conforme au standard.</p>
      )}
      {errors > 0 && <p className={s.note}>Le résultat reste copiable, mais complète les champs en erreur avant de le committer.</p>}

      <pre className={s.code} tabIndex={0}>
        <code>{output}</code>
      </pre>
    </section>
  );
}
