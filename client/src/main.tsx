import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 2rem; text-align: center;">❌ Root element not found</div>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("✅ App rendered successfully");
  } catch (error) {
    console.error("❌ App render error:", error);
    document.body.innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: system-ui;">
        <h1 style="color: #dc2626;">App Failed to Load</h1>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload
        </button>
      </div>
    `;
  }
}