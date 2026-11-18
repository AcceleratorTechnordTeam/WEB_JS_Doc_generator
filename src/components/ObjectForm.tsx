import type { Dispatch, SetStateAction } from 'react';
import { newProperty, OBJECT_PLACEHOLDERS } from '../lib/defaults';
import { moveItem, patchItem, removeItem } from '../lib/list';
import type { ObjectDoc, PropertyDoc } from '../types';
import { RowActions, Section } from './Field';
import s from './Form.module.css';

interface Props {
  doc: ObjectDoc;
  setDoc: Dispatch<SetStateAction<ObjectDoc>>;
}

const code = { spellCheck: false, autoComplete: 'off' } as const;

export function ObjectForm({ doc, setDoc }: Props) {
  const ph = OBJECT_PLACEHOLDERS[doc.lang];

  const set = <K extends keyof ObjectDoc>(key: K, value: ObjectDoc[K]) => setDoc((d) => ({ ...d, [key]: value }));
  const updateProps = (fn: (list: PropertyDoc[]) => PropertyDoc[]) =>
    setDoc((d) => ({ ...d, properties: fn(d.properties) }));

  return (
    <form className={s.form} onSubmit={(e) => e.preventDefault()} noValidate>
      <Section title={doc.lang === 'ts' ? 'Objet (interface / type)' : 'Objet (classe / record)'}>
        <input
          className={`${s.input} ${s.mono} ${s.nameInput}`}
          value={doc.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={ph.name}
          aria-label="Nom de l'objet"
          {...code}
        />
        <textarea
          className={s.textarea}
          rows={2}
          value={doc.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Description — ce que représente l'objet."
          aria-label="Description de l'objet"
        />
      </Section>

      <Section
        title="Propriétés"
        count={doc.properties.length}
        onAdd={() => updateProps((l) => [...l, newProperty()])}
        addLabel="Ajouter une propriété"
      >
        {doc.properties.length === 0 && <p className={s.empty}>Aucune propriété.</p>}
        {doc.properties.map((p, i) => {
          const label = p.name || `propriété ${i + 1}`;
          const patch = (v: Partial<PropertyDoc>) => updateProps((l) => patchItem(l, p.id, v));
          return (
            <div key={p.id} className={s.row}>
              <div className={s.propLine}>
                <input
                  className={`${s.input} ${s.mono}`}
                  value={p.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={ph.prop}
                  aria-label={`Nom de la ${label}`}
                  {...code}
                />
                <input
                  className={`${s.input} ${s.mono}`}
                  value={p.type}
                  onChange={(e) => patch({ type: e.target.value })}
                  placeholder={ph.type}
                  aria-label={`Type de la ${label}`}
                  {...code}
                />
                <input
                  className={`${s.input} ${s.mono}`}
                  value={p.defaultValue}
                  onChange={(e) => patch({ defaultValue: e.target.value })}
                  placeholder="défaut"
                  aria-label={`Valeur par défaut de la ${label}`}
                  {...code}
                />
                <label className={s.toggle} title="Propriété optionnelle">
                  <input type="checkbox" checked={p.optional} onChange={(e) => patch({ optional: e.target.checked })} />
                  opt.
                </label>
                <label className={s.toggle} title="Propriété en lecture seule">
                  <input type="checkbox" checked={p.readonly} onChange={(e) => patch({ readonly: e.target.checked })} />
                  lecture
                </label>
                <RowActions
                  label={label}
                  onRemove={() => updateProps((l) => removeItem(l, p.id))}
                  onUp={i > 0 ? () => updateProps((l) => moveItem(l, p.id, -1)) : null}
                  onDown={i < doc.properties.length - 1 ? () => updateProps((l) => moveItem(l, p.id, 1)) : null}
                />
              </div>
              <input
                className={s.input}
                value={p.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Description de la propriété"
                aria-label={`Description de la ${label}`}
              />
            </div>
          );
        })}
      </Section>
    </form>
  );
}
