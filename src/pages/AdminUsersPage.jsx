import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_UID } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  authorizeShop,
  deleteUserShop,
  getAllShops,
  getAllUsers,
  updateShopName,
  updateShopOrderPhone,
  updateShopLimit,
} from '../firebaseDb';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState({});
  const [search, setSearch] = useState('');
  const [limits, setLimits] = useState({});
  const [phones, setPhones] = useState({});
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const [nextUsers, nextShops] = await Promise.all([getAllUsers(), getAllShops()]);
    const shopMap = {};
    nextShops.forEach(shop => {
      shopMap[shop.ownerUid || shop.id] = shop;
    });
    setUsers(nextUsers.sort((a, b) => (a.email || '').localeCompare(b.email || '')));
    setShops(shopMap);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(user =>
      `${user.name || ''} ${user.displayName || ''} ${user.email || ''}`.toLowerCase().includes(q)
    );
  }, [search, users]);

  if (!isAdmin) {
    return (
      <div style={s.center}>
        <h1 style={s.title}>Acces refuse</h1>
        <button style={s.primary} onClick={() => navigate('/')}>Retour</button>
      </div>
    );
  }

  const allowShop = async user => {
    await authorizeShop(user);
    setMessage(`Boutique autorisee pour ${user.name || user.email}`);
    await load();
  };

  const saveLimit = async uid => {
    await updateShopLimit(uid, limits[uid] || shops[uid]?.articleLimit || 15);
    setMessage('Limite mise a jour');
    await load();
  };

  const savePhone = async uid => {
    await updateShopOrderPhone(uid, phones[uid] ?? shops[uid]?.orderPhone ?? '');
    setMessage('Numero WhatsApp mis a jour');
    await load();
  };

  const saveName = async uid => {
    await updateShopName(uid, names[uid] ?? shops[uid]?.name ?? '');
    setMessage('Nom de boutique mis a jour');
    await load();
  };

  const removeShop = async user => {
    if (!window.confirm(`Supprimer la boutique de ${user.name || user.email} ?`)) return;
    await deleteUserShop(user.uid);
    setMessage('Boutique supprimee');
    await load();
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Gestion des comptes</h1>
          <p style={s.sub}>Autoriser les boutiques et regler les limites d'articles.</p>
        </div>
        <button style={s.secondary} onClick={() => navigate('/')}>Accueil</button>
      </header>

      {message && <div style={s.toast} onClick={() => setMessage('')}>{message}</div>}

      <input
        style={s.search}
        placeholder="Rechercher un compte..."
        value={search}
        onChange={event => setSearch(event.target.value)}
      />

      {loading ? (
        <p style={s.loading}>Chargement...</p>
      ) : (
        <div style={s.grid}>
          {filteredUsers.map(user => {
            const isAdminAccount = user.uid === ADMIN_UID;
            const shop = shops[user.uid];
            return (
              <article key={user.uid} style={{ ...s.card, borderColor: isAdminAccount ? '#c0392b' : '#eee' }}>
                <div style={s.userRow}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={s.avatar} />
                  ) : (
                    <div style={s.avatarFallback}>{(user.name || user.email || '?')[0].toUpperCase()}</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h2 style={s.name}>{user.name || user.displayName || 'Sans nom'}</h2>
                    <p style={s.email}>{user.email}</p>
                  </div>
                </div>

                {isAdminAccount ? (
                  <p style={s.adminNote}>Compte admin protege. Ses boutiques et articles ne sont pas modifiables ici.</p>
                ) : shop ? (
                  <div style={s.actions}>
                    <span style={s.badge}>Boutique active</span>
                    <div style={s.phoneRow}>
                      <span style={s.label}>Nom de la boutique</span>
                      <input
                        style={s.phoneInput}
                        value={names[user.uid] ?? shop.name ?? ''}
                        onChange={event => setNames(prev => ({ ...prev, [user.uid]: event.target.value }))}
                      />
                      <button style={s.smallPrimary} onClick={() => saveName(user.uid)}>Modifier le nom</button>
                    </div>
                    <div style={s.limitRow}>
                      <span style={s.label}>Limite</span>
                      <input
                        style={s.limitInput}
                        type="number"
                        min="1"
                        value={limits[user.uid] ?? shop.articleLimit ?? 15}
                        onChange={event => setLimits(prev => ({ ...prev, [user.uid]: event.target.value }))}
                      />
                      <button style={s.smallPrimary} onClick={() => saveLimit(user.uid)}>Modifier</button>
                    </div>
                    <div style={s.phoneRow}>
                      <span style={s.label}>WhatsApp commandes</span>
                      <input
                        style={s.phoneInput}
                        type="tel"
                        placeholder="Ex: 2250160672966"
                        value={phones[user.uid] ?? shop.orderPhone ?? ''}
                        onChange={event => setPhones(prev => ({ ...prev, [user.uid]: event.target.value }))}
                      />
                      <button style={s.smallPrimary} onClick={() => savePhone(user.uid)}>Enregistrer</button>
                    </div>
                    <button style={s.danger} onClick={() => removeShop(user)}>Supprimer la boutique</button>
                  </div>
                ) : (
                  <button style={s.primary} onClick={() => allowShop(user)}>Autoriser une boutique</button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', padding: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto 18px' },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0, color: '#1a1a2e' },
  sub: { margin: '6px 0 0', color: '#777', fontSize: 14 },
  search: { display: 'block', width: '100%', maxWidth: 1100, margin: '0 auto 18px', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 12, padding: '12px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, maxWidth: 1100, margin: '0 auto' },
  card: { background: 'white', border: '2px solid #eee', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  userRow: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarFallback: { width: 42, height: 42, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 },
  name: { margin: 0, fontSize: 16, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  email: { margin: '3px 0 0', color: '#777', fontSize: 13, wordBreak: 'break-all' },
  actions: { display: 'flex', flexDirection: 'column', gap: 10 },
  badge: { alignSelf: 'flex-start', background: '#e8f8e8', color: '#217a31', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 800 },
  shopName: { margin: 0, color: '#333', fontWeight: 700 },
  limitRow: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 },
  phoneRow: { display: 'grid', gridTemplateColumns: '1fr', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, color: '#666' },
  limitInput: { minWidth: 0, border: '2px solid #eee', borderRadius: 10, padding: 9, fontFamily: "'Outfit',sans-serif" },
  phoneInput: { width: '100%', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 10, padding: 9, fontFamily: "'Outfit',sans-serif" },
  primary: { background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  smallPrimary: { background: '#2980b9', color: 'white', border: 'none', borderRadius: 10, padding: '9px 10px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  secondary: { background: 'white', color: '#444', border: '2px solid #eee', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  danger: { background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 10, padding: 10, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  adminNote: { color: '#c0392b', background: '#fff4f1', borderRadius: 12, padding: 12, fontSize: 13, margin: 0 },
  loading: { textAlign: 'center', color: '#777' },
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
  toast: { maxWidth: 1100, margin: '0 auto 14px', background: '#27ae60', color: 'white', borderRadius: 12, padding: '10px 14px', fontWeight: 800 },
};
