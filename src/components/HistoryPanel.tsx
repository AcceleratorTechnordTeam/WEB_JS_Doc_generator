import type { SavedProject } from '../types';
import s from './History.module.css';

interface Props {
  history: SavedProject[];
  onLoad: (item: SavedProject) => void;
  onDelete: (id: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const summary = ({ project: p }: SavedProject) =>
  [
    p.endpoints.length && `${p.endpoints.length} ep.`,
    p.objects.length && `${p.objects.length} obj.`,
    p.functions.length && `${p.functions.length} fn.`,
    p.messages.length && `${p.messages.length} msg.`,
    p.sql?.length && `${p.sql.length} sql`,
  ]
    .filter(Boolean)
    .join(' · ') || 'vide';

export function HistoryPanel({ history, onLoad, onDelete }: Props) {
  return (
    <section className={s.panel} aria-labelledby="history-title">
      <h2 id="history-title" className={s.title}>
        Projets enregistrés <span className={s.count}>{history.length}</span>
      </h2>
      {history.length === 0 ? (
        <p className={s.empty}>Les projets enregistrés apparaîtront ici (stockés dans ce navigateur).</p>
      ) : (
        <ul className={s.list}>
          {history.map((item) => (
            <li key={item.id} className={s.item}>
              <button type="button" className={s.load} onClick={() => onLoad(item)}>
                <span className={s.name}>{item.project.title || 'Sans titre'}</span>
                <span className={s.meta}>
                  <span className={s.kind}>{summary(item)}</span>
                  {dateFormat.format(item.savedAt)}
                </span>
              </button>
              <button
                type="button"
                className={s.delete}
                onClick={() => onDelete(item.id)}
                aria-label={`Supprimer ${item.project.title || 'ce projet'} des projets enregistrés`}
                title="Supprimer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
