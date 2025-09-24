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
import Explore from "./pages/explore";
import SeriesPage from "./pages/series";
import StoryPage from "./pages/story";
import Messages from "./pages/messages";
import Notifications from "./pages/notifications";
import Bookmarks from "./pages/bookmarks";
import SearchPage from "./pages/search";
import SettingsPage from "./pages/settings";

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
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
      <Route path="/series" component={SeriesPage} />
      <Route path="/story/:id" component={StoryPage} />
      <Route path="/story/:id/chapter/:chapterId" component={StoryPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/search" component={isAuthenticated ? SearchPage : Explore} />
      <Route path="/notifications" component={isAuthenticated ? Notifications : Explore} />
      <Route path="/messages" component={isAuthenticated ? Messages : Explore} />
      <Route path="/bookmarks" component={isAuthenticated ? Bookmarks : Explore} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/:rest*" component={NotFound} />
    </Router>
  );
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