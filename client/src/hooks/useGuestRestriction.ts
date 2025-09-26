
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useGuestRestriction() {
  const { isAuthenticated } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const checkAuthAndExecute = (action: () => void, feature?: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    action();
    return true;
  };

  const handleGuestAction = (feature?: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    return true;
  };

  const requireAuth = (action: () => void, actionName?: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    action();
    return true;
  };

  return {
    checkAuthAndExecute,
    handleGuestAction,
    requireAuth,
    showAuthDialog,
    setShowAuthDialog,
    isAuthenticated
  };
}
