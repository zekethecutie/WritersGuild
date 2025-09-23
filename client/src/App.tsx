
import { Route, Router, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

// Page imports
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Explore from "@/pages/explore";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";
import Bookmarks from "@/pages/bookmarks";
import SearchPage from "@/pages/search";
import SettingsPage from "@/pages/settings";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading Writers Guild...</p>
      </div>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show landing page for unauthenticated users on root
  if (!isAuthenticated && location === '/') {
    return <Landing />;
  }

  return (
    <Router>
      <Route path="/" component={isAuthenticated ? Home : Landing} />
      <Route path="/explore" component={Explore} />
      <Route path="/search" component={isAuthenticated ? SearchPage : Explore} />
      <Route path="/notifications" component={isAuthenticated ? Notifications : Explore} />
      <Route path="/messages" component={isAuthenticated ? Messages : Explore} />
      <Route path="/bookmarks" component={isAuthenticated ? Bookmarks : Explore} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/settings" component={isAuthenticated ? SettingsPage : Explore} />
      <Route component={NotFound} />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
