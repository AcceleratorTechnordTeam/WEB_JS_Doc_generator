import type { Dispatch, SetStateAction } from 'react';
import { newParam, newThrows, newTypeParam, PLACEHOLDERS } from '../lib/defaults';
import { moveItem, patchItem, removeItem } from '../lib/list';
import type { FunctionDoc } from '../types';
import { RowActions, Section } from './Field';
import s from './Form.module.css';

interface Props {
  doc: FunctionDoc;
  setDoc: Dispatch<SetStateAction<FunctionDoc>>;
}

type ListKey = 'params' | 'typeParams' | 'throws';

const code = { spellCheck: false, autoComplete: 'off' } as const;

export function DocForm({ doc, setDoc }: Props) {
  const ph = PLACEHOLDERS[doc.lang];
  const isTs = doc.lang === 'ts';

  const set = <K extends keyof FunctionDoc>(key: K, value: FunctionDoc[K]) => setDoc((d) => ({ ...d, [key]: value }));

  const updateList = <K extends ListKey>(key: K, fn: (list: FunctionDoc[K]) => FunctionDoc[K]) =>
    setDoc((d) => ({ ...d, [key]: fn(d[key]) }));

  return (
    <form className={s.form} onSubmit={(e) => e.preventDefault()} noValidate>
      <Section title="Fonction">
        <input
          className={`${s.input} ${s.mono} ${s.nameInput}`}
          value={doc.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={ph.name}
          aria-label="Nom de la fonction"
          {...code}
        />
        <textarea
          className={s.textarea}
          rows={2}
          value={doc.summary}
          onChange={(e) => set('summary', e.target.value)}
          placeholder="Description — ce que fait la fonction."
          aria-label="Description"
        />
        <textarea
          className={s.textarea}
          rows={1}
          value={doc.remarks}
          onChange={(e) => set('remarks', e.target.value)}
          placeholder="Remarques (optionnel) — effets de bord, performances…"
          aria-label="Remarques"
        />
      </Section>

      <Section
        title="Paramètres"
        count={doc.params.length}
        onAdd={() => updateList('params', (l) => [...l, newParam()])}
        addLabel="Ajouter un paramètre"
      >
        {doc.params.length === 0 && <p className={s.empty}>Aucun paramètre.</p>}
        {doc.params.map((p, i) => {
          const label = p.name || `paramètre ${i + 1}`;
          const patch = (v: Partial<typeof p>) => updateList('params', (l) => patchItem(l, p.id, v));
          return (
            <div key={p.id} className={s.row}>
              <div className={s.paramLine}>
                <input
                  className={`${s.input} ${s.mono}`}
                  value={p.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="nom"
                  aria-label={`Nom du ${label}`}
                  {...code}
                />
                <input
                  className={`${s.input} ${s.mono}`}
                  value={p.defaultValue}
                  onChange={(e) => patch({ defaultValue: e.target.value })}
                  placeholder="défaut"
                  aria-label={`Valeur par défaut du ${label}`}
                  {...code}
                />
                {/* En TSDoc, l'optionnalité vient de la signature (`?`) : la case ne sert qu'en C#. */}
                {!isTs && (
                  <label className={s.toggle} title="Paramètre optionnel">
                    <input type="checkbox" checked={p.optional} onChange={(e) => patch({ optional: e.target.checked })} />
                    opt.
                  </label>
                )}
                <RowActions
                  label={label}
                  onRemove={() => updateList('params', (l) => removeItem(l, p.id))}
                  onUp={i > 0 ? () => updateList('params', (l) => moveItem(l, p.id, -1)) : null}
                  onDown={i < doc.params.length - 1 ? () => updateList('params', (l) => moveItem(l, p.id, 1)) : null}
                />
              </div>
              <input
                className={s.input}
                value={p.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Description du paramètre"
                aria-label={`Description du ${label}`}
              />
            </div>
          );
        })}
      </Section>

      <Section title="Retour">
        <input
          className={s.input}
          value={doc.returnDescription}
          onChange={(e) => set('returnDescription', e.target.value)}
          placeholder="Description du retour — laisser vide si la fonction ne renvoie rien"
          aria-label="Description du retour"
        />
      </Section>

      <Section
        title="Exceptions"
        count={doc.throws.length}
        defaultOpen={doc.throws.length > 0}
        onAdd={() => updateList('throws', (l) => [...l, newThrows()])}
        addLabel="Ajouter une exception"
      >
        {doc.throws.length === 0 && <p className={s.empty}>Aucune exception.</p>}
        {doc.throws.map((t, i) => {
          const label = t.type || `exception ${i + 1}`;
          const patch = (v: Partial<typeof t>) => updateList('throws', (l) => patchItem(l, t.id, v));
          return (
            <div key={t.id} className={s.pairLineActions}>
              <input
                className={`${s.input} ${s.mono}`}
                value={t.type}
                onChange={(e) => patch({ type: e.target.value })}
                placeholder={ph.throws}
                aria-label={`Type de l'${label}`}
                {...code}
              />
              <input
                className={s.input}
                value={t.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Condition — si l'utilisateur n'existe pas"
                aria-label={`Condition de l'${label}`}
              />
              <RowActions label={label} onRemove={() => updateList('throws', (l) => removeItem(l, t.id))} />
            </div>
          );
        })}
      </Section>

      <Section
        title="Génériques"
        count={doc.typeParams.length}
        defaultOpen={doc.typeParams.length > 0}
        onAdd={() => updateList('typeParams', (l) => [...l, newTypeParam()])}
        addLabel="Ajouter un paramètre de type"
      >
        {doc.typeParams.length === 0 && <p className={s.empty}>Aucun paramètre de type.</p>}
        {doc.typeParams.map((t, i) => {
          const label = t.name || `générique ${i + 1}`;
          const patch = (v: Partial<typeof t>) => updateList('typeParams', (l) => patchItem(l, t.id, v));
          return (
            <div key={t.id} className={s.pairLineActions}>
              <input
                className={`${s.input} ${s.mono}`}
                value={t.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={ph.typeParam}
                aria-label={`Nom du ${label}`}
                {...code}
              />
              <input
                className={s.input}
                value={t.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Description du type"
                aria-label={`Description du ${label}`}
              />
              <RowActions label={label} onRemove={() => updateList('typeParams', (l) => removeItem(l, t.id))} />
            </div>
          );
        })}
      </Section>

      <Section title="Exemple" defaultOpen={Boolean(doc.example)}>
        <textarea
          className={`${s.textarea} ${s.mono}`}
          rows={3}
          value={doc.example}
          onChange={(e) => set('example', e.target.value)}
          placeholder={ph.example}
          aria-label="Code d'exemple"
          spellCheck={false}
        />
      </Section>
    </form>
  );
}
