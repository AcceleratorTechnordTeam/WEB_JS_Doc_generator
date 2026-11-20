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

function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
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

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
}

export function OutputPanel({ output, issues, name, extension, what }: Props) {
  const errors = issues.filter((i) => i.level === 'error').length;
  const filename = `${name.trim().replace(/[^\w.-]+/g, '_') || 'documentation'}.${extension}`;

  return (
    <section className={s.panel} aria-label="Résultat">
      <div className={s.toolbar}>
        <div className={s.actions}>
          <CopyButton text={output} label={`Copier ${what}`} primary />
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
