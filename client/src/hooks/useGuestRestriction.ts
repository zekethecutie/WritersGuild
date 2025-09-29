
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useGuestRestriction() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const checkAuthAndExecute = (action: () => void, feature?: string) => {
    if (isLoading) return false;
    
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    
    try {
      action();
      return true;
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  };

  const handleGuestAction = (feature?: string) => {
    if (isLoading) return false;
    
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    return true;
  };

  const requireAuth = (action: () => void, actionName?: string) => {
    if (isLoading) return false;
    
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    
    try {
      action();
      return true;
    } catch (error) {
      console.error(`${actionName || 'Action'} execution failed:`, error);
      return false;
    }
  };

  return {
    checkAuthAndExecute,
    handleGuestAction,
    requireAuth,
    showAuthDialog,
    setShowAuthDialog,
    isAuthenticated,
    isLoading
  };
}
