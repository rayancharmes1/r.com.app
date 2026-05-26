// pages/AdminUsers.jsx
// Page admin : liste tous les comptes, autorise/révoque les boutiques, gère les limites
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getAllUsers, getAllShops, createShop, deleteShop,
  updateShopLimit, ADMIN_UID
} from '../firebase/db';
import styles from './AdminUsers.module.css';

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers]   = useState([]);
  const [shops, setShops]   = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [limitInputs, setLimitInputs] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [u, s] = await Promise.all([getAllUsers(), getAllShops()]);
      setUsers(u);
      const shopMap = {};
      s.forEach(sh => { shopMap[sh.ownerUid] = sh; });
      setShops(shopMap);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (!isAdmin) return <p className={styles.denied}>Accès refusé.</p>;

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAuthorize(u) {
    await createShop(u.uid, u.email, u.displayName || u.email);
    const s = await getAllShops();
    const map = {};
    s.forEach(sh => { map[sh.ownerUid] = sh; });
    setShops(map);
    setMsg(`✅ Boutique créée pour ${u.displayName || u.email}`);
  }

  async function handleRevoke(u) {
    if (!confirm(`Supprimer la boutique de ${u.displayName} ? Cette action est irréversible.`)) return;
    await deleteShop(u.uid);
    const s = await getAllShops();
    const map = {};
    s.forEach(sh => { map[sh.ownerUid] = sh; });
    setShops(map);
    setMsg(`🗑️ Boutique de ${u.displayName} supprimée.`);
  }

  async function handleLimitChange(uid) {
    const val = parseInt(limitInputs[uid], 10);
    if (isNaN(val) || val < 1) return;
    await updateShopLimit(uid, val);
    setShops(prev => ({
      ...prev,
      [uid]: { ...prev[uid], articleLimit: val }
    }));
    setMsg(`✅ Limite mise à jour : ${val} articles`);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>👥 Gestion des comptes</h1>

      {msg && (
        <div className={styles.toast} onClick={() => setMsg('')}>{msg}</div>
      )}

      <input
        className={styles.search}
        placeholder="Rechercher un compte..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <p className={styles.loading}>Chargement...</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map(u => {
            const isAdminAcc = u.uid === ADMIN_UID;
            const shop = shops[u.uid];
            return (
              <div key={u.uid} className={`${styles.card} ${isAdminAcc ? styles.adminCard : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt="" />
                      : <span>{(u.displayName || u.email || '?')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.info}>
                    <p className={styles.name}>{u.displayName || '—'}</p>
                    <p className={styles.email}>{u.email}</p>
                    {isAdminAcc && <span className={styles.badge}>ADMIN</span>}
                    {shop && !isAdminAcc && <span className={styles.shopBadge}>Boutique active</span>}
                  </div>
                </div>

                {!isAdminAcc && (
                  <div className={styles.actions}>
                    {!shop ? (
                      <button className={styles.btnGreen} onClick={() => handleAuthorize(u)}>
                        🏪 Autoriser une boutique
                      </button>
                    ) : (
                      <>
                        <div className={styles.limitRow}>
                          <span>Limite articles :</span>
                          <strong>{shop.articleLimit}</strong>
                          <input
                            type="number"
                            min="1"
                            placeholder="Nouvelle limite"
                            value={limitInputs[u.uid] || ''}
                            onChange={e => setLimitInputs(p => ({ ...p, [u.uid]: e.target.value }))}
                            className={styles.limitInput}
                          />
                          <button
                            className={styles.btnBlue}
                            onClick={() => handleLimitChange(u.uid)}
                          >
                            ✏️ Modifier
                          </button>
                        </div>
                        <button className={styles.btnRed} onClick={() => handleRevoke(u)}>
                          🗑️ Supprimer la boutique
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
