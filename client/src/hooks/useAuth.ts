import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Assuming authService and AuthState are defined elsewhere and correctly imported.
// For the purpose of this modification, we'll focus on the hook itself.
// If authService.getCurrentUser() was the only part of authService used,
// and the rest of the logic is now handled within the hook,
// the import of authService might be redundant or need adjustment.
// However, sticking strictly to the provided changes, we'll keep the import.
import { authService, type AuthState } from "@/lib/auth";


export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });

        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Auth check error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const login = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const register = useMutation({
    mutationFn: async ({ username, password, email, displayName }: {
      username: string;
      password: string;
      email?: string;
      displayName?: string;
    }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, email, displayName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};