import type { FunctionDoc } from '../types';
import { isUrl, nonEmptyLines, toLines, trimBlock } from './text';

export const VOID_CS_TYPES = new Set(['void', 'Task', 'ValueTask']);

export const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeXml(s).replace(/"/g, '&quot;');

/** `List<int>` → `List{int}` (syntaxe cref des génériques), `int?` → `int`. */
export const toCref = (t: string) => t.trim().replace(/\s+/g, '').replace(/</g, '{').replace(/>/g, '}').replace(/\?$/, '');

/** Lignes échappées XML d'un texte libre. */
const escLines = (text: string): string[] => {
  const t = text.trim();
  return t ? toLines(t).map((l) => escapeXml(l.trimEnd())) : [];
};

/** Élément sur une ligne si possible, sinon en bloc. */
function inline(tag: string, attrs: string, lines: string[]): string[] {
  if (lines.length <= 1) return [`<${tag}${attrs}>${lines[0] ?? ''}</${tag}>`];
  return [`<${tag}${attrs}>`, ...lines, `</${tag}>`];
}

/** Élément toujours en bloc (summary, remarks, example). */
const block = (tag: string, lines: string[]): string[] => [`<${tag}>`, ...lines, `</${tag}>`];

export function generateCSharpDoc(d: FunctionDoc): string {
  const out: string[] = [];

  out.push(...block('summary', escLines(d.summary)));

  for (const tp of d.typeParams) {
    const name = tp.name.trim();
    if (name) out.push(...inline('typeparam', ` name="${escapeAttr(name)}"`, escLines(tp.description)));
  }

  for (const p of d.params) {
    const name = p.name.trim().replace(/^@/, '');
    if (!name) continue;
    let lines = escLines(p.description);
    const def = p.defaultValue.trim();
    if (p.optional || def) {
      const note = def ? `Optionnel, valeur par défaut : <c>${escapeXml(def)}</c>.` : 'Optionnel.';
      const last = lines[lines.length - 1];
      const punctuated = last && !/[.!?:;]$/.test(last) ? `${last}.` : last;
      lines = lines.length ? [...lines.slice(0, -1), `${punctuated} ${note}`] : [note];
    }
    out.push(...inline('param', ` name="${escapeAttr(name)}"`, lines));
  }

  const rd = escLines(d.returnDescription);
  if (rd.length) out.push(...inline('returns', '', rd));

  for (const t of d.throws) {
    const type = t.type.trim();
    if (type) out.push(...inline('exception', ` cref="${escapeAttr(toCref(type))}"`, escLines(t.description)));
  }

  const remarks = escLines(d.remarks);
  if (d.isDeprecated) {
    const reason = d.deprecatedReason.trim().replace(/\s*\n\s*/g, ' ');
    remarks.push(`<para><b>Obsolète.</b>${reason ? ` ${escapeXml(reason)}` : ''}</para>`);
  }
  if (remarks.length) out.push(...block('remarks', remarks));

  const example = trimBlock(d.example);
  if (example) out.push(...block('example', ['<code>', ...toLines(example).map(escapeXml), '</code>']));

  for (const ref of nonEmptyLines(d.see)) {
    out.push(isUrl(ref) ? `<seealso href="${escapeAttr(ref)}"/>` : `<seealso cref="${escapeAttr(toCref(ref))}"/>`);
  }

  return out.map((l) => (l ? `/// ${l}` : '///')).join('\n');
}
