import { LANG_LABEL } from '../lib/defaults';
import type { SavedDoc } from '../types';
import s from './History.module.css';

interface Props {
  history: SavedDoc[];
  onLoad: (item: SavedDoc) => void;
  onDelete: (id: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export function HistoryPanel({ history, onLoad, onDelete }: Props) {
  return (
    <section className={s.panel} aria-labelledby="history-title">
      <h2 id="history-title" className={s.title}>
        Historique <span className={s.count}>{history.length}</span>
      </h2>
      {history.length === 0 ? (
        <p className={s.empty}>Les fonctions et objets enregistrés apparaîtront ici (stockées dans ce navigateur).</p>
      ) : (
        <ul className={s.list}>
          {history.map((item) => (
            <li key={item.id} className={s.item}>
              <button type="button" className={s.load} onClick={() => onLoad(item)}>
                <span className={s.name}>{item.doc.name || 'Sans nom'}</span>
                <span className={s.meta}>
                  <span className={s.kind}>{item.mode === 'object' ? 'Objet' : 'Fonction'}</span>
                  <span className={item.doc.lang === 'ts' ? s.badgeTs : s.badgeCs}>{LANG_LABEL[item.doc.lang]}</span>
                  {dateFormat.format(item.savedAt)}
                </span>
              </button>
              <button
                type="button"
                className={s.delete}
                onClick={() => onDelete(item.id)}
                aria-label={`Supprimer ${item.doc.name || 'cette entrée'} de l'historique`}
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
