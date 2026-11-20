import type { FunctionDoc } from '../types';
import { nonEmptyLines, toLines, trimBlock } from './text';

const VOID_TYPES = new Set(['void', 'undefined', 'never', 'Promise<void>']);

/** Empêche un "*\/" présent dans le texte de fermer le commentaire. */
const safe = (s: string) => s.replace(/\*\//g, '*\\/');

/** Construit un tag dont la description peut tenir sur plusieurs lignes. */
function tag(head: string, text: string, sep = ' - '): string[] {
  const [first = '', ...rest] = toLines(text.trim());
  return [first ? `${head}${sep}${first}` : head, ...rest.map((l) => l.trimEnd())];
}

/**
 * Commentaire TSDoc strict (https://tsdoc.org) : pas de types entre accolades,
 * ils sont portés par la signature TypeScript.
 */
export function generateTsDoc(d: FunctionDoc): string {
  const out: string[] = [];
  const blank = () => {
    if (out.length && out[out.length - 1] !== '') out.push('');
  };

  const summary = d.summary.trim();
  if (summary) out.push(...toLines(summary));

  const remarks = d.remarks.trim();
  if (remarks) {
    blank();
    out.push('@remarks', ...toLines(remarks));
  }

  const tags: string[] = [];

  for (const tp of d.typeParams) {
    const name = tp.name.trim();
    if (name) tags.push(...tag(`@typeParam ${name}`, tp.description));
  }

  for (const p of d.params) {
    const name = p.name.trim();
    if (!name) continue;
    const def = p.defaultValue.trim();
    const desc = p.description.trim();
    const punctuated = desc && !/[.!?:;]$/.test(desc) ? `${desc}.` : desc;
    const text = def ? `${punctuated}${punctuated ? ' ' : ''}Par défaut : \`${def}\`.` : desc;
    const type = p.type.trim();
    tags.push(...tag(`@param ${type ? `{${type}} ` : ''}${name}`, text));
  }

  // @returns {type} description : le type n'est écrit que s'il est renseigné et n'est pas « vide ».
  const rd = d.returnDescription.trim();
  const rt = d.returnType.trim();
  const typed = rt && !VOID_TYPES.has(rt) ? `{${rt}}` : '';
  if (rd || typed) tags.push(...tag(`@returns${typed ? ` ${typed}` : ''}`, rd, ' '));

  for (const t of d.throws) {
    const type = t.type.trim();
    if (!type && !t.description.trim()) continue;
    tags.push(...tag(type ? `@throws {@link ${type}}` : '@throws', t.description, ' '));
  }

  if (d.isDeprecated) tags.push(...tag('@deprecated', d.deprecatedReason, ' '));

  for (const ref of nonEmptyLines(d.see)) tags.push(`@see {@link ${ref}}`);

  if (tags.length) {
    blank();
    out.push(...tags);
  }

  // @example en dernier, avec un bloc de code délimité comme le recommande TSDoc.
  const example = trimBlock(d.example);
  if (example) {
    blank();
    out.push('@example', '```ts', ...toLines(example), '```');
  }

  return ['/**', ...out.map((l) => (l ? ` * ${safe(l)}` : ' *')), ' */'].join('\n');
}
