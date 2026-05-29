import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildWhatsAppOrderLink, getShop, listenShopArticles } from '../firebaseDb';

export default function BoutiquePage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [articles, setArticles] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShop(shopId).then(next => {
      setShop(next);
      setLoading(false);
    });
    return listenShopArticles(shopId, setArticles);
  }, [shopId]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = article => {
    setCart(prev => {
      const existing = prev.find(item => item.id === article.id);
      if (existing) return prev.map(item => item.id === article.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { id: article.id, name: article.name, price: article.price, qty: 1 }];
    });
  };

  const sendOrder = () => {
    if (cart.length === 0) return;
    window.open(buildWhatsAppOrderLink(cart, shop?.name, shop?.orderPhone), '_blank');
    setCart([]);
  };

  if (loading) return <p style={s.loading}>Chargement...</p>;
  if (!shop) {
    return (
      <div style={s.center}>
        <h1 style={s.title}>Boutique introuvable</h1>
        <button style={s.secondary} onClick={() => navigate('/boutiques')}>Retour</button>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>{shop.name}</h1>
          <p style={s.sub}>par {shop.ownerName}</p>
        </div>
        <button style={s.secondary} onClick={() => navigate('/boutiques')}>Boutiques</button>
      </header>

      {articles.length === 0 ? (
        <p style={s.loading}>Aucun article pour le moment.</p>
      ) : (
        <div style={s.grid}>
          {articles.map(article => (
            <article key={article.id} style={{ ...s.card, opacity: article.stock === 0 ? 0.55 : 1 }}>
              {article.imageUrl ? <img src={article.imageUrl} alt={article.name} style={s.image} /> : <div style={s.imageEmpty}>Image</div>}
              <div style={s.cardBody}>
                <h2 style={s.name}>{article.name}</h2>
                {article.description && <p style={s.desc}>{article.description}</p>}
                <p style={s.price}>{Number(article.price).toLocaleString()} FCFA</p>
                <button style={s.primary} disabled={article.stock === 0} onClick={() => addToCart(article)}>
                  {article.stock === 0 ? 'Rupture' : 'Ajouter au panier'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div style={s.cartBar}>
          <div>
            <strong>{cart.reduce((sum, item) => sum + item.qty, 0)} article(s)</strong>
            <p style={s.cartTotal}>{total.toLocaleString()} FCFA</p>
          </div>
          <button style={s.whatsapp} onClick={sendOrder}>Commander via WhatsApp</button>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', padding: '16px 16px 110px' },
  header: { maxWidth: 1100, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0, color: '#1a1a2e' },
  sub: { margin: '6px 0 0', color: '#777', fontSize: 14 },
  grid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 },
  card: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
  image: { width: '100%', height: 170, objectFit: 'cover', display: 'block' },
  imageEmpty: { height: 170, background: '#eceff3', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  cardBody: { padding: 14 },
  name: { margin: 0, fontSize: 16, color: '#222' },
  desc: { color: '#666', fontSize: 13, lineHeight: 1.5, minHeight: 34 },
  price: { color: '#c0392b', fontWeight: 900 },
  primary: { width: '100%', background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  secondary: { background: 'white', color: '#444', border: '2px solid #eee', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  loading: { margin: '40px auto', textAlign: 'center', color: '#777' },
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
  cartBar: { position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 520, background: 'white', borderRadius: 18, boxShadow: '0 10px 32px rgba(0,0,0,0.22)', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cartTotal: { margin: '4px 0 0', color: '#c0392b', fontWeight: 900 },
  whatsapp: { background: '#25D366', color: 'white', border: 'none', borderRadius: 12, padding: '12px 14px', fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
};
