import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { getAllShops } from '../firebaseDb';
import { useTheme } from '../context/ThemeContext';

const DEFAULTS = [
  { id: 'market', name: 'R.COM Market', icon: '🛒', color: '#c0392b', available: true, description: 'Marketplace — électronique, mode, maison...', isDefault: true },
  { id: 'tech', name: 'R.COM Tech', icon: '💻', color: '#2980b9', available: false, description: 'Informatique, gadgets & services tech', isDefault: true },
  { id: 'delice', name: 'R.COM Délice', icon: '🍽️', color: '#e67e22', available: false, description: 'Restauration, traiteur & livraison repas', isDefault: true },
];

export default function BoutiquesPage() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, t } = useTheme();
  const [disciplines, setDisciplines] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const disciplinesRef = ref(db, 'disciplines');
    return onValue(disciplinesRef, snap => {
      if (!snap.exists()) { setDisciplines(DEFAULTS.filter(d => d.available)); return; }
      const fbMap = {};
      Object.values(snap.val()).forEach(value => { if (value.isDefault && value.id) fbMap[value.id] = value; });
      const merged = DEFAULTS.map(discipline => ({ ...discipline, ...(fbMap[discipline.id] || {}) }));
      setDisciplines(merged.filter(discipline => discipline.available));
    });
  }, []);

  useEffect(() => {
    getAllShops().then(next => {
      const active = next.filter(shop => shop.active)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }));
      setShops(active);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ ...s.page, background: t.bg }}>
      <header style={s.header}>
        <div>
          <h1 style={{ ...s.title, color: t.text }}>Boutiques R.COM</h1>
          <p style={{ ...s.sub, color: t.sub }}>Univers et boutiques disponibles.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 17, cursor: 'pointer', background: darkMode ? '#2a2a35' : '#f0f2f5', color: darkMode ? '#f5d76e' : '#555' }}
            onClick={toggleDarkMode}
            title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button style={{ ...s.secondary, background: t.cardBg, color: t.text, borderColor: t.border }} onClick={() => navigate('/')}>Accueil</button>
        </div>
      </header>

      {loading ? <p style={{ ...s.loading, color: t.sub }}>Chargement...</p> : (
        <>
          {disciplines.length > 0 && (
            <>
              <p style={{ ...s.sectionLabel, color: t.sub }}>Univers</p>
              <div style={s.grid}>
                {disciplines.map(discipline => (
                  <Link key={discipline.id} to={`/shop/${discipline.id}`} style={{ ...s.card, background: t.cardBg, color: t.text, borderLeft: `4px solid ${discipline.color}` }}>
                    <div style={{ ...s.icon, background: `linear-gradient(135deg, ${discipline.color}, ${discipline.color}aa)` }}>{discipline.icon}</div>
                    <div>
                      <h2 style={s.name}>{discipline.name}</h2>
                      {discipline.description && <p style={{ ...s.desc, color: t.sub }}>{discipline.description}</p>}
                    </div>
                    <span style={s.arrow}>Voir</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <p style={{ ...s.sectionLabel, color: t.sub }}>Boutiques</p>
          {shops.length === 0 ? <p style={{ ...s.loading, color: t.sub }}>Aucune boutique disponible.</p> : (
            <div style={s.grid}>
              {shops.map(shop => (
                <Link key={shop.id} to={`/boutique/${shop.id}`} style={{ ...s.card, background: t.cardBg, color: t.text }}>
                  {shop.imageUrl ? <img src={shop.imageUrl} alt="" style={s.logo} /> : <div style={s.icon}>🏪</div>}
                  <div>
                    <h2 style={s.name}>{shop.name}</h2>
                    <p style={{ ...s.owner, color: t.sub }}>par {shop.ownerName}</p>
                    {shop.description && <p style={{ ...s.desc, color: t.sub }}>{shop.description}</p>}
                  </div>
                  <span style={s.arrow}>Voir</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', padding: 18 },
  header: { maxWidth: 1000, margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0 },
  sub: { margin: '6px 0 0', fontSize: 14 },
  sectionLabel: { maxWidth: 1000, margin: '18px auto 8px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 },
  card: { borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.08)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, flexShrink: 0 },
  logo: { width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 },
  name: { margin: 0, fontSize: 17 },
  owner: { margin: '4px 0 0', fontSize: 13 },
  desc: { margin: '4px 0 0', fontSize: 12, lineHeight: 1.35 },
  arrow: { marginLeft: 'auto', color: '#c0392b', fontWeight: 900, fontSize: 13 },
  secondary: { border: '2px solid #eee', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  loading: { maxWidth: 1000, margin: '40px auto', textAlign: 'center' },
};
