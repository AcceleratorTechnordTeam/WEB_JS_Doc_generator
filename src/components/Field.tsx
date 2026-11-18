import { useState, type ReactNode } from 'react';
import s from './Form.module.css';

interface SectionProps {
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Section repliable, compacte. Le bouton « + » ouvre la section et ajoute une ligne. */
export function Section({ title, count, onAdd, addLabel = 'Ajouter', defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className={s.section} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={s.summary}>
        <span className={s.chevron} aria-hidden="true">
          ›
        </span>
        <span className={s.sectionTitle}>{title}</span>
        {count ? <span className={s.count}>{count}</span> : null}
        {onAdd && (
          <button
            type="button"
            className={s.addButton}
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
              onAdd();
            }}
            aria-label={addLabel}
            title={addLabel}
          >
            + Ajouter
          </button>
        )}
      </summary>
      <div className={s.body}>{children}</div>
    </details>
  );
}

interface RowActionsProps {
  label: string;
  onRemove: () => void;
  /** `undefined` = ligne non déplaçable, `null` = bouton désactivé (première/dernière ligne). */
  onUp?: (() => void) | null;
  onDown?: (() => void) | null;
}

export function RowActions({ label, onRemove, onUp, onDown }: RowActionsProps) {
  return (
    <div className={s.rowActions}>
      {onUp !== undefined && (
        <button
          type="button"
          className={s.iconButton}
          onClick={onUp ?? undefined}
          disabled={!onUp}
          aria-label={`Monter ${label}`}
          title="Monter"
        >
          ↑
        </button>
      )}
      {onDown !== undefined && (
        <button
          type="button"
          className={s.iconButton}
          onClick={onDown ?? undefined}
          disabled={!onDown}
          aria-label={`Descendre ${label}`}
          title="Descendre"
        >
          ↓
        </button>
      )}
      <button
        type="button"
        className={`${s.iconButton} ${s.danger}`}
        onClick={onRemove}
        aria-label={`Supprimer ${label}`}
        title="Supprimer"
      >
        ×
      </button>
    </div>
  );
}
