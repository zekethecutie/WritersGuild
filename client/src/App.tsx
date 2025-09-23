
import React from "react";

// Minimal working app
export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#1e293b'
        }}>
          Writers Guild
        </h1>
        
        <p style={{ 
          fontSize: '1.25rem', 
          color: '#64748b', 
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          A community platform for writers to share their stories, connect with readers, and build their audience.
        </p>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => testConnection()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Test Connection
          </button>

          <button
            onClick={() => window.location.href = '/api/auth/replit'}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Sign in with Replit
          </button>
        </div>

        <div id="status" style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          minHeight: '100px'
        }}>
          <p style={{ color: '#64748b' }}>Click "Test Connection" to verify server connectivity</p>
        </div>
      </div>
    </div>
  );
}

function testConnection() {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.innerHTML = '<p style="color: #f59e0b;">Testing connection...</p>';

  fetch('/api/health')
    .then(response => response.json())
    .then(data => {
      statusDiv.innerHTML = `
        <div style="color: #10b981;">
          <h3 style="margin: 0 0 0.5rem 0; font-weight: 600;">✅ Server Connected</h3>
          <p style="margin: 0; font-size: 0.875rem;">Status: ${data.status}</p>
          <p style="margin: 0; font-size: 0.875rem;">Database: ${data.database}</p>
          <p style="margin: 0; font-size: 0.875rem;">Time: ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
      `;
    })
    .catch(error => {
      statusDiv.innerHTML = `
        <div style="color: #dc2626;">
          <h3 style="margin: 0 0 0.5rem 0; font-weight: 600;">❌ Connection Failed</h3>
          <p style="margin: 0; font-size: 0.875rem;">Error: ${error.message}</p>
          <p style="margin: 0; font-size: 0.875rem;">Check if server is running on port 5000</p>
        </div>
      `;
    });
}
