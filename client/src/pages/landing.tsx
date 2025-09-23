import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthDialog } from "@/components/auth-dialog";
import { Feather, Users, Edit3, Heart, Music, Image, Quote } from "lucide-react";

export default function Landing() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Writers Guild
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          A community for writers to share their stories and connect with readers.
        </p>
        <button
          onClick={() => window.location.href = '/explore'}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Explore Content
        </button>
      </div>
    </div>
  );
}