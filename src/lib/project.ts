import type {
  EndpointDoc,
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

/** Premier identifiant libre selon le format donné : 001, Object 01, FF01… */
function nextId(used: string[], format: (n: number) => string): string {
  const taken = new Set(used.map((u) => u.trim()));
  let n = used.length + 1;
  while (taken.has(format(n))) n++;
  return format(n);
}

export const newEndpoint = (list: EndpointDoc[]): EndpointDoc => ({
  id: uid(),
  requestId: nextId(
    list.map((e) => e.requestId),
    (n) => pad(n, 3),
  ),
  method: 'GET',
  url: '',
});

export const MESSAGE_TYPES: { value: MessageType; label: string; prefix: string }[] = [
  { value: 'error', label: 'Erreur', prefix: 'Error message' },
  { value: 'success', label: 'Succès', prefix: 'Success message' },
  { value: 'warning', label: 'Warning', prefix: 'Warning message' },
  { value: 'info', label: 'Info', prefix: 'Info message' },
];

const prefixOf = (type: MessageType) => MESSAGE_TYPES.find((t) => t.value === type)!.prefix;

/** « Error message 01 », « Success message 02 »… : identifiant reconnu comme généré automatiquement. */
const AUTO_MESSAGE_ID = /^(Error|Success|Warning|Info) message \d+$/;

/** Prochain identifiant libre pour un type : numérotation séparée par type. */
function nextMessageId(list: MessageDoc[], type: MessageType): string {
  const prefix = prefixOf(type);
  const sameType = list.filter((m) => m.messageId.startsWith(prefix));
  return nextId(
    sameType.map((m) => m.messageId),
    (n) => `${prefix} ${pad(n, 2)}`,
  );
}

export const newMessage = (list: MessageDoc[], type: MessageType = 'error'): MessageDoc => ({
  id: uid(),
  messageId: nextMessageId(list, type),
  type,
  message: '',
});

/**
 * Change le type d'un message. Si son identifiant est encore celui généré
 * automatiquement, il est renommé avec le préfixe du nouveau type.
 */
export function changeMessageType(list: MessageDoc[], id: string, type: MessageType): MessageDoc[] {
  const others = list.filter((m) => m.id !== id);
  return list.map((m) => {
    if (m.id !== id) return m;
    const messageId = AUTO_MESSAGE_ID.test(m.messageId.trim()) ? nextMessageId(others, type) : m.messageId;
    return { ...m, type, messageId };
  });
}

/** Type d'un message stocké par une version antérieure : déduit de son identifiant. */
function reviveMessageType(raw: unknown, messageId: string): MessageType {
  if (MESSAGE_TYPES.some((t) => t.value === raw)) return raw as MessageType;
  return MESSAGE_TYPES.find((t) => messageId.startsWith(t.prefix))?.value ?? 'error';
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

/* ——— Relecture des données stockées ——— */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);

export function reviveProject(raw: unknown): ProjectDoc {
  if (!isRecord(raw)) return emptyProject();
  return {
    title: str(raw.title),
    endpoints: list(raw.endpoints).map((e) => ({
      id: str(e.id) || uid(),
      requestId: str(e.requestId),
      method: HTTP_METHODS.includes(e.method as HttpMethod) ? (e.method as HttpMethod) : 'GET',
      url: str(e.url),
    })),
    objects: list(raw.objects).map((o) => ({ id: str(o.id) || uid(), objectId: str(o.objectId), doc: reviveObject(o.doc) })),
    functions: list(raw.functions).map((f) => ({
      id: str(f.id) || uid(),
      functionId: str(f.functionId),
      doc: reviveDoc(f.doc),
    })),
    messages: list(raw.messages).map((m) => ({
      id: str(m.id) || uid(),
      messageId: str(m.messageId),
      type: reviveMessageType(m.type, str(m.messageId)),
      message: str(m.message),
    })),
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

/**
 * JSON final : tableau de blocs à une clé, dans l'ordre titre → endpoints → objets → fonctions → messages.
 * Les clés `onjectName` et `mesages` reprennent volontairement l'orthographe du format de référence.
 */
export function generateProjectJson(p: ProjectDoc): string {
  const data = [
    { title: p.title.trim() },
    {
      endpoint: p.endpoints.map((e) => ({ requestId: e.requestId.trim(), type: e.method, endpoint: e.url.trim() })),
    },
    {
      object: p.objects.map((o) => ({
        objectId: o.objectId.trim(),
        onjectName: o.doc.name.trim(), // orthographe imposée par le format attendu
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
      mesages: p.messages.map((m) => ({ messageId: m.messageId.trim(), type: m.type, message: m.message.trim() })), // idem
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
