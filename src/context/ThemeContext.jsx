import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME = {
  light: {
    bg: '#f0f2f5',
    headerBg: '#ffffff',
    headerShadow: '0 2px 12px rgba(0,0,0,0.07)',
    text: '#1a1a2e',
    sub: '#888',
    cardBg: '#ffffff',
    cardShadow: '0 4px 18px rgba(0,0,0,0.09)',
    border: '#eee',
    inputBg: '#ffffff',
    inputBorder: '#ddd',
    inputText: '#1a1a2e',
    ddBg: '#ffffff',
    ddText: '#333',
  },
  dark: {
    bg: '#121218',
    headerBg: '#1c1c24',
    headerShadow: '0 2px 12px rgba(0,0,0,0.4)',
    text: '#f2f2f5',
    sub: '#a0a0aa',
    cardBg: '#1c1c24',
    cardShadow: '0 4px 18px rgba(0,0,0,0.5)',
    border: '#33333d',
    inputBg: '#26262f',
    inputBorder: '#3a3a45',
    inputText: '#f2f2f5',
    ddBg: '#20202a',
    ddText: '#e8e8ec',
  },
};

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('rcom-theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('rcom-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(d => !d);
  const t = darkMode ? THEME.dark : THEME.light;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
