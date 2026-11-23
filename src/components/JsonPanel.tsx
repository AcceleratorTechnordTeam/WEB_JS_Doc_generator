import { useState } from 'react';
import type { Issue } from '../types';
import s from './Output.module.css';
import { CopyButton, download, SaveAsButton } from './OutputPanel';

/** Bandeau affiché après un import ou des modifications appliquées. */
export interface Notice {
  level: 'success' | 'warning' | 'error';
  title: string;
  lines: string[];
}

interface Props {
  json: string;
  issues: Issue[];
  title: string;
  notice: Notice | null;
  onDismissNotice: () => void;
  /** Applique un JSON modifié à la main : renvoie un message d'erreur, ou null si c'est appliqué. */
  onApply: (text: string) => string | null;
}

const NOTICE_CLASS = { success: s.noticeSuccess, warning: s.noticeWarning, error: s.noticeError };

export function JsonPanel({ json, issues, title, notice, onDismissNotice, onApply }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const errors = issues.filter((i) => i.level === 'error').length;
  const filename = `${title.trim().replace(/[^\w.-]+/g, '_') || 'documentation'}.json`;

  const startEdit = () => {
    setDraft(json);
    setError(null);
    setEditing(true);
  };
  const apply = () => {
    const err = onApply(draft);
    if (err) setError(err);
    else setEditing(false);
  };

  return (
    <section className={s.panel} aria-label="JSON final">
      <div className={s.toolbar}>
        <div className={s.actions}>
          {editing ? (
            <>
              <button type="button" className={s.primary} onClick={apply}>
                Appliquer
              </button>
              <button type="button" className={s.button} onClick={() => setEditing(false)}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <CopyButton text={json} label="Copier le JSON" primary />
              <button type="button" className={s.button} onClick={startEdit} title="Modifier le JSON à la main">
                ✎ Modifier
              </button>
              <SaveAsButton filename={filename} content={json} extension="json" />
              <button type="button" className={s.button} onClick={() => download(filename, json)}>
                Télécharger .json
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <>
          {error ? (
            <p className={`${s.notice} ${s.noticeError}`} role="alert">
              ✕ {error}
            </p>
          ) : (
            <p className={s.note}>
              Modifie le JSON puis « Appliquer » : les onglets sont mis à jour. Astuce : copie un bloc d'objet pour en
              faire une variante.
            </p>
          )}
          <textarea
            className={s.editor}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') apply();
            }}
            spellCheck={false}
            aria-label="JSON modifiable"
            autoFocus
          />
        </>
      ) : (
        <>
          {notice && (
            <div className={`${s.notice} ${NOTICE_CLASS[notice.level]}`} role="status">
              <div className={s.noticeHead}>
                <strong>{notice.title}</strong>
                <button type="button" className={s.noticeClose} onClick={onDismissNotice} aria-label="Fermer">
                  ×
                </button>
              </div>
              {notice.lines.length > 0 && (
                <ul className={s.noticeList}>
                  {notice.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
          {errors > 0 && (
            <p className={s.note}>Le résultat reste copiable, mais complète les champs en erreur avant de le committer.</p>
          )}
          <pre className={s.code} tabIndex={0}>
            <code>{json}</code>
          </pre>
        </>
      )}
    </section>
  );
}
