import React from 'react';

const logoSrc = '/rcom-logo.jpg';

export default function RcomLogo({ size = 60, showText = true }) {
  const width = showText ? Math.round(size * 1.95) : size;
  const height = showText ? Math.round(size * 1.05) : size;

  return (
    <div
      role="img"
      aria-label="R.COM"
      style={{
        width,
        height,
        backgroundImage: `url(${logoSrc})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: showText ? '285%' : '430%',
        backgroundPosition: showText ? '50% 56%' : '50% 39%',
        display: 'block',
        borderRadius: Math.max(6, Math.round(size * 0.12)),
      }}
    />
  );
}
