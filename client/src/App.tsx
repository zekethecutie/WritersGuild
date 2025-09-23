
import { Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

function AppRouter() {
  console.log('AppRouter rendering');
  
  try {
    const { isAuthenticated, isLoading } = useAuth();
    const [location] = useLocation();

    console.log('Auth state:', { isAuthenticated, isLoading, location });

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#ffffff'}}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#3b82f6'}}></div>
            <p style={{color: '#6b7280'}}>Loading Writers Guild...</p>
          </div>
        </div>
      );
    }

    // Show landing page only for the root path when not authenticated
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
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Router>
    );
  } catch (error) {
    console.error('AppRouter error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">App Router Error</h1>
          <p className="text-gray-600 mb-4">Check console for details</p>
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
