
import { useState } from "react";
import { useAuth } from "./useAuth";

export function useGuestRestriction() {
  const { isAuthenticated } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [restrictedAction, setRestrictedAction] = useState<string>("");

  const requireAuth = (action: () => void, actionName?: string) => {
    if (!isAuthenticated) {
      setRestrictedAction(actionName || "access this feature");
      setShowAuthDialog(true);
      return false;
    }
    action();
    return true;
  };

  const checkAuthForAction = (actionName: string) => {
    if (!isAuthenticated) {
      setRestrictedAction(actionName);
      setShowAuthDialog(true);
      return false;
    }
    return true;
  };

  return {
    requireAuth,
    checkAuthForAction,
    showAuthDialog,
    setShowAuthDialog,
    restrictedAction,
    isAuthenticated
  };
}
