import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('App rendering error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">Please check the console for details</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

try {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">App failed to load</h1>
        <p style="color: #666; margin-bottom: 1rem;">Check console for details</p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}
