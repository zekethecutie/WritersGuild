
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  username: string;
  bio?: string;
  url?: string;
  roles?: string[];
  teams?: string[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async login(): Promise<void> {
    window.location.href = '/api/login';
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Redirect anyway
      window.location.href = '/';
    }
  }

  isUnauthorizedError(error: Error): boolean {
    return /^401: .*Unauthorized/.test(error.message);
  }

  async refreshAuth(): Promise<User | null> {
    return this.getCurrentUser();
  }
}

export const authService = AuthService.getInstance();
