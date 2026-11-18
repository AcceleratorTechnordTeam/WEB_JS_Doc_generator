import type { FunctionDoc, Issue, ObjectDoc } from '../types';
import { VOID_CS_TYPES } from './csharpdoc';

const IDENT = {
  ts: /^[A-Za-z_$][\w$]*$/,
  csharp: /^@?[A-Za-z_]\w*$/,
};

const VOID_TS = new Set(['void', 'undefined', 'never', 'Promise<void>']);

/** Règles de standardisation : erreurs = doc incomplète, avertissements = à vérifier. */
export function validate(d: FunctionDoc): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });
  const ident = IDENT[d.lang];

  const name = d.name.trim();
  if (!name) error('Le nom de la fonction est obligatoire.');
  else if (!ident.test(name)) warn(`« ${name} » n'est pas un identifiant valide.`);
  else if (d.lang === 'csharp' && /^[a-z]/.test(name)) warn('En C#, les méthodes sont en PascalCase.');
  else if (d.lang === 'ts' && /^[A-Z]/.test(name)) warn('En TypeScript, les fonctions sont en camelCase.');

  if (!d.summary.trim()) error('La description est obligatoire.');

  const seen = new Set<string>();
  d.params.forEach((p, i) => {
    const pName = p.name.trim();
    const label = pName ? `« ${pName} »` : `n°${i + 1}`;
    if (!pName) error(`Le paramètre ${label} n'a pas de nom.`);
    else {
      if (!ident.test(pName)) warn(`Le paramètre ${label} n'est pas un identifiant valide.`);
      if (seen.has(pName)) error(`Le paramètre ${label} est en double.`);
      seen.add(pName);
    }
    if (!p.type.trim()) warn(`Le paramètre ${label} n'a pas de type.`);
    if (!p.description.trim()) error(`Le paramètre ${label} n'a pas de description.`);
  });

  const tpSeen = new Set<string>();
  d.typeParams.forEach((t, i) => {
    const tName = t.name.trim();
    if (!tName) error(`Le paramètre de type n°${i + 1} n'a pas de nom.`);
    else if (tpSeen.has(tName)) error(`Le paramètre de type « ${tName} » est en double.`);
    else tpSeen.add(tName);
    if (!t.description.trim()) warn(`Le paramètre de type ${tName ? `« ${tName} »` : `n°${i + 1}`} n'a pas de description.`);
  });

  const rt = d.returnType.trim();
  const voidTypes = d.lang === 'ts' ? VOID_TS : VOID_CS_TYPES;
  if (rt && !voidTypes.has(rt) && !d.returnDescription.trim()) {
    error(`Le retour (${rt}) doit avoir une description.`);
  }

  d.throws.forEach((t, i) => {
    if (!t.type.trim()) error(`L'exception n°${i + 1} n'a pas de type.`);
    if (!t.description.trim()) warn(`L'exception ${t.type.trim() || `n°${i + 1}`} n'a pas de condition.`);
  });

  if (d.isDeprecated && !d.deprecatedReason.trim()) warn("Indique pourquoi la fonction est obsolète et quoi utiliser à la place.");

  return issues;
}

/** Règles de standardisation pour un objet (interface / classe). */
export function validateObject(d: ObjectDoc): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });
  const ident = IDENT[d.lang];

  const name = d.name.trim();
  if (!name) error("Le nom de l'objet est obligatoire.");
  else if (!ident.test(name)) warn(`« ${name} » n'est pas un identifiant valide.`);
  else if (/^[a-z]/.test(name)) warn('Les noms de type sont en PascalCase.');

  if (!d.description.trim()) error("La description de l'objet est obligatoire.");
  if (d.properties.length === 0) warn('Aucune propriété documentée.');

  const seen = new Set<string>();
  d.properties.forEach((p, i) => {
    const pName = p.name.trim();
    const label = pName ? `« ${pName} »` : `n°${i + 1}`;
    if (!pName) error(`La propriété ${label} n'a pas de nom.`);
    else {
      if (!ident.test(pName)) warn(`La propriété ${label} n'est pas un identifiant valide.`);
      else if (d.lang === 'csharp' && /^[a-z]/.test(pName)) warn(`En C#, la propriété ${label} devrait être en PascalCase.`);
      if (seen.has(pName)) error(`La propriété ${label} est en double.`);
      seen.add(pName);
    }
    if (!p.type.trim()) warn(`La propriété ${label} n'a pas de type.`);
    if (!p.description.trim()) error(`La propriété ${label} n'a pas de description.`);
  });

  return issues;
}
