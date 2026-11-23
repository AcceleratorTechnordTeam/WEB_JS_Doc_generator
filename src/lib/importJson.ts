/**
 * Relit un JSON exporté (ou écrit à la main dans le même format) et reconstruit
 * le projet : les `objectType` et les `doc` sont analysés pour remplir les formulaires.
 */
import type { FunctionDoc, Lang, ObjectDoc, ParamDoc, ProjectDoc, PropertyDoc } from '../types';
import { emptyDoc, emptyObject, newParam, newProperty, newThrows, newTypeParam } from './defaults';
import { HTTP_METHODS, PAYLOAD_KEYS, reviveProject } from './project';
import { toLines, trimBlock, uid } from './text';

export interface ImportResult {
  project: ProjectDoc;
  /** Ce qui n'a pas pu être relu à l'identique. */
  warnings: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : String(v));

/** Si `s` commence par `{`, renvoie le contenu jusqu'à l'accolade correspondante et le reste. */
function takeBraced(s: string): { inner: string | null; rest: string } {
  const t = s.trimStart();
  if (!t.startsWith('{')) return { inner: null, rest: t };
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '{') depth++;
    else if (t[i] === '}' && --depth === 0) return { inner: t.slice(1, i), rest: t.slice(i + 1).trimStart() };
  }
  return { inner: null, rest: t };
}

/** Lignes d'un texte, espaces de fin retirés, sans lignes vides au début ni à la fin. */
const cleanText = (lines: string[]) => trimBlock(lines.map((l) => l.trimEnd()).join('\n'));

/* ——— Objets ——— */

