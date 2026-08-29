import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function RcomLogo({ size = 60, showText = true }) {
  const { darkMode } = useTheme();
  const width = showText ? Math.round(size * 3.2) : size;
  const height = size;

  return (
    <div
      role="img"
      aria-label="R.COM"
      style={{ width, height, display: 'block' }}
    >
      <img src="/icons/rcom-mark.svg" alt="" style={{ width:size, height:size, display:'block', float:'left' }} />
      {showText && <span style={{ display:'block', marginLeft:Math.round(size*1.18), paddingTop:Math.round(size*.2), fontFamily:"'Outfit',sans-serif", fontWeight:900, fontSize:Math.round(size*.53), letterSpacing:'-.055em', color:darkMode?'#f6f7fb':'#132038', lineHeight:1 }}>R<span style={{color:'#e0773f'}}>.</span>COM</span>}
    </div>
  );
}
