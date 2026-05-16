import React from 'react';

// Logo reproduit fidèlement depuis l'image: losange avec triangles colorés (rouge, orange, jaune, bleu) et texte R.COM
export default function RcomLogo({ size = 60, showText = true, textSize = 28 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: showText ? 4 : 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Losange rotatif avec triangles colorés comme dans le logo original */}
        {/* Triangle haut - orange/jaune */}
        <polygon points="50,5 78,33 50,33" fill="#e67e22"/>
        {/* Triangle haut gauche - rouge foncé */}
        <polygon points="50,5 22,33 50,33" fill="#c0392b"/>
        {/* Triangle milieu haut - jaune doré */}
        <polygon points="22,33 50,33 36,50" fill="#d4870d"/>
        {/* Triangle milieu droit - bleu */}
        <polygon points="78,33 64,50 50,33" fill="#2980b9"/>
        {/* Triangle milieu gauche - rouge */}
        <polygon points="22,33 36,50 22,55" fill="#922b21"/>
        {/* Triangle milieu droit bas - bleu foncé */}
        <polygon points="78,33 78,55 64,50" fill="#1a5276"/>
        {/* Espace blanc central (le "D" du logo) */}
        <polygon points="36,50 50,33 64,50 50,67" fill="white"/>
        {/* Triangle bas gauche - rouge bordeaux */}
        <polygon points="22,55 36,50 50,67 22,67" fill="#922b21"/>
        {/* Triangle bas droit - bleu acier */}
        <polygon points="78,55 64,50 50,67 78,67" fill="#1a5276"/>
        {/* Triangle bas - rouge/orange */}
        <polygon points="22,67 50,67 50,95 22,67" fill="#c0392b"/>
        <polygon points="78,67 50,95 50,67" fill="#2471a3"/>
        {/* Ombres pour donner le rendu 3D */}
        <polygon points="50,33 64,50 50,67" fill="rgba(0,0,0,0.08)"/>
        <polygon points="36,50 50,33 50,67" fill="rgba(255,255,255,0.12)"/>
      </svg>
      {showText && (
        <span style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: textSize,
          letterSpacing: '2px',
          color: '#111',
          lineHeight: 1,
          fontWeight: 400
        }}>R.COM</span>
      )}
    </div>
  );
}
