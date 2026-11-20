import type { Dispatch, SetStateAction } from 'react';
import { generateComment } from '../lib/comment';
import { LANG_LABEL } from '../lib/defaults';
import { moveItem, patchItem, removeItem } from '../lib/list';
import { generateObjectCode } from '../lib/objectCode';
import { HTTP_METHODS, newEndpoint, newFunctionEntry, newMessage, newObjectEntry } from '../lib/project';
import { validate, validateObject } from '../lib/validate';
import type {
  EndpointDoc,
  FunctionDoc,
  FunctionEntry,
  HttpMethod,
  Lang,
  MessageDoc,
  ObjectDoc,
  ObjectEntry,
} from '../types';
import { DocForm } from './DocForm';
import { RowActions, Section } from './Field';
import f from './Form.module.css';
import { ObjectForm } from './ObjectForm';
import { OutputPanel } from './OutputPanel';
import w from './Workspace.module.css';

type ListUpdater<T> = (fn: (list: T[]) => T[]) => void;

const code = { spellCheck: false, autoComplete: 'off' } as const;
const METHOD_CLASS: Record<HttpMethod, string> = {
  GET: w.get,
  POST: w.post,
  PUT: w.put,
  PATCH: w.patch,
  DELETE: w.delete,
};

/* ——— Endpoints ——— */

export function EndpointsTab({ endpoints, update }: { endpoints: EndpointDoc[]; update: ListUpdater<EndpointDoc> }) {
  return (
    <div className={f.form}>
      <Section
        title="Endpoints"
        count={endpoints.length}
        onAdd={() => update((l) => [...l, newEndpoint(l)])}
        addLabel="Ajouter un endpoint"
      >
        {endpoints.length === 0 && <p className={f.empty}>Aucun endpoint.</p>}
        {endpoints.map((e, i) => {
          const label = `l'endpoint ${e.requestId || i + 1}`;
          const patch = (v: Partial<EndpointDoc>) => update((l) => patchItem(l, e.id, v));
          return (
            <div key={e.id} className={w.endpointLine}>
              <input
                className={`${f.input} ${f.mono}`}
                value={e.requestId}
                onChange={(ev) => patch({ requestId: ev.target.value })}
                placeholder="001"
                aria-label={`Identifiant de ${label}`}
                {...code}
              />
              <select
                className={`${w.select} ${METHOD_CLASS[e.method]}`}
                value={e.method}
                onChange={(ev) => patch({ method: ev.target.value as HttpMethod })}
                aria-label={`Méthode HTTP de ${label}`}
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className={`${f.input} ${f.mono}`}
                value={e.url}
                onChange={(ev) => patch({ url: ev.target.value })}
                placeholder="/api/activities/{id}"
                aria-label={`URL de ${label}`}
                {...code}
              />
              <RowActions
                label={label}
                onRemove={() => update((l) => removeItem(l, e.id))}
                onUp={i > 0 ? () => update((l) => moveItem(l, e.id, -1)) : null}
                onDown={i < endpoints.length - 1 ? () => update((l) => moveItem(l, e.id, 1)) : null}
              />
            </div>
          );
        })}
      </Section>
    </div>
  );
}

/* ——— Messages ——— */

export function MessagesTab({ messages, update }: { messages: MessageDoc[]; update: ListUpdater<MessageDoc> }) {
  return (
    <div className={f.form}>
      <Section
        title="Messages"
        count={messages.length}
        onAdd={() => update((l) => [...l, newMessage(l)])}
        addLabel="Ajouter un message"
      >
        {messages.length === 0 && <p className={f.empty}>Aucun message.</p>}
        {messages.map((m, i) => {
          const label = `le message ${m.messageId || i + 1}`;
          const patch = (v: Partial<MessageDoc>) => update((l) => patchItem(l, m.id, v));
          return (
            <div key={m.id} className={w.messageLine}>
              <input
                className={`${f.input} ${f.mono}`}
                value={m.messageId}
                onChange={(ev) => patch({ messageId: ev.target.value })}
                placeholder="Error message 01"
                aria-label={`Identifiant pour ${label}`}
                {...code}
              />
              <input
                className={f.input}
                value={m.message}
                onChange={(ev) => patch({ message: ev.target.value })}
                placeholder="Une erreur est survenue, veuillez réessayer."
                aria-label={`Texte pour ${label}`}
              />
              <RowActions
                label={label}
                onRemove={() => update((l) => removeItem(l, m.id))}
                onUp={i > 0 ? () => update((l) => moveItem(l, m.id, -1)) : null}
                onDown={i < messages.length - 1 ? () => update((l) => moveItem(l, m.id, 1)) : null}
              />
            </div>
          );
        })}
      </Section>
    </div>
  );
}

/* ——— Briques communes aux objets et fonctions ——— */

interface EntryChip {
  id: string;
  code: string;
  name: string;
}

function EntryList({
  items,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  addLabel,
}: {
  items: EntryChip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
}) {
  return (
    <div className={w.entries} role="listbox" aria-label="Éléments">
      {items.map((it) => (
        <div
          key={it.id}
          role="option"
          aria-selected={it.id === selectedId}
          tabIndex={0}
          className={it.id === selectedId ? w.entryActive : w.entry}
          onClick={() => onSelect(it.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(it.id);
            }
          }}
        >
          <span className={w.entryId}>{it.code || '—'}</span>
          <span className={w.entryName}>{it.name || 'sans nom'}</span>
          <button
            type="button"
            className={w.entryRemove}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(it.id);
            }}
            aria-label={`Supprimer ${it.code || it.name || 'cet élément'}`}
            title="Supprimer"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={w.addEntry} onClick={onAdd}>
        + {addLabel}
      </button>
    </div>
  );
}

