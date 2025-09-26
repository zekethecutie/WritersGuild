
import { useState } from "react";
import { useAuth } from "./useAuth";

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

  return {
    checkAuthAndExecute,
    handleGuestAction,
    showAuthDialog,
    setShowAuthDialog,
    isAuthenticated
  };
}
