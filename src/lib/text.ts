/** Découpe un texte en lignes en normalisant les fins de ligne. */
export const toLines = (s: string): string[] => s.replace(/\r\n?/g, '\n').split('\n');

/** Retire les espaces de fin de ligne et les lignes vides au début/à la fin, en gardant l'indentation. */
export const trimBlock = (s: string): string =>
  toLines(s)
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');

/** Lignes non vides d'un texte (une entrée par ligne). */
export const nonEmptyLines = (s: string): string[] =>
  toLines(s)
    .map((l) => l.trim())
    .filter(Boolean);

export const isUrl = (s: string): boolean => /^https?:\/\//i.test(s.trim());

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
