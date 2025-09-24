import { useQuery } from "@tanstack/react-query";
import { authService, type AuthState } from "@/lib/auth";

export function useAuth(): AuthState & { login: typeof authService.login } {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: authService.login.bind(authService),
  };
}