
<line_number>1</line_number>
import { useState } from "react";
import { useAuth } from "./useAuth";

export function useGuestRestriction() {
  const { isAuthenticated } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const requireAuth = (action: () => void, message?: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return false;
    }
    action();
    return true;
  };

  return {
    requireAuth,
    showAuthDialog,
    setShowAuthDialog,
    isAuthenticated
  };
}
