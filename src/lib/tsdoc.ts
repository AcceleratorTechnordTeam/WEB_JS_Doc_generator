import type { FunctionDoc } from '../types';
import { isUrl, nonEmptyLines, toLines, trimBlock } from './text';

const VOID_TYPES = new Set(['void', 'undefined', 'never', 'Promise<void>']);

/** Empêche un "*\/" présent dans le texte de fermer le commentaire. */
const safe = (s: string) => s.replace(/\*\//g, '*\\/');

/** Construit un tag dont la description peut tenir sur plusieurs lignes. */
function tag(head: string, text: string, sep = ' - '): string[] {
  const [first = '', ...rest] = toLines(text.trim());
  return [first ? `${head}${sep}${first}` : head, ...rest.map((l) => (l.trim() ? `  ${l.trimEnd()}` : ''))];
}

export function generateTsDoc(d: FunctionDoc): string {
  const out: string[] = [];
  const summary = d.summary.trim();
  const remarks = d.remarks.trim();

  if (summary) out.push(...toLines(summary));
  if (remarks) {
    if (out.length) out.push('');
    out.push(...toLines(remarks));
  }

  const typeOf = (t: string) => (d.includeTypes && t.trim() ? `{${t.trim()}} ` : '');
  const tags: string[] = [];

  for (const tp of d.typeParams) {
    const name = tp.name.trim();
    if (name) tags.push(...tag(`@template ${name}`, tp.description));
  }

  for (const p of d.params) {
    const name = p.name.trim();
    if (!name) continue;
    const def = p.defaultValue.trim();
    const label = def ? `[${name}=${def}]` : p.optional ? `[${name}]` : name;
    tags.push(...tag(`@param ${typeOf(p.type)}${label}`, p.description));
  }

  const rt = d.returnType.trim();
  const rd = d.returnDescription.trim();
  if (rd || (d.includeTypes && rt && !VOID_TYPES.has(rt))) {
    tags.push(...tag(`@returns ${typeOf(rt)}`.trimEnd(), rd, ' '));
  }

  for (const t of d.throws) {
    const type = t.type.trim();
    if (!type && !t.description.trim()) continue;
    tags.push(...tag(type ? `@throws {${type}}` : '@throws', t.description, ' '));
  }

  const example = trimBlock(d.example);
  if (example) tags.push('@example', ...toLines(example));

  if (d.isDeprecated) tags.push(...tag('@deprecated', d.deprecatedReason, ' '));

  for (const ref of nonEmptyLines(d.see)) tags.push(`@see ${isUrl(ref) ? `{@link ${ref}}` : ref}`);

  if (d.since.trim()) tags.push(`@since ${d.since.trim()}`);
  if (d.author.trim()) tags.push(`@author ${d.author.trim()}`);

  if (tags.length) {
    if (out.length) out.push('');
    out.push(...tags);
  }

  return ['/**', ...out.map((l) => (l ? ` * ${safe(l)}` : ' *')), ' */'].join('\n');
}
