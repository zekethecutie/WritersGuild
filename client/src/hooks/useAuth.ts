import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth'],
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) return null;
          throw new Error(`Auth failed: ${response.status}`);
        }

        const data = await response.json();
        return data || null;
      } catch (err) {
        console.warn('Auth check failed:', err);
        return null;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const login = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth'], data.user);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth'], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
};