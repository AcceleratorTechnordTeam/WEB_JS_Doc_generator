import type {
  EndpointDoc,
  EndpointPayload,
  EndpointType,
  FunctionEntry,
  HttpMethod,
  Issue,
  MessageDoc,
  MessageType,
  ObjectEntry,
  ProjectDoc,
  SavedProject,
} from '../types';
import { generateComment } from './comment';
import { emptyDoc, emptyObject, LANG_LABEL, reviveDoc, reviveObject } from './defaults';
import { generateCSharpClass, generateTsTypeBody } from './objectCode';
import { uid } from './text';
import { validate, validateObject } from './validate';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const emptyProject = (): ProjectDoc => ({ title: '', endpoints: [], objects: [], functions: [], messages: [] });

/* ——— Identifiants métier auto-incrémentés (modifiables ensuite) ——— */

const pad = (n: number, size: number) => String(n).padStart(size, '0');

/**
 * Premier identifiant libre selon le format donné : 001, Object 01, FF01…
 * La recherche part de `start` (par défaut : nombre d'éléments + 1).
 */
function nextId(used: string[], format: (n: number) => string, start = used.length + 1): string {
  const taken = new Set(used.map((u) => u.trim()));
  let n = start;
  while (taken.has(format(n))) n++;
  return format(n);
}

export const ENDPOINT_TYPES: { value: EndpointType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'non-standard', label: 'Non standard' },
];

/** « standard », « Non standard », « nonStandard »… → type connu, ou null. */
export function parseEndpointType(raw: string): EndpointType | null {
  const t = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (t === 'standard' || t === 'standar') return 'standard';
  if (t === 'nonstandard' || t === 'nonstandar') return 'non-standard';
  return null;
}

export const PAYLOAD_KEYS: (keyof EndpointPayload)[] = ['assembly', 'action', 'configurations', 'applyAll'];

export const emptyPayload = (): EndpointPayload => ({ assembly: '', action: '', configurations: '', applyAll: '' });

export const newEndpoint = (list: EndpointDoc[]): EndpointDoc => ({
  id: uid(),
  requestId: nextId(
    list.map((e) => e.requestId),
    (n) => pad(n, 3),
  ),
  name: '',
  type: 'standard',
  method: 'GET',
  url: '',
  payloadText: '',
  payload: emptyPayload(),
});

export const MESSAGE_TYPES: { value: MessageType; label: string; legacyPrefix: string }[] = [
  { value: 'error', label: 'Erreur', legacyPrefix: 'Error message' },
  { value: 'success', label: 'Succès', legacyPrefix: 'Success message' },
  { value: 'warning', label: 'Warning', legacyPrefix: 'Warning message' },
  { value: 'info', label: 'Info', legacyPrefix: 'Info message' },
];

/** Identifiants « Error message 01 »… générés par une version précédente. */
const LEGACY_MESSAGE_ID = /^(Error|Success|Warning|Info) message \d+$/;

/** « Message 01 », « Message 02 »… : numérotation commune, indépendante du type, sans tenir compte des identifiants personnalisés. */
const nextMessageId = (list: MessageDoc[]) => {
  const auto = list.filter((m) => /^Message \d+$/.test(m.messageId.trim()));
  return nextId(
    list.map((m) => m.messageId),
    (n) => `Message ${pad(n, 2)}`,
    auto.length + 1,
  );
};

export const newMessage = (list: MessageDoc[], type: MessageType = 'error'): MessageDoc => ({
  id: uid(),
  messageId: nextMessageId(list),
  type,
  message: '',
});

/** Type d'un message stocké par une version antérieure : déduit de son ancien identifiant. */
function reviveMessageType(raw: unknown, messageId: string): MessageType {
  if (MESSAGE_TYPES.some((t) => t.value === raw)) return raw as MessageType;
  return MESSAGE_TYPES.find((t) => messageId.startsWith(t.legacyPrefix))?.value ?? 'error';
}

/** Remplace les anciens identifiants « Error message 01 »… par « Message NN ». */
function renameLegacyMessageIds(messages: MessageDoc[]): MessageDoc[] {
  const out: MessageDoc[] = messages.filter((m) => !LEGACY_MESSAGE_ID.test(m.messageId.trim()));
  return messages.map((m) => {
    if (!LEGACY_MESSAGE_ID.test(m.messageId.trim())) return m;
    const renamed = { ...m, messageId: nextMessageId(out) };
    out.push(renamed);
    return renamed;
  });
}

export const newObjectEntry = (list: ObjectEntry[]): ObjectEntry => ({
  id: uid(),
  objectId: nextId(
    list.map((o) => o.objectId),
    (n) => `Object ${pad(n, 2)}`,
  ),
  doc: emptyObject(),
});

