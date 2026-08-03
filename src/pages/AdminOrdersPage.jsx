import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllOrders } from '../firebaseDb';

export default function AdminOrdersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getAllOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div style={s.page}>
        <p style={{ padding: 24 }}>Accès réservé à l'administrateur.</p>
        <button style={s.backBtn} onClick={() => navigate('/')}>← Retour</button>
      </div>
    );
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      o.buyerName?.toLowerCase().includes(q) ||
      o.shopName?.toLowerCase().includes(q) ||
      o.items?.some(it => it.name?.toLowerCase().includes(q))
    );
  });

  const grandTotal = filtered.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>←</button>
        <h1 style={s.title}>📦 Commandes</h1>
        <div style={{ width: 32 }} />
      </header>

      <div style={s.searchWrap}>
        <input
          style={s.searchInput}
          placeholder="Rechercher un client, une boutique, un article..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={s.summary}>
        <span>{filtered.length} commande{filtered.length > 1 ? 's' : ''}</span>
        <span style={{ fontWeight: 800, color: '#c0392b' }}>{grandTotal.toLocaleString()} FCFA au total</span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p>Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div style={s.list}>
          {filtered.map(o => (
            <div key={o.id} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <p style={s.buyer}>{o.buyerName || 'Client'}</p>
                  {o.buyerEmail && <p style={s.email}>{o.buyerEmail}</p>}
                </div>
                <span style={s.shopTag}>{o.shopName || o.shopId}</span>
              </div>
              <div style={s.items}>
                {(o.items || []).map((it, i) => (
                  <div key={i} style={s.itemRow}>
                    <span>{it.name} <span style={{ color: '#aaa' }}>x{it.qty}</span></span>
                    <span>{(it.price * it.qty).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
              <div style={s.cardFooter}>
                <span style={s.date}>{o.createdAt ? new Date(o.createdAt).toLocaleString('fr-FR') : ''}</span>
                <span style={s.total}>{(o.total || 0).toLocaleString()} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', paddingBottom: 40 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#333' },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1, margin: 0, color: '#c0392b' },
  searchWrap: { padding: '14px 16px 0' },
  searchInput: { width: '100%', padding: '11px 14px', border: '2px solid #eee', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Outfit',sans-serif" },
  summary: { display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 13, color: '#666', fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px', maxWidth: 700, margin: '0 auto' },
  card: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 3px 12px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  buyer: { fontWeight: 700, fontSize: 15, margin: 0 },
  email: { fontSize: 12, color: '#999', margin: '2px 0 0' },
  shopTag: { background: '#fdecea', color: '#c0392b', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' },
  items: { borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: '8px 0', margin: '8px 0' },
  itemRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#444' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#aaa' },
  total: { fontWeight: 800, color: '#c0392b', fontSize: 15 },
};
