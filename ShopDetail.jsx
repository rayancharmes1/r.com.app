// pages/ShopDetail.jsx
// Page publique d'une boutique individuelle
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShop, listenShopArticles, buildWhatsAppOrderLink } from '../firebase/db';
import styles from './ShopDetail.module.css';

export default function ShopDetail() {
  const { shopId } = useParams();
  const [shop, setShop]         = useState(null);
  const [articles, setArticles] = useState([]);
  const [cart, setCart]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getShop(shopId).then(s => { setShop(s); setLoading(false); });
    const unsub = listenShopArticles(shopId, setArticles);
    return unsub;
  }, [shopId]);

  function addToCart(a) {
    setCart(prev => {
      const existing = prev.find(x => x.id === a.id);
      if (existing) return prev.map(x => x.id === a.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { id: a.id, name: a.name, price: a.promo ?? a.price, qty: 1 }];
    });
  }

  function sendOrder() {
    if (cart.length === 0) return;
    window.open(buildWhatsAppOrderLink(cart, shop?.name), '_blank');
  }

  if (loading) return <p className={styles.loading}>Chargement...</p>;
  if (!shop)   return <p className={styles.loading}>Boutique introuvable.</p>;

  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);

  return (
    <div className={styles.container}>
      <div className={styles.shopHeader}>
        <span className={styles.shopIcon}>🏪</span>
        <div>
          <h1 className={styles.shopName}>{shop.name}</h1>
          <p className={styles.shopOwner}>par {shop.ownerName}</p>
        </div>
      </div>

      {articles.length === 0 ? (
        <p className={styles.empty}>Aucun article pour l'instant.</p>
      ) : (
        <div className={styles.grid}>
          {articles.map(a => (
            <div key={a.id} className={`${styles.card} ${a.stock === 0 ? styles.outOfStock : ''}`}>
              {a.imageUrl && <img src={a.imageUrl} alt={a.name} className={styles.img} />}
              <div className={styles.info}>
                <p className={styles.name}>{a.name}</p>
                {a.description && <p className={styles.desc}>{a.description}</p>}
                <div className={styles.priceRow}>
                  {a.promo
                    ? <>
                        <span className={styles.promo}>{a.promo.toLocaleString()} FCFA</span>
                        <span className={styles.old}>{a.price.toLocaleString()} FCFA</span>
                      </>
                    : <span className={styles.price}>{a.price.toLocaleString()} FCFA</span>
                  }
                  {a.stock === 0 && <span className={styles.rupture}>Rupture de stock</span>}
                </div>
              </div>
              <button
                className={styles.btnAdd}
                onClick={() => addToCart(a)}
                disabled={a.stock === 0}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className={styles.cartBar}>
          <div className={styles.cartInfo}>
            <span>🛒 {cart.reduce((s,x)=>s+x.qty,0)} article(s)</span>
            <strong>{total.toLocaleString()} FCFA</strong>
          </div>
          <button className={styles.btnOrder} onClick={sendOrder}>
            Commander via WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
