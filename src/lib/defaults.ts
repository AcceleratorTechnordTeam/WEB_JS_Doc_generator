import type { FunctionDoc, Lang, ObjectDoc, ParamDoc, PropertyDoc, ThrowsDoc, TypeParamDoc } from '../types';
import { uid } from './text';

export const emptyDoc = (lang: Lang = 'ts'): FunctionDoc => ({
  lang,
  name: '',
  summary: '',
  remarks: '',
  typeParams: [],
  params: [],
  returnType: '',
  returnDescription: '',
  throws: [],
  example: '',
  isDeprecated: false,
  deprecatedReason: '',
  since: '',
  author: '',
  see: '',
  includeTypes: true,
});

export const newParam = (): ParamDoc => ({
  id: uid(),
  name: '',
  type: '',
  description: '',
  optional: false,
  defaultValue: '',
});

export const newTypeParam = (): TypeParamDoc => ({ id: uid(), name: '', description: '' });

export const newThrows = (): ThrowsDoc => ({ id: uid(), type: '', description: '' });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const withIds = <T extends { id: string }>(list: unknown, make: () => T): T[] =>
  Array.isArray(list) ? list.filter(isObject).map((item) => ({ ...make(), ...item }) as T) : [];

/** Reconstruit un FunctionDoc valide depuis des données stockées (anciennes versions, données corrompues…). */
export function reviveDoc(raw: unknown): FunctionDoc {
  if (!isObject(raw)) return emptyDoc();
  const base = emptyDoc(raw.lang === 'csharp' ? 'csharp' : 'ts');
  const merged = { ...base, ...raw } as FunctionDoc;
  return {
    ...merged,
    // Champs de métadonnées retirés du formulaire : on neutralise d'anciennes valeurs stockées.
    since: '',
    author: '',
    see: '',
    isDeprecated: false,
    deprecatedReason: '',
    includeTypes: true,
    params: withIds(raw.params, newParam),
    typeParams: withIds(raw.typeParams, newTypeParam),
    throws: withIds(raw.throws, newThrows),
  };
}

export const emptyObject = (lang: Lang = 'ts'): ObjectDoc => ({ lang, name: '', description: '', properties: [] });

export const newProperty = (): PropertyDoc => ({
  id: uid(),
  name: '',
  type: '',
  description: '',
  optional: false,
  readonly: false,
  defaultValue: '',
});

/** Reconstruit un ObjectDoc valide depuis des données stockées. */
export function reviveObject(raw: unknown): ObjectDoc {
  if (!isObject(raw)) return emptyObject();
  const base = emptyObject(raw.lang === 'csharp' ? 'csharp' : 'ts');
  return {
    ...base,
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    properties: withIds(raw.properties, newProperty),
  };
}

export const OBJECT_PLACEHOLDERS: Record<Lang, { name: string; prop: string; type: string }> = {
  ts: { name: 'User', prop: 'email', type: 'string' },
  csharp: { name: 'User', prop: 'Email', type: 'string' },
};

export const PLACEHOLDERS: Record<
  Lang,
  { name: string; type: string; returnType: string; throws: string; example: string; see: string; typeParam: string }
> = {
  ts: {
    name: 'getUserById',
    type: 'string',
    returnType: 'Promise<User>',
    throws: 'NotFoundError',
    example: "const user = await getUserById('42');",
    see: 'UserService\nhttps://exemple.com/docs/users',
    typeParam: 'T',
  },
  csharp: {
    name: 'GetUserById',
    type: 'int',
    returnType: 'Task<User>',
    throws: 'ArgumentNullException',
    example: 'var user = await service.GetUserById(42);',
    see: 'UserService.GetAll\nhttps://exemple.com/docs/users',
    typeParam: 'T',
  },
};

export const LANG_LABEL: Record<Lang, string> = { ts: 'TypeScript', csharp: 'C#' };
