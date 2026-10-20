import React from 'react';

export default function App() {
  return (
    <div className="cybersprint-app">
      <div className="scanline-overlay" aria-hidden="true" />
      <header style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-cyan)', fontSize: '2.5rem' }}>CYBERSPRINT</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '1.2rem', letterSpacing: '0.1em' }}>
          TYPE FAST. RACE HARD.
        </p>
      </header>
    </div>
  );
}
