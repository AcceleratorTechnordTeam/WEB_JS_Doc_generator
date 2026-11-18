import type { FunctionDoc } from '../types';
import { generateCSharpDoc } from './csharpdoc';
import { LANG_LABEL } from './defaults';
import { isUrl, nonEmptyLines, toLines, trimBlock } from './text';
import { generateTsDoc } from './tsdoc';

const FENCE_LANG = { ts: 'ts', csharp: 'csharp' } as const;

export const generateComment = (d: FunctionDoc): string =>
  d.lang === 'ts' ? generateTsDoc(d) : generateCSharpDoc(d);

/** Bloc de code délimité par une clôture plus longue que tout ``` présent dans le contenu. */
export function fenced(content: string, lang: string): string {
  const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map((m) => m.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${content}\n${fence}`;
}

/** Code inline, compatible avec les cellules de tableau (pipes échappés). */
export function code(s: string): string {
  const t = s.trim();
  if (!t) return '—';
  const wrapped = t.includes('`') ? `\`\` ${t} \`\`` : `\`${t}\``;
  return wrapped.replace(/\|/g, '\\|');
}

/** Texte libre dans une cellule de tableau. */
export const cell = (s: string): string => {
  const t = s.trim();
  return t ? toLines(t).map((l) => l.trim()).join('<br>').replace(/\|/g, '\\|') : '—';
};

export function generateMarkdown(d: FunctionDoc, comment = generateComment(d)): string {
  const L: string[] = [];
  const name = d.name.trim() || 'fonctionSansNom';

  L.push(`# \`${name}\`${d.isDeprecated ? ' ⚠️ Obsolète' : ''}`, '');

  const meta = [`**Langage :** ${LANG_LABEL[d.lang]}`];
  if (d.since.trim()) meta.push(`**Depuis :** ${d.since.trim()}`);
  if (d.author.trim()) meta.push(`**Auteur :** ${d.author.trim()}`);
  L.push(meta.join(' · '), '');

  L.push('## Commentaire', '', fenced(comment, FENCE_LANG[d.lang]), '');

  L.push('## Documentation', '');

  if (d.isDeprecated) {
    const reason = d.deprecatedReason.trim();
    L.push(`> **⚠️ Obsolète** — ${reason ? toLines(reason).join(' ') : 'cette fonction ne doit plus être utilisée.'}`, '');
  }

  L.push(d.summary.trim() || '_Aucune description._', '');

  if (d.remarks.trim()) L.push('### Remarques', '', d.remarks.trim(), '');

  const typeParams = d.typeParams.filter((t) => t.name.trim());
  if (typeParams.length) {
    L.push('### Paramètres de type', '', '| Nom | Description |', '|---|---|');
    for (const t of typeParams) L.push(`| ${code(t.name)} | ${cell(t.description)} |`);
    L.push('');
  }

  L.push('### Paramètres', '');
  const params = d.params.filter((p) => p.name.trim());
  if (params.length) {
    L.push('| Nom | Type | Requis | Défaut | Description |', '|---|---|:---:|---|---|');
    for (const p of params) {
      const required = p.optional || p.defaultValue.trim() ? 'Non' : 'Oui';
      L.push(`| ${code(p.name)} | ${code(p.type)} | ${required} | ${code(p.defaultValue)} | ${cell(p.description)} |`);
    }
  } else {
    L.push('_Aucun paramètre._');
  }
  L.push('');

  L.push('### Retour', '');
  const rt = d.returnType.trim();
  const rd = d.returnDescription.trim();
  if (rt || rd) L.push([rt ? code(rt) : '', rd ? toLines(rd).join(' ') : ''].filter(Boolean).join(' — '));
  else L.push('_Aucune valeur de retour._');
  L.push('');

  const throws = d.throws.filter((t) => t.type.trim() || t.description.trim());
  if (throws.length) {
    L.push('### Exceptions', '', '| Type | Condition |', '|---|---|');
    for (const t of throws) L.push(`| ${code(t.type)} | ${cell(t.description)} |`);
    L.push('');
  }

  const example = trimBlock(d.example);
  if (example) L.push('### Exemple', '', fenced(example, FENCE_LANG[d.lang]), '');

  const see = nonEmptyLines(d.see);
  if (see.length) {
    L.push('### Voir aussi', '');
    for (const ref of see) L.push(`- ${isUrl(ref) ? `<${ref}>` : code(ref)}`);
    L.push('');
  }

  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