function LangToggle({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className={w.seg} role="radiogroup" aria-label="Langage">
      {(['ts', 'csharp'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          className={value === l ? w.segActive : w.segItem}
          onClick={() => onChange(l)}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

/** Adapte un setter de liste en setter du `doc` d'une entrée donnée. */
function docSetter<D, E extends { id: string; doc: D }>(update: ListUpdater<E>, id: string): Dispatch<SetStateAction<D>> {
  return (action) =>
    update((l) =>
      l.map((e) => (e.id === id ? { ...e, doc: typeof action === 'function' ? (action as (d: D) => D)(e.doc) : action } : e)),
    );
}

const confirmRemove = (what: string) => window.confirm(`Supprimer ${what} ? Cette action est définitive.`);

/* ——— Objets ——— */

export function ObjectsTab({
  objects,
  update,
  selectedId,
  onSelect,
}: {
  objects: ObjectEntry[];
  update: ListUpdater<ObjectEntry>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selected = objects.find((o) => o.id === selectedId) ?? objects[0] ?? null;

  const add = () => {
    const entry = newObjectEntry(objects);
    update((l) => [...l, entry]);
    onSelect(entry.id);
  };
  const remove = (id: string) => {
    const o = objects.find((x) => x.id === id);
    if (!o || !confirmRemove(`l'objet ${o.objectId || o.doc.name || ''}`.trim())) return;
    update((l) => removeItem(l, id));
    if (selected?.id === id) onSelect(null);
  };

  return (
    <>
      <EntryList
        items={objects.map((o) => ({ id: o.id, code: o.objectId, name: o.doc.name }))}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        onAdd={add}
        onRemove={remove}
        addLabel="Objet"
      />
      {selected ? (
        <ObjectEditor key={selected.id} entry={selected} update={update} />
      ) : (
        <p className={w.emptyState}>Aucun objet. Ajoute-en un pour décrire son type.</p>
      )}
    </>
  );
}

function ObjectEditor({ entry, update }: { entry: ObjectEntry; update: ListUpdater<ObjectEntry> }) {
  const setDoc = docSetter<ObjectDoc, ObjectEntry>(update, entry.id);
  const isTs = entry.doc.lang === 'ts';
  return (
    <div className={w.editor}>
      <div className={w.editorHead}>
        <label className={w.idField}>
          ID
          <input
            className={w.idInput}
            value={entry.objectId}
            onChange={(e) => update((l) => patchItem(l, entry.id, { objectId: e.target.value }))}
            {...code}
          />
        </label>
        <LangToggle value={entry.doc.lang} onChange={(lang) => setDoc((d) => ({ ...d, lang }))} />
      </div>
      <ObjectForm doc={entry.doc} setDoc={setDoc} />
      <div className={w.preview}>
        <p className={w.previewTitle}>{isTs ? 'Type TypeScript' : 'Classe C#'}</p>
        <OutputPanel
          output={generateObjectCode(entry.doc)}
          issues={validateObject(entry.doc)}
          name={entry.doc.name}
          extension={isTs ? 'ts' : 'cs'}
          what={isTs ? 'le type' : 'la classe'}
        />
      </div>
    </div>
  );
}

/* ——— Fonctions ——— */

export function FunctionsTab({
  functions,
  update,
  selectedId,
  onSelect,
}: {
  functions: FunctionEntry[];
  update: ListUpdater<FunctionEntry>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selected = functions.find((x) => x.id === selectedId) ?? functions[0] ?? null;

  const add = () => {
    const entry = newFunctionEntry(functions);
    update((l) => [...l, entry]);
    onSelect(entry.id);
  };
  const remove = (id: string) => {
    const fn = functions.find((x) => x.id === id);
    if (!fn || !confirmRemove(`la fonction ${fn.functionId || fn.doc.name || ''}`.trim())) return;
    update((l) => removeItem(l, id));
    if (selected?.id === id) onSelect(null);
  };

  return (
    <>
      <EntryList
        items={functions.map((x) => ({ id: x.id, code: x.functionId, name: x.doc.name }))}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        onAdd={add}
        onRemove={remove}
        addLabel="Fonction"
      />
      {selected ? (
        <FunctionEditor key={selected.id} entry={selected} update={update} />
      ) : (
        <p className={w.emptyState}>Aucune fonction. Ajoute-en une pour générer son TSDoc.</p>
      )}
    </>
  );
}

function FunctionEditor({ entry, update }: { entry: FunctionEntry; update: ListUpdater<FunctionEntry> }) {
  const setDoc = docSetter<FunctionDoc, FunctionEntry>(update, entry.id);
  const isTs = entry.doc.lang === 'ts';
  return (
    <div className={w.editor}>
      <div className={w.editorHead}>
        <label className={w.idField}>
          ID
          <input
            className={w.idInput}
            value={entry.functionId}
            onChange={(e) => update((l) => patchItem(l, entry.id, { functionId: e.target.value }))}
            {...code}
          />
        </label>
        <LangToggle value={entry.doc.lang} onChange={(lang) => setDoc((d) => ({ ...d, lang }))} />
      </div>
      <DocForm doc={entry.doc} setDoc={setDoc} />
      <div className={w.preview}>
        <p className={w.previewTitle}>{isTs ? 'TSDoc' : 'Commentaires XML'}</p>
        <OutputPanel
          output={generateComment(entry.doc)}
          issues={validate(entry.doc)}
          name={entry.doc.name}
          extension={isTs ? 'ts' : 'cs'}
          what="le commentaire"
        />
      </div>
    </div>
  );
}