/** `{/** doc *\/\nnom?: type;}` ou `export type X = {…}` / `interface X {…}`. */
function parseTsType(src: string): { doc: ObjectDoc; warning?: string } {
  const doc = emptyObject('ts');
  const open = src.indexOf('{');
  const close = src.lastIndexOf('}');
  if (open < 0 || close < open) return { doc, warning: 'objectType illisible, propriétés non importées.' };

  doc.name = src.slice(0, open).match(/(?:type|interface)\s+([A-Za-z_$][\w$]*)/)?.[1] ?? '';
  const body = src.slice(open + 1, close);

  const re =
    /(?:\/\*\*([\s\S]*?)\*\/\s*)?(readonly\s+)?('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*)\s*(\?)?\s*:\s*([^;]+?)\s*;/g;
  let leftover = body;
  for (const m of body.matchAll(re)) {
    leftover = leftover.replace(m[0], '');
    const comment = (m[1] ?? '').split('\n').map((l) => l.replace(/^\s*\*\s?/, ''));
    const defLine = comment.findIndex((l) => l.trim().startsWith('@default'));
    const defaultValue = defLine >= 0 ? comment[defLine].trim().replace(/^@default\s*/, '') : '';
    if (defLine >= 0) comment.splice(defLine, 1);

    const rawKey = m[3];
    const name = /^['"]/.test(rawKey) ? rawKey.slice(1, -1).replace(/\\(.)/g, '$1') : rawKey;
    const prop: PropertyDoc = {
      ...newProperty(),
      name,
      type: m[5].trim(),
      description: cleanText(comment),
      optional: Boolean(m[4]) && !defaultValue,
      readonly: Boolean(m[2]),
      defaultValue,
    };
    doc.properties.push(prop);
  }

  const rest = leftover.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return { doc, warning: rest ? `une partie de objectType n'a pas pu être lue : « ${rest.slice(0, 40)}… »` : undefined };
}

const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Texte d'un commentaire `/// <summary>…</summary>`. */
function xmlSummary(docLines: string[]): string {
  const xml = docLines.map((l) => l.replace(/^\s*\/\/\/\s?/, '')).join('\n');
  const inner = xml.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? '';
  return unescapeXml(cleanText(toLines(inner).map((l) => l.trim())));
}

/** Classe C# générée par l'outil : `public Type Nom { get; set; } = défaut;`. */
function parseCSharpClass(src: string): { doc: ObjectDoc; warning?: string } {
  const doc = emptyObject('csharp');
  let pending: string[] = [];
  let unread = 0;

  for (const line of toLines(src)) {
    const t = line.trim();
    if (!t || t === '{' || t === '}') continue;
    if (t.startsWith('///')) {
      pending.push(t);
      continue;
    }
    const cls = t.match(/\bclass\s+(\w+)/);
    if (cls) {
      doc.name = cls[1];
      doc.description = xmlSummary(pending);
    } else {
      const m = t.match(/^public\s+(?:required\s+)?(.+?)\s+(@?\w+)\s*\{\s*get;\s*(?:(set|init);\s*)?\}\s*(?:=\s*(.+?);)?$/);
      if (m) {
        const defaultValue = (m[4] ?? '').trim();
        let type = m[1].trim();
        const optional = type.endsWith('?') && !defaultValue;
        if (optional) type = type.slice(0, -1);
        doc.properties.push({
          ...newProperty(),
          name: m[2],
          type,
          description: xmlSummary(pending),
          optional,
          readonly: m[3] === 'init',
          defaultValue,
        });
      } else unread++;
    }
    pending = [];
  }
  return { doc, warning: unread ? `${unread} ligne(s) de la classe C# non reconnue(s).` : undefined };
}

function parseObjectType(src: string): { doc: ObjectDoc; warning?: string } {
  const t = src.trim();
  if (!t) return { doc: emptyObject() };
  if (/\bclass\s+\w+/.test(t)) return parseCSharpClass(t);
  return parseTsType(t);
}

/* ——— Fonctions ——— */

/** « Description. Par défaut : `x`. » → { description, defaultValue } (forme écrite par le générateur TSDoc). */
function splitTsDefault(text: string): { description: string; defaultValue: string } {
  const m = text.match(/^([\s\S]*?)\s*Par défaut : `([^`]*)`\.?\s*$/);
  return m ? { description: m[1].trim(), defaultValue: m[2] } : { description: text.trim(), defaultValue: '' };
}

function parseTsDoc(src: string): { doc: FunctionDoc; warning?: string } {
  const doc = emptyDoc('ts');
  const inner = src.trim().replace(/^\/\*\*/, '').replace(/\*\/$/, '');
  const lines = toLines(inner).map((l) => l.replace(/^\s*\*\s?/, '').trimEnd());

  // Découpage en blocs : description, puis un bloc par tag (les blocs de code ``` restent intacts).
  const blocks: { tag: string; lines: string[] }[] = [{ tag: '', lines: [] }];
  let inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) inFence = !inFence;
    else if (!inFence && /^@\w+/.test(t)) {
      const m = t.match(/^@(\w+)\s*([\s\S]*)$/)!;
      blocks.push({ tag: m[1], lines: [m[2]] });
      continue;
    }
    blocks[blocks.length - 1].lines.push(line);
  }

  const ignored: string[] = [];
  for (const { tag, lines: bl } of blocks) {
    const text = cleanText(bl);
    switch (tag) {
      case '':
        doc.summary = text;
        break;
      case 'remarks':
        doc.remarks = text;
        break;
      case 'param': {
        const { inner: type, rest } = takeBraced(text);
        const m = rest.match(/^(\[[^\]]*\]|[^\s]+)\s*(?:-\s*)?([\s\S]*)$/);
        if (!m) break;
        let name = m[1];
        let { description, defaultValue } = splitTsDefault(m[2]);
        let optional = false;
        if (name.startsWith('[')) {
          // Forme JSDoc [nom] ou [nom=défaut]
          optional = true;
          const [n, d] = name.slice(1, -1).split('=');
          name = n;
          if (d !== undefined && !defaultValue) defaultValue = d;
        }
        const param: ParamDoc = { ...newParam(), name, type: (type ?? '').trim(), description, defaultValue, optional };
        doc.params.push(param);
        break;
      }
      case 'returns':
      case 'return': {
        const { inner: type, rest } = takeBraced(text);
        doc.returnType = (type ?? '').trim();
        doc.returnDescription = rest.trim();
        break;
      }
      case 'throws':
      case 'exception': {
        const { inner: type, rest } = takeBraced(text);
        doc.throws.push({ ...newThrows(), type: (type ?? '').replace(/^@link\s+/, '').trim(), description: rest.trim() });
        break;
      }
      case 'typeParam':
      case 'template': {
        const m = text.match(/^(\w+)\s*(?:-\s*)?([\s\S]*)$/);
        if (m) doc.typeParams.push({ ...newTypeParam(), name: m[1], description: m[2].trim() });
        break;
      }
      case 'example':
        doc.example = trimBlock(
          bl
            .filter((l) => !l.trim().startsWith('```'))
            .join('\n'),
        );
        break;
      default:
        ignored.push(`@${tag}`);
    }
  }
  return { doc, warning: ignored.length ? `tag(s) ignoré(s) : ${[...new Set(ignored)].join(', ')}.` : undefined };
}

/** Commentaires XML `///` générés pour le C#. */
function parseCSharpDoc(src: string): { doc: FunctionDoc; warning?: string } {
  const doc = emptyDoc('csharp');
  const xml = toLines(src)
    .map((l) => l.replace(/^\s*\/\/\/\s?/, ''))
    .join('\n');
  const root = new DOMParser().parseFromString(`<root>${xml}</root>`, 'application/xml');
  if (root.querySelector('parsererror')) return { doc, warning: 'commentaire XML illisible, non importé.' };

  const text = (el: Element | null | undefined) => cleanText(toLines(el?.textContent ?? '').map((l) => l.trim()));
  const fromCref = (cref: string) => cref.replace(/\{/g, '<').replace(/\}/g, '>');

  doc.summary = text(root.querySelector('summary'));
  root.querySelectorAll('typeparam').forEach((el) =>
    doc.typeParams.push({ ...newTypeParam(), name: el.getAttribute('name') ?? '', description: text(el) }),
  );
  root.querySelectorAll('param').forEach((el) => {
    let description = text(el);
    let optional = false;
    let defaultValue = '';
    const m = description.match(/^([\s\S]*?)\s*Optionnel(?:, valeur par défaut : ([\s\S]+?))?\.\s*$/);
    if (m) {
      optional = !m[2];
      defaultValue = m[2] ?? '';
      description = m[1].trim();
    }
    doc.params.push({ ...newParam(), name: el.getAttribute('name') ?? '', description, optional, defaultValue });
  });
  doc.returnDescription = text(root.querySelector('returns'));
  root.querySelectorAll('exception').forEach((el) =>
    doc.throws.push({ ...newThrows(), type: fromCref(el.getAttribute('cref') ?? ''), description: text(el) }),
  );
  const remarks = root.querySelector('remarks');
  if (remarks) {
    remarks.querySelectorAll('para').forEach((p) => p.remove()); // mention « Obsolète » générée
    doc.remarks = text(remarks);
  }
  const code = root.querySelector('example code');
  if (code) doc.example = trimBlock(code.textContent ?? '');
  return { doc };
}

function parseFunctionDoc(src: string, lang: Lang): { doc: FunctionDoc; warning?: string } {
  const t = src.trim();
  if (!t) return { doc: emptyDoc(lang) };
  const parsed = t.startsWith('///') ? parseCSharpDoc(t) : parseTsDoc(t);
  return { ...parsed, doc: { ...parsed.doc, lang } };
}

/* ——— Projet ——— */

const KNOWN_KEYS = new Set(['title', 'endpoint', 'endpoints', 'object', 'objects', 'functions', 'function', 'messages', 'mesages']);

