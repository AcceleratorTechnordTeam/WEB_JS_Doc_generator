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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointDoc {
  id: string;
  requestId: string;
  method: HttpMethod;
  url: string;
}

export type MessageType = 'error' | 'success' | 'warning' | 'info';

export interface MessageDoc {
  id: string;
  messageId: string;
  type: MessageType;
  message: string;
}

/** Objet du projet : identifiant métier (« Object 01 ») + sa définition. */
export interface ObjectEntry {
  id: string;
  objectId: string;
  doc: ObjectDoc;
}

/** Fonction du projet : identifiant métier (« FF01 ») + sa documentation. */
export interface FunctionEntry {
  id: string;
  functionId: string;
  doc: FunctionDoc;
}

/** Document complet exporté en JSON. */
export interface ProjectDoc {
  title: string;
  endpoints: EndpointDoc[];
  objects: ObjectEntry[];
  functions: FunctionEntry[];
  messages: MessageDoc[];
}

export interface SavedProject {
  id: string;
  savedAt: number;
  project: ProjectDoc;
}

export type Tab = 'endpoints' | 'objects' | 'functions' | 'messages';

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}
