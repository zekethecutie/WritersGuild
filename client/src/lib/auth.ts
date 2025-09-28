
export interface User {
  id: string;
  email?: string;
  displayName: string;
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
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async register(userData: {
    email?: string;
    password: string;
    displayName: string;
    username: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async login(identifier: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async logout(): Promise<void> {
    try {
      const response = await fetch('/api/logout', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          window.location.href = '/';
        }
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
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