export const newFunctionEntry = (list: FunctionEntry[]): FunctionEntry => ({
  id: uid(),
  functionId: nextId(
    list.map((f) => f.functionId),
    (n) => `FF${pad(n, 2)}`,
  ),
  doc: emptyDoc(),
});

/* ——— Duplication ——— */

/** Insère `item` juste après l'élément `afterId`. */
const insertAfter = <T extends { id: string }>(list: T[], afterId: string, item: T): T[] => {
  const i = list.findIndex((x) => x.id === afterId);
  return i < 0 ? [...list, item] : [...list.slice(0, i + 1), item, ...list.slice(i + 1)];
};

/** Copie d'un objet (nouveaux identifiants internes, nouvel ID métier), placée juste après l'original. */
export function duplicateObject(list: ObjectEntry[], id: string): { list: ObjectEntry[]; copyId: string | null } {
  const src = list.find((o) => o.id === id);
  if (!src) return { list, copyId: null };
  const copy: ObjectEntry = {
    id: uid(),
    objectId: newObjectEntry(list).objectId,
    doc: { ...src.doc, properties: src.doc.properties.map((p) => ({ ...p, id: uid() })) },
  };
  return { list: insertAfter(list, id, copy), copyId: copy.id };
}

/** Copie d'une fonction, placée juste après l'originale. */
export function duplicateFunction(list: FunctionEntry[], id: string): { list: FunctionEntry[]; copyId: string | null } {
  const src = list.find((f) => f.id === id);
  if (!src) return { list, copyId: null };
  const d = src.doc;
  const copy: FunctionEntry = {
    id: uid(),
    functionId: newFunctionEntry(list).functionId,
    doc: {
      ...d,
      params: d.params.map((p) => ({ ...p, id: uid() })),
      typeParams: d.typeParams.map((t) => ({ ...t, id: uid() })),
      throws: d.throws.map((t) => ({ ...t, id: uid() })),
    },
  };
  return { list: insertAfter(list, id, copy), copyId: copy.id };
}

/* ——— Relecture des données stockées ——— */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);

const revivePayload = (v: unknown): EndpointPayload => {
  const raw = isRecord(v) ? v : {};
  return { assembly: str(raw.assembly), action: str(raw.action), configurations: str(raw.configurations), applyAll: str(raw.applyAll) };
};

export function reviveProject(raw: unknown): ProjectDoc {
  if (!isRecord(raw)) return emptyProject();
  return {
    title: str(raw.title),
    endpoints: list(raw.endpoints).map((e) => ({
      id: str(e.id) || uid(),
      requestId: str(e.requestId),
      name: str(e.name),
      // Avant ce champ, seul le payload détaillé existait : non standard par défaut.
      type: parseEndpointType(str(e.type)) ?? 'non-standard',
      method: HTTP_METHODS.includes(e.method as HttpMethod) ? (e.method as HttpMethod) : 'GET',
      url: str(e.url),
      payloadText: str(e.payloadText),
      payload: revivePayload(e.payload),
    })),
    objects: list(raw.objects).map((o) => ({ id: str(o.id) || uid(), objectId: str(o.objectId), doc: reviveObject(o.doc) })),
    functions: list(raw.functions).map((f) => ({
      id: str(f.id) || uid(),
      functionId: str(f.functionId),
      doc: reviveDoc(f.doc),
    })),
    messages: renameLegacyMessageIds(
      list(raw.messages).map((m) => ({
        id: str(m.id) || uid(),
        messageId: str(m.messageId),
        type: reviveMessageType(m.type, str(m.messageId)),
        message: str(m.message),
      })),
    ),
  };
}

export const reviveSavedProjects = (raw: unknown): SavedProject[] =>
  list(raw).map((r) => ({
    id: str(r.id) || uid(),
    savedAt: Number(r.savedAt) || Date.now(),
    project: reviveProject(r.project),
  }));

/**
 * Premier lancement de la version « projet » : on récupère les brouillons et
 * l'historique de l'ancienne version (fonctions et objets) dans le projet.
 */
export function migrateLegacy(): ProjectDoc {
  const project = emptyProject();
  const read = (key: string): unknown => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const fnSeen = new Set<string>();
  const objSeen = new Set<string>();
  const addFunction = (raw: unknown) => {
    const doc = reviveDoc(raw);
    const key = `${doc.lang}:${doc.name.trim()}`;
    if (!doc.name.trim() || fnSeen.has(key)) return;
    fnSeen.add(key);
    project.functions.push({ ...newFunctionEntry(project.functions), doc });
  };
  const addObject = (raw: unknown) => {
    const doc = reviveObject(raw);
    const key = `${doc.lang}:${doc.name.trim()}`;
    if (!doc.name.trim() || objSeen.has(key)) return;
    objSeen.add(key);
    project.objects.push({ ...newObjectEntry(project.objects), doc });
  };

  addFunction(read('jsdocgen:draft'));
  addObject(read('jsdocgen:object-draft'));
  for (const entry of list(read('jsdocgen:history'))) {
    if (entry.mode === 'object') addObject(entry.doc);
    else addFunction(entry.doc);
  }
  return project;
}

/* ——— Export JSON ——— */

const objectType = (o: ObjectEntry) =>
  o.doc.lang === 'ts' ? generateTsTypeBody(o.doc) : generateCSharpClass(o.doc).trimEnd();

/** JSON final : tableau de blocs à une clé, dans l'ordre titre → endpoints → objets → fonctions → messages. */
export function generateProjectJson(p: ProjectDoc): string {
  const data = [
    { title: p.title.trim() },
    {
      endpoint: p.endpoints.map((e) => ({
        requestId: e.requestId.trim(),
        endpointName: e.name.trim(),
        type: e.type,
        method: e.method,
        endpoint: e.url.trim(),
        payload:
          e.type === 'standard'
            ? e.payloadText.trim()
            : {
                assembly: e.payload.assembly.trim(),
                action: e.payload.action.trim(),
                configurations: e.payload.configurations.trim(),
                applyAll: e.payload.applyAll.trim(),
              },
      })),
    },
    {
      object: p.objects.map((o) => ({
        objectId: o.objectId.trim(),
        objectName: o.doc.name.trim(),
        description: o.doc.description.trim(),
        objectType: objectType(o),
      })),
    },
    {
      functions: p.functions.map((f) => ({
        functionId: f.functionId.trim(),
        functionName: f.doc.name.trim() ? `${f.doc.name.trim()}()` : '',
        language: LANG_LABEL[f.doc.lang],
        doc: generateComment(f.doc).trimEnd(),
      })),
    },
    {
      messages: p.messages.map((m) => ({ messageId: m.messageId.trim(), type: m.type, message: m.message.trim() })),
    },
  ];
  return JSON.stringify(data, null, 4) + '\n';
}

/* ——— Validation globale ——— */

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const v of values.map((x) => x.trim()).filter(Boolean)) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

export function validateProject(p: ProjectDoc): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });

  if (!p.title.trim()) error('Le titre général est obligatoire.');

  p.endpoints.forEach((e, i) => {
    const label = e.requestId.trim() || `n°${i + 1}`;
    if (!e.requestId.trim()) error(`L'endpoint n°${i + 1} n'a pas d'identifiant.`);
    if (!e.name.trim()) warn(`L'endpoint ${label} n'a pas de nom.`);
    if (!e.url.trim()) error(`L'endpoint ${label} n'a pas d'URL.`);
  });
  p.messages.forEach((m, i) => {
    const label = m.messageId.trim() || `n°${i + 1}`;
    if (!m.messageId.trim()) error(`Le message n°${i + 1} n'a pas d'identifiant.`);
    if (!m.message.trim()) error(`Le message ${label} est vide.`);
  });

  // Les erreurs détaillées d'un objet / d'une fonction sont dans son onglet : ici, un résumé.
  p.objects.forEach((o, i) => {
    const n = validateObject(o.doc).filter((x) => x.level === 'error').length;
    if (n) error(`Objet ${o.objectId.trim() || `n°${i + 1}`} : ${n} erreur${n > 1 ? 's' : ''}.`);
  });
  p.functions.forEach((f, i) => {
    const n = validate(f.doc).filter((x) => x.level === 'error').length;
    if (n) error(`Fonction ${f.functionId.trim() || `n°${i + 1}`} : ${n} erreur${n > 1 ? 's' : ''}.`);
  });

  for (const [label, values] of [
    ['endpoint', p.endpoints.map((e) => e.requestId)],
    ['objet', p.objects.map((o) => o.objectId)],
    ['fonction', p.functions.map((f) => f.functionId)],
    ['message', p.messages.map((m) => m.messageId)],
  ] as const) {
    for (const d of duplicates(values)) error(`Identifiant de ${label} en double : « ${d} ».`);
  }

  const total = p.endpoints.length + p.objects.length + p.functions.length + p.messages.length;
  if (p.title.trim() && total === 0) warn('Le projet ne contient encore aucun élément.');

  return issues;
}
