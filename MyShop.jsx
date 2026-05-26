// pages/MyShop.jsx
// Page du propriétaire de boutique : gère ses articles (dans sa limite)
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getShop,
  listenShopArticles,
  addShopArticle,
  updateShopArticle,
  deleteShopArticle,
  buildWhatsAppOrderLink,
} from '../firebase/db';
import { storage } from '../firebase/config';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from './MyShop.module.css';

const EMPTY = { name: '', description: '', price: '', promo: '', stock: '', imageUrl: '' };

export default function MyShop() {
  const { profile } = useAuth();
  const [shop, setShop]       = useState(null);
  const [articles, setArticles] = useState([]);
  const [form, setForm]       = useState(EMPTY);
  const [editing, setEditing] = useState(null); // articleId en cours d'édition
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]         = useState('');
  const [msg, setMsg]         = useState('');
  const fileRef = useRef();

  const shopId = profile?.shopId;

  useEffect(() => {
    if (!shopId) return;
    getShop(shopId).then(setShop);
    const unsub = listenShopArticles(shopId, setArticles);
    return unsub;
  }, [shopId]);

  if (!profile?.hasShop) {
    return (
      <div className={styles.empty}>
        <span>🏪</span>
        <p>Tu n'as pas encore de boutique autorisée.<br />Contacte l'admin R.COM.</p>
      </div>
    );
  }

  const remaining = (shop?.articleLimit ?? 15) - articles.length;

  async function handleImageUpload(file) {
    if (!file) return;
    setUploading(true);
    const path = `shopArticles/${shopId}/${Date.now()}_${file.name}`;
    const snap = await uploadBytes(sRef(storage, path), file);
    const url  = await getDownloadURL(snap.ref);
    setForm(p => ({ ...p, imageUrl: url }));
    setUploading(false);
  }

  async function handleSubmit() {
    if (!form.name || !form.price) { setErr('Nom et prix requis.'); return; }
    setErr('');
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        promo: form.promo ? parseFloat(form.promo) : null,
        stock: form.stock === '' ? null : parseInt(form.stock, 10),
        imageUrl: form.imageUrl || '',
        shopId,
      };
      if (editing) {
        await updateShopArticle(shopId, editing, data);
        setMsg('✅ Article modifié.');
      } else {
        await addShopArticle(shopId, data);
        setMsg('✅ Article ajouté.');
      }
      setForm(EMPTY);
      setEditing(null);
      setShowForm(false);
    } catch (e) {
      setErr(e.message);
    }
  }

  function startEdit(a) {
    setForm({
      name: a.name,
      description: a.description || '',
      price: String(a.price),
      promo: a.promo != null ? String(a.promo) : '',
      stock: a.stock != null ? String(a.stock) : '',
      imageUrl: a.imageUrl || '',
    });
    setEditing(a.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(a) {
    if (!confirm(`Supprimer "${a.name}" ?`)) return;
    await deleteShopArticle(shopId, a.id);
    setMsg('🗑️ Article supprimé.');
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{shop?.name || 'Ma Boutique'}</h1>
          <p className={styles.sub}>
            {articles.length} / {shop?.articleLimit ?? 15} articles
            {remaining > 0
              ? <span className={styles.ok}> · {remaining} emplacements libres</span>
              : <span className={styles.warn}> · Limite atteinte</span>
            }
          </p>
        </div>
        <button
          className={styles.btnAdd}
          onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(p => !p); }}
          disabled={remaining <= 0 && !editing}
        >
          {showForm ? '✕ Annuler' : '+ Ajouter'}
        </button>
      </div>

      {msg && <div className={styles.toast} onClick={() => setMsg('')}>{msg}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <h2>{editing ? '✏️ Modifier l\'article' : '🆕 Nouvel article'}</h2>

          {err && <p className={styles.err}>{err}</p>}

          <label>Nom *</label>
          <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: T-shirt Rouge" />

          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="Description..." />

          <div className={styles.row}>
            <div>
              <label>Prix (FCFA) *</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm(p=>({...p,price:e.target.value}))} placeholder="5000" />
            </div>
            <div>
              <label>Prix promo</label>
              <input type="number" min="0" value={form.promo} onChange={e => setForm(p=>({...p,promo:e.target.value}))} placeholder="4000" />
            </div>
            <div>
              <label>Stock</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm(p=>({...p,stock:e.target.value}))} placeholder="Illimité si vide" />
            </div>
          </div>

          <label>Image</label>
          <div className={styles.imageRow}>
            {form.imageUrl && <img src={form.imageUrl} alt="" className={styles.thumb} />}
            <button className={styles.btnUpload} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '⏳ Upload...' : '📷 Choisir une image'}
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleImageUpload(e.target.files[0])}
            />
          </div>

          <button className={styles.btnSave} onClick={handleSubmit}>
            {editing ? '💾 Enregistrer' : '✅ Publier l\'article'}
          </button>
        </div>
      )}

      {articles.length === 0 ? (
        <p className={styles.noArticles}>Aucun article. Commence par en ajouter un !</p>
      ) : (
        <div className={styles.grid}>
          {articles.map(a => (
            <div key={a.id} className={styles.articleCard}>
              {a.imageUrl && <img src={a.imageUrl} alt={a.name} className={styles.img} />}
              <div className={styles.articleInfo}>
                <p className={styles.articleName}>{a.name}</p>
                <div className={styles.priceRow}>
                  {a.promo
                    ? <>
                        <span className={styles.promo}>{a.promo.toLocaleString()} FCFA</span>
                        <span className={styles.oldPrice}>{a.price.toLocaleString()} FCFA</span>
                      </>
                    : <span className={styles.price}>{a.price.toLocaleString()} FCFA</span>
                  }
                  {a.stock === 0 && <span className={styles.rupture}>Rupture</span>}
                </div>
                {a.description && <p className={styles.desc}>{a.description}</p>}
              </div>
              <div className={styles.articleActions}>
                <button className={styles.btnEdit} onClick={() => startEdit(a)}>✏️</button>
                <button className={styles.btnDel}  onClick={() => handleDelete(a)}>🗑️</button>
                <a
                  href={buildWhatsAppOrderLink([{ name: a.name, qty: 1, price: a.promo ?? a.price }], shop?.name)}
                  target="_blank" rel="noreferrer"
                  className={styles.btnOrder}
                >
                  🛒 Commander
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
