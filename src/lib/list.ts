export const patchItem = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((item) => (item.id === id ? { ...item, ...patch } : item));

export const removeItem = <T extends { id: string }>(list: T[], id: string): T[] => list.filter((item) => item.id !== id);

export function moveItem<T extends { id: string }>(list: T[], id: string, delta: -1 | 1): T[] {
  const from = list.findIndex((item) => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
