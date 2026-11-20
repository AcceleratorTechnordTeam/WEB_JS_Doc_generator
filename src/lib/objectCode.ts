import type { ObjectDoc, PropertyDoc } from '../types';
import { escapeXml } from './csharpdoc';
import { toLines } from './text';

const TS_IDENT = /^[A-Za-z_$][\w$]*$/;

/** Empêche un "*\/" présent dans le texte de fermer le commentaire. */
const safe = (s: string) => s.replace(/\*\//g, '*\\/');

const isOptional = (p: PropertyDoc) => p.optional || Boolean(p.defaultValue.trim());

/** Bloc JSDoc indenté : une ligne si possible, sinon multi-lignes. */
function jsdoc(lines: string[], indent: string): string[] {
  const clean = lines.map((l) => safe(l.trimEnd()));
  if (!clean.length) return [];
  if (clean.length === 1) return [`${indent}/** ${clean[0]} */`];
  return [`${indent}/**`, ...clean.map((l) => (l ? `${indent} * ${l}` : `${indent} *`)), `${indent} */`];
}

/** Type TypeScript documenté en JSDoc. */
export function generateTsType(d: ObjectDoc): string {
  const name = d.name.trim() || 'ObjetSansNom';
  const out: string[] = [];

  const description = d.description.trim();
  out.push(...jsdoc(description ? toLines(description) : [], ''));
  out.push(`export type ${name} = {`);

  const props = d.properties.filter((p) => p.name.trim());
  // Une ligne vide entre les propriétés dès que l'une d'elles est documentée.
  const spaced = props.some((p) => p.description.trim() || p.defaultValue.trim());

  props.forEach((p, i) => {
    const doc = p.description.trim() ? toLines(p.description.trim()) : [];
    const def = p.defaultValue.trim();
    if (def) doc.push(`@default ${def}`);
    if (i > 0 && spaced) out.push('');
    out.push(...jsdoc(doc, '  '));

    const raw = p.name.trim();
    const key = TS_IDENT.test(raw) ? raw : `'${raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    out.push(`  ${p.readonly ? 'readonly ' : ''}${key}${isOptional(p) ? '?' : ''}: ${p.type.trim() || 'unknown'};`);
  });

  out.push('};');
  return out.join('\n') + '\n';
}

/**
 * Corps du type TS sur une seule chaîne, format du JSON d'export :
 * `{/** doc *\/\nnom: type;\n\nautre?: type;}`.
 */
export function generateTsTypeBody(d: ObjectDoc): string {
  const props = d.properties
    .filter((p) => p.name.trim())
    .map((p) => {
      const doc = p.description.trim() ? toLines(p.description.trim()) : [];
      const def = p.defaultValue.trim();
      if (def) doc.push(`@default ${def}`);
      const raw = p.name.trim();
      const key = TS_IDENT.test(raw) ? raw : `'${raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      const line = `${p.readonly ? 'readonly ' : ''}${key}${isOptional(p) ? '?' : ''}: ${p.type.trim() || 'unknown'};`;
      return [...jsdoc(doc, ''), line].join('\n');
    });
  return `{${props.join('\n\n')}}`;
}

/** `email` → `Email` (convention C# des propriétés). */
const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Classe C# documentée en commentaires XML. */
export function generateCSharpClass(d: ObjectDoc): string {
  const name = d.name.trim() || 'ObjetSansNom';
  const out: string[] = [];

  const summary = (lines: string[], indent: string) =>
    lines.length === 1
      ? [`${indent}/// <summary>${lines[0]}</summary>`]
      : [`${indent}/// <summary>`, ...lines.map((l) => `${indent}/// ${l}`), `${indent}/// </summary>`];

  const description = d.description.trim();
  if (description) out.push(...summary(toLines(description).map((l) => escapeXml(l.trimEnd())), ''));
  out.push(`public class ${name}`, '{');

  d.properties
    .filter((p) => p.name.trim())
    .forEach((p, i) => {
      if (i > 0) out.push('');
      const desc = p.description.trim();
      if (desc) out.push(...summary(toLines(desc).map((l) => escapeXml(l.trimEnd())), '    '));

      let type = p.type.trim() || 'object';
      if (p.optional && !p.defaultValue.trim() && !type.endsWith('?')) type += '?';
      const accessors = p.readonly ? '{ get; init; }' : '{ get; set; }';
      const def = p.defaultValue.trim();
      out.push(`    public ${type} ${pascal(p.name.trim().replace(/^@/, ''))} ${accessors}${def ? ` = ${def};` : ''}`);
    });

  out.push('}');
  return out.join('\n') + '\n';
}

export const generateObjectCode = (d: ObjectDoc): string =>
  d.lang === 'ts' ? generateTsType(d) : generateCSharpClass(d);
