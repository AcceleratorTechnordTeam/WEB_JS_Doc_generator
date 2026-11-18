export type Lang = 'ts' | 'csharp';

export interface ParamDoc {
  id: string;
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue: string;
}

export interface TypeParamDoc {
  id: string;
  name: string;
  description: string;
}

export interface ThrowsDoc {
  id: string;
  type: string;
  description: string;
}

export interface FunctionDoc {
  lang: Lang;
  name: string;
  summary: string;
  remarks: string;
  typeParams: TypeParamDoc[];
  params: ParamDoc[];
  returnType: string;
  returnDescription: string;
  throws: ThrowsDoc[];
  example: string;
  isDeprecated: boolean;
  deprecatedReason: string;
  since: string;
  author: string;
  /** Une référence par ligne. */
  see: string;
  /** TypeScript uniquement : ajoute les `{type}` dans le JSDoc. */
  includeTypes: boolean;
}

export interface PropertyDoc {
  id: string;
  name: string;
  type: string;
  description: string;
  optional: boolean;
  readonly: boolean;
  defaultValue: string;
}

/** Objet documenté : interface / type (TS) ou classe / record (C#). */
export interface ObjectDoc {
  lang: Lang;
  name: string;
  description: string;
  properties: PropertyDoc[];
}

export type Mode = 'function' | 'object';

export type SavedDoc =
  | { id: string; savedAt: number; mode: 'function'; doc: FunctionDoc }
  | { id: string; savedAt: number; mode: 'object'; doc: ObjectDoc };

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}
