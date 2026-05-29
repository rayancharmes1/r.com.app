import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllShops } from '../firebaseDb';

export default function BoutiquesPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllShops().then(next => {
      setShops(next.filter(shop => shop.active));
      setLoading(false);
    });
  }, []);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Boutiques R.COM</h1>
          <p style={s.sub}>Les boutiques autorisees par l'admin.</p>
        </div>
        <button style={s.secondary} onClick={() => navigate('/')}>Accueil</button>
      </header>

      {loading ? <p style={s.loading}>Chargement...</p> : (
        shops.length === 0 ? <p style={s.loading}>Aucune boutique disponible.</p> : (
          <div style={s.grid}>
            {shops.map(shop => (
              <Link key={shop.id} to={`/boutique/${shop.id}`} style={s.card}>
                <div style={s.icon}>R</div>
                <div>
                  <h2 style={s.name}>{shop.name}</h2>
                  <p style={s.owner}>par {shop.ownerName}</p>
                </div>
                <span style={s.arrow}>Voir</span>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', padding: 18 },
  header: { maxWidth: 1000, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0, color: '#1a1a2e' },
  sub: { margin: '6px 0 0', color: '#777', fontSize: 14 },
  grid: { maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 },
  card: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.08)', textDecoration: 'none', color: '#222', display: 'flex', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 },
  name: { margin: 0, fontSize: 17 },
  owner: { margin: '4px 0 0', color: '#777', fontSize: 13 },
  arrow: { marginLeft: 'auto', color: '#c0392b', fontWeight: 900, fontSize: 13 },
  secondary: { background: 'white', color: '#444', border: '2px solid #eee', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  loading: { maxWidth: 1000, margin: '40px auto', color: '#777', textAlign: 'center' },
};
