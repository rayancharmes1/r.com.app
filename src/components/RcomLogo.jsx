import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function RcomLogo({ size = 60, showText = true }) {
  const { darkMode } = useTheme();
  const width = showText ? Math.round(size * 3.2) : size;
  const height = size;

  // Le logo change automatiquement selon le thème actif
  const logoSrc = darkMode ? '/icons/rcom-logo-dark.png' : '/icons/rcom-logo-light.png';

  return (
    <img
      src={logoSrc}
      alt="R.COM"
      style={{
        width,
        height,
        objectFit: 'contain',
        objectPosition: 'left center',
        display: 'block',
      }}
    />
  );
}