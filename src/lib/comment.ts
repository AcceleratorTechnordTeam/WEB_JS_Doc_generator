import type { FunctionDoc } from '../types';
import { generateCSharpDoc } from './csharpdoc';
import { generateTsDoc } from './tsdoc';

/** Commentaire de documentation d'une fonction : TSDoc/JSDoc (TS) ou commentaires XML /// (C#). */
export const generateComment = (d: FunctionDoc): string =>
  (d.lang === 'ts' ? generateTsDoc(d) : generateCSharpDoc(d)) + '\n';
