import { create } from 'zustand';
import type { AuthenticatedUser } from '../services/auth';
import { initializeSupabaseAuth, loginWithSupabase, logoutFromSupabase } from '../services/auth';

interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  initialize: async () => {
    try {
      const user = await initializeSupabaseAuth();
      set({
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
  login: async (email: string, password: string) => {
    const user = await loginWithSupabase(email, password);
    set({ user, isAuthenticated: true });
    return true;
  },
  logout: async () => {
    await logoutFromSupabase();
    set({ user: null, isAuthenticated: false });
  },
}));
