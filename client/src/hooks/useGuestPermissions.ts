
import { useAuth } from "./useAuth";

export interface GuestPermissions {
  canRead: boolean;
  canLike: boolean;
  canComment: boolean;
  canRepost: boolean;
  canBookmark: boolean;
  canCreatePost: boolean;
  canCreateSeries: boolean;
  canFollow: boolean;
  canMessage: boolean;
  showAuthPrompt: (action: string) => boolean;
}

export function useGuestPermissions(): GuestPermissions {
  const { isAuthenticated } = useAuth();

  return {
    canRead: true, // Guests can read everything
    canLike: isAuthenticated,
    canComment: isAuthenticated,
    canRepost: isAuthenticated,
    canBookmark: isAuthenticated,
    canCreatePost: isAuthenticated,
    canCreateSeries: isAuthenticated,
    canFollow: isAuthenticated,
    canMessage: isAuthenticated,
    showAuthPrompt: (action: string) => !isAuthenticated
  };
}