export function parseProjectJson(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON invalide : ${(e as Error).message}`);
  }

  const blocks: Record<string, unknown> = {};
  if (Array.isArray(data)) data.filter(isRecord).forEach((b) => Object.assign(blocks, b));
  else if (isRecord(data)) Object.assign(blocks, data);
  else throw new Error('Le JSON doit être un tableau de blocs ([{"title": …}, {"endpoint": […]}, …]).');

  const warnings: string[] = [];
  for (const key of Object.keys(blocks)) if (!KNOWN_KEYS.has(key)) warnings.push(`Clé « ${key} » ignorée.`);

  const pick = (...keys: string[]) => keys.map((k) => blocks[k]).find((v) => v !== undefined);
  const list = (v: unknown, label: string): Record<string, unknown>[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      warnings.push(`« ${label} » ignoré : ce n'est pas une liste.`);
      return [];
    }
    return v.filter(isRecord);
  };

  const endpoints = list(pick('endpoint', 'endpoints'), 'endpoint').map((e, i) => {
    const label = str(e.requestId) || i + 1;
    let type = str(e.type);
    let method = str(e.method).trim().toUpperCase();
    // Ancien format : la méthode HTTP était rangée dans « type ».
    if (!method && (HTTP_METHODS as string[]).includes(type.trim().toUpperCase())) {
      method = type.trim().toUpperCase();
      type = '';
    }
    const known = !method || (HTTP_METHODS as string[]).includes(method);
    if (!known) warnings.push(`Endpoint ${label} : méthode « ${method} » inconnue, remplacée par GET.`);
    let payload: Record<string, unknown> = {};
    if (isRecord(e.payload)) payload = e.payload;
    else if (e.payload !== undefined && e.payload !== '') warnings.push(`Endpoint ${label} : « payload » ignoré, ce n'est pas un objet.`);
    const extra = Object.keys(payload).filter((k) => !(PAYLOAD_KEYS as string[]).includes(k));
    if (extra.length) warnings.push(`Endpoint ${label} : clé(s) de payload ignorée(s) : ${extra.join(', ')}.`);
    // Une valeur non texte (booléen, objet…) est gardée telle quelle, en JSON.
    const value = (v: unknown) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : JSON.stringify(v));
    return {
      id: uid(),
      requestId: str(e.requestId),
      type,
      method: known && method ? method : 'GET',
      url: str(e.endpoint ?? e.url),
      payload: Object.fromEntries(PAYLOAD_KEYS.map((k) => [k, value(payload[k])])),
    };
  });

  const objects = list(pick('object', 'objects'), 'object').map((o, i) => {
    const { doc, warning } = parseObjectType(str(o.objectType));
    if (warning) warnings.push(`Objet ${str(o.objectId) || i + 1} : ${warning}`);
    return {
      id: uid(),
      objectId: str(o.objectId),
      doc: {
        ...doc,
        name: str(o.objectName ?? o.onjectName ?? o.name) || doc.name,
        description: str(o.description) || doc.description,
      },
    };
  });

  const functions = list(pick('functions', 'function'), 'functions').map((f, i) => {
    const lang: Lang = /c#|csharp/i.test(str(f.language)) ? 'csharp' : 'ts';
    const { doc, warning } = parseFunctionDoc(str(f.doc), lang);
    if (warning) warnings.push(`Fonction ${str(f.functionId) || i + 1} : ${warning}`);
    const name = str(f.functionName).replace(/\(\s*\)\s*$/, '').trim();
    return { id: uid(), functionId: str(f.functionId), doc: { ...doc, name: name || doc.name } };
  });

  const messages = list(pick('messages', 'mesages'), 'messages').map((m) => ({
    id: uid(),
    messageId: str(m.messageId),
    type: m.type,
    message: str(m.message),
  }));

  // reviveProject normalise le tout (types de message, identifiants hérités…).
  const project = reviveProject({ title: str(pick('title')), endpoints, objects, functions, messages });
  return { project, warnings };
}
