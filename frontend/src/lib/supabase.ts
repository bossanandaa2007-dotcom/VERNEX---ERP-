import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let shouldRememberSession = false;

export const setAuthSessionPersistence = (rememberSession: boolean) => {
  shouldRememberSession = rememberSession;
};

const getBrowserStorage = (persistent: boolean) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return persistent ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const authStorageAdapter = {
  getItem: (key: string) => {
    return getBrowserStorage(true)?.getItem(key) || getBrowserStorage(false)?.getItem(key) || null;
  },
  setItem: (key: string, value: string) => {
    const targetStorage = getBrowserStorage(shouldRememberSession);
    const staleStorage = getBrowserStorage(!shouldRememberSession);

    try {
      targetStorage?.setItem(key, value);
      staleStorage?.removeItem(key);
    } catch {
      // Ignore storage failures so auth can still continue in restricted browsers.
    }
  },
  removeItem: (key: string) => {
    try {
      getBrowserStorage(true)?.removeItem(key);
      getBrowserStorage(false)?.removeItem(key);
    } catch {
      // Ignore storage failures so logout does not crash the app shell.
    }
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: authStorageAdapter,
      },
    })
  : null;
