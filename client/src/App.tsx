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
import SeriesEditPage from "./pages/series-edit";
import Messages from "./pages/messages";
import Notifications from "./pages/notifications";
import Bookmarks from "./pages/bookmarks";
import SearchPage from "./pages/search";
import SettingsPage from "./pages/settings";
import ChapterPage from "@/pages/chapter";
import ChapterEditor from "@/pages/chapter-editor";
import PostPage from "@/pages/post";
import Guidelines from "@/pages/guidelines";
import AdminTest from "@/pages/admin-test";
import { lazy, Suspense, Component } from "react";

// Simple Error Boundary component since react-error-boundary might not be installed
class ErrorBoundary extends Component<
  { children: React.ReactNode; FallbackComponent: React.ComponentType<any> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <this.props.FallbackComponent 
          error={this.state.error} 
          resetErrorBoundary={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

// Lazy load heavy components
const LazyLeaderboard = lazy(() => import("./pages/leaderboard"));
const LazySeriesEdit = lazy(() => import("./pages/series-edit"));
const LazyChapterEditor = lazy(() => import("./pages/chapter-editor"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center p-6">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">
        {error?.message || "An unexpected error occurred"}
      </p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  </div>
);

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

  return (
    <Router>
      <Route path="/" component={isAuthenticated ? Home : Landing} />
      <Route path="/explore" component={Explore} />
      <Route path="/series" component={SeriesPage} />
      <Route path="/series/:id/edit" component={isAuthenticated ? SeriesEditPage : Landing} />
      <Route path="/story/:id/chapter/:chapterId" component={StoryPage} />
      <Route path="/story/:id" component={StoryPage} />
      <Route path="/chapter/:id" component={ChapterPage} />
      <Route path="/chapter/:id/edit" component={ChapterEditor} />
      <Route path="/post/:id" component={PostPage} />

      {/* Wrapped lazy components with Suspense */}
      <Route 
        path="/story/:id/edit" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <LazySeriesEdit />
          </Suspense>
        )} 
      />
      <Route 
        path="/story/:id/chapter/:chapterId/edit" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <LazyChapterEditor />
          </Suspense>
        )} 
      />
      <Route 
        path="/leaderboard" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <LazyLeaderboard />
          </Suspense>
        )} 
      />

      {/* Protected routes with proper fallbacks */}
      <Route path="/search" component={isAuthenticated ? SearchPage : Explore} />
      <Route path="/notifications" component={isAuthenticated ? Notifications : Explore} />
      <Route path="/messages" component={isAuthenticated ? Messages : Explore} />
      <Route path="/bookmarks" component={isAuthenticated ? Bookmarks : Explore} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/settings" component={isAuthenticated ? SettingsPage : Landing} />
      <Route path="/guidelines" component={Guidelines} />
      <Route path="/admin-test" component={AdminTest} />
      <Route component={NotFound} />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingFallback />}>
            <AppRouter />
          </Suspense>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;