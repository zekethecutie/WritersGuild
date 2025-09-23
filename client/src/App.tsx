
import { Route, Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Suspense } from "react";

// Simple loading component
function LoadingScreen() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '2rem', 
          height: '2rem', 
          border: '2px solid #e2e8f0',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          margin: '0 auto 1rem',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading Writers Guild...</p>
      </div>
    </div>
  );
}

// Lazy load pages to prevent blocking
const Landing = () => import("@/pages/landing").then(m => ({ default: m.default }));
const Home = () => import("@/pages/home").then(m => ({ default: m.default }));
const Explore = () => import("@/pages/explore").then(m => ({ default: m.default }));
const Profile = () => import("@/pages/profile").then(m => ({ default: m.default }));
const NotFound = () => import("@/pages/not-found").then(m => ({ default: m.default }));

function AppContent() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Connection Error</h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Unable to connect to server</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Router>
        <Route path="/" component={isAuthenticated ? Home : Landing} />
        <Route path="/explore" component={Explore} />
        <Route path="/profile/:username" component={Profile} />
        <Route component={NotFound} />
      </Router>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
