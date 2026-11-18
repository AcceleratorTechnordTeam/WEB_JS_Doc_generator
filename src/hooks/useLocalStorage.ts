import { useEffect, useState } from 'react';

/**
 * État React synchronisé avec localStorage.
 * Si le stockage est indisponible (navigation privée, quota…), l'état reste en mémoire.
 */
export function useLocalStorage<T>(key: string, init: () => T, revive: (raw: unknown) => T = (r) => r as T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? init() : revive(JSON.parse(raw));
    } catch {
      return init();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
