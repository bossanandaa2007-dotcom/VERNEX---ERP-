import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockUsers } from '../mock-data';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  standard?: string;
  class?: string;
  section?: string;
  standards?: string[];
  classes?: string[];
  subject?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string) => {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const user = mockUsers.find((u) => u.email === email);
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...userWithoutPassword } = user;
          set({ user: userWithoutPassword as User, isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
