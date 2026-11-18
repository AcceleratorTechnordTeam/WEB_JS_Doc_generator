import type { ObjectDoc } from '../types';
import { LANG_LABEL } from './defaults';
import { cell, code } from './markdown';

/** Génère la fiche Markdown d'un objet : titre, description et tableau des propriétés. */
export function generateObjectMarkdown(d: ObjectDoc): string {
  const L: string[] = [];
  const name = d.name.trim() || 'ObjetSansNom';

  L.push(`# \`${name}\``, '', `**Langage :** ${LANG_LABEL[d.lang]}`, '');
  L.push(d.description.trim() || '_Aucune description._', '');
  L.push('## Propriétés', '');

  const props = d.properties.filter((p) => p.name.trim());
  if (!props.length) {
    L.push('_Aucune propriété._');
    return L.join('\n').trimEnd() + '\n';
  }

  // La colonne « Lecture seule » n'apparaît que si elle sert.
  const withReadonly = props.some((p) => p.readonly);
  const headers = ['Propriété', 'Type', 'Requis', 'Défaut', ...(withReadonly ? ['Lecture seule'] : []), 'Description'];
  const aligns = ['---', '---', ':---:', '---', ...(withReadonly ? [':---:'] : []), '---'];
  L.push(`| ${headers.join(' | ')} |`, `|${aligns.join('|')}|`);

  for (const p of props) {
    const required = p.optional || p.defaultValue.trim() ? 'Non' : 'Oui';
    const cells = [
      code(p.name),
      code(p.type),
      required,
      code(p.defaultValue),
      ...(withReadonly ? [p.readonly ? 'Oui' : 'Non'] : []),
      cell(p.description),
    ];
    L.push(`| ${cells.join(' | ')} |`);
  }

  return L.join('\n').trimEnd() + '\n';
}
