// pages/Shops.jsx
// Page publique : liste toutes les boutiques autorisées
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllShops } from '../firebase/db';
import styles from './Shops.module.css';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllShops().then(s => {
      setShops(s.filter(sh => sh.active));
      setLoading(false);
    });
  }, []);

  if (loading) return <p className={styles.loading}>Chargement des boutiques...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🏪 Les Boutiques R.COM</h1>
      {shops.length === 0 ? (
        <p className={styles.empty}>Aucune boutique disponible pour l'instant.</p>
      ) : (
        <div className={styles.grid}>
          {shops.map(s => (
            <Link key={s.id} to={`/boutique/${s.id}`} className={styles.card}>
              <div className={styles.icon}>🏪</div>
              <div>
                <p className={styles.shopName}>{s.name}</p>
                <p className={styles.owner}>par {s.ownerName}</p>
              </div>
              <span className={styles.arrow}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
