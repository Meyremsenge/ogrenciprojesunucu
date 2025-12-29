/**
 * Application Entry Point
 * React uygulamasının başlangıç noktası
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Theme initialization
const initializeTheme = () => {
  const storedTheme = localStorage.getItem('ui-store');
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      const theme = parsed?.state?.theme;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch {
      // Fallback to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  } else {
    // First visit - check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }
};

// Initialize theme before render to prevent flash
initializeTheme();

// System theme change listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const storedTheme = localStorage.getItem('ui-store');
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      if (parsed?.state?.theme === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch {
      // Ignore errors
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
