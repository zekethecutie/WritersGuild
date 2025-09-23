import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Assuming authService and AuthState are defined elsewhere and correctly imported.
// For the purpose of this modification, we'll focus on the hook itself.
// If authService.getCurrentUser() was the only part of authService used,
// and the rest of the logic is now handled within the hook,
// the import of authService might be redundant or need adjustment.
// However, sticking strictly to the provided changes, we'll keep the import.
import { authService, type AuthState } from "@/lib/auth";


export function useAuth() {
  console.log('useAuth hook called');

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      console.log('Fetching auth user...');
      const response = await fetch("/api/user", {
        credentials: "include",
      });

      console.log('Auth response:', response.status, response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated');
          return null; // Not authenticated
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const userData = await response.json();
      console.log('User data:', userData);
      return userData;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  console.log('Auth state:', { user, isLoading, error });

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {