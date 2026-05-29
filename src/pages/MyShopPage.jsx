import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addShopArticle,
  deleteShopArticle,
  getShop,
  listenShopArticles,
  updateShopArticle,
} from '../firebaseDb';

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  oldPrice: '',
  stock: '',
  imageUrl: '',
  isPromo: false,
};

function compress(file, max = 500) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MyShopPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [articles, setArticles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const shopId = profile?.shopId || user?.uid;

  useEffect(() => {
    if (!profile?.hasShop || !shopId) return;
    getShop(shopId).then(setShop);
    return listenShopArticles(shopId, setArticles);
  }, [profile?.hasShop, shopId]);

  const remaining = useMemo(() => (shop?.articleLimit || 15) - articles.length, [shop, articles.length]);

  if (!user) {
    return (
      <div style={s.center}>
        <h1 style={s.title}>Connexion requise</h1>
        <button style={s.primary} onClick={() => navigate('/login?returnTo=/ma-boutique')}>Se connecter</button>
      </div>
    );
  }

  if (!profile?.hasShop) {
    return (
      <div style={s.center}>
        <h1 style={s.title}>Ma boutique</h1>
        <p style={s.emptyText}>Ton compte n'est pas encore autorise a creer une boutique.</p>
        <button style={s.secondary} onClick={() => navigate('/')}>Retour a l'accueil</button>
      </div>
    );
  }

  const handleImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = await compress(file);
    setForm(prev => ({ ...prev, imageUrl }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.price) {
      alert('Nom et prix obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        stock: form.stock === '' ? 999 : Number(form.stock),
        imageUrl: form.imageUrl,
        images: form.imageUrl ? [form.imageUrl] : [],
        isPromo: !!form.isPromo,
      };
      if (editId) await updateShopArticle(shopId, editId, payload);
      else await addShopArticle(shopId, payload);
      setMessage(editId ? 'Article modifie.' : 'Article publie.');
      resetForm();
    } catch (error) {
      alert(error.message);
    }
    setSaving(false);
  };

  const edit = article => {
    setForm({
      name: article.name || '',
      description: article.description || '',
      category: article.category || '',
      price: article.price || '',
      oldPrice: article.oldPrice || '',
      stock: article.stock === 999 ? '' : article.stock || '',
      imageUrl: article.imageUrl || '',
      isPromo: !!article.isPromo,
    });
    setEditId(article.id);
    setShowForm(true);
  };

  const removeArticle = async article => {
    if (!window.confirm(`Supprimer "${article.name}" ?`)) return;
    await deleteShopArticle(shopId, article.id);
    setMessage('Article supprime.');
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>{shop?.name || 'Ma boutique'}</h1>
          <p style={s.sub}>{articles.length} / {shop?.articleLimit || 15} articles publies</p>
        </div>
        <div style={s.headerActions}>
          <button style={s.secondary} onClick={() => navigate(`/boutique/${shopId}`)}>Voir</button>
          <button
            style={s.primary}
            disabled={remaining <= 0 && !editId}
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setShowForm(prev => !prev);
            }}
          >
            {showForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>
      </header>

      {message && <div style={s.toast} onClick={() => setMessage('')}>{message}</div>}

      {remaining <= 0 && !editId && <p style={s.limitAlert}>Limite atteinte. Demande a l'admin d'augmenter ton nombre d'articles.</p>}

      {showForm && (
        <section style={s.form}>
          <h2 style={s.formTitle}>{editId ? 'Modifier l’article' : 'Nouvel article'}</h2>
          <input style={s.input} placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={s.input} placeholder="Categorie" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <input style={s.input} type="number" placeholder="Prix FCFA *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          <input style={s.input} type="number" placeholder="Ancien prix" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} />
          <input style={s.input} type="number" placeholder="Stock, vide = illimite" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
          <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <label style={s.check}>
            <input type="checkbox" checked={form.isPromo} onChange={e => setForm({ ...form, isPromo: e.target.checked })} />
            Mettre en promotion
          </label>
          <label style={s.upload}>
            {form.imageUrl ? <img src={form.imageUrl} alt="" style={s.preview} /> : <span>Ajouter une image</span>}
            <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
          </label>
          <button style={s.primary} onClick={submit} disabled={saving || (remaining <= 0 && !editId)}>
            {saving ? 'Publication...' : editId ? 'Enregistrer' : 'Publier'}
          </button>
        </section>
      )}

      <div style={s.grid}>
        {articles.map(article => (
          <article key={article.id} style={s.card}>
            {article.imageUrl ? <img src={article.imageUrl} alt={article.name} style={s.image} /> : <div style={s.imageEmpty}>Image</div>}
            <div style={s.cardBody}>
              <h2 style={s.name}>{article.name}</h2>
              <p style={s.price}>{Number(article.price).toLocaleString()} FCFA</p>
              {article.description && <p style={s.desc}>{article.description}</p>}
              <div style={s.cardActions}>
                <button style={s.secondary} onClick={() => edit(article)}>Modifier</button>
                <button style={s.danger} onClick={() => removeArticle(article)}>Supprimer</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', padding: 16 },
  header: { maxWidth: 1100, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerActions: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0, color: '#1a1a2e' },
  sub: { margin: '5px 0 0', color: '#777', fontSize: 14 },
  grid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 },
  card: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
  image: { width: '100%', height: 170, objectFit: 'cover', display: 'block' },
  imageEmpty: { height: 170, background: '#eceff3', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  cardBody: { padding: 14 },
  name: { margin: 0, fontSize: 16, color: '#222' },
  price: { margin: '8px 0', color: '#c0392b', fontWeight: 900 },
  desc: { color: '#666', fontSize: 13, lineHeight: 1.5 },
  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  form: { maxWidth: 560, margin: '0 auto 18px', background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
  formTitle: { margin: '0 0 12px', fontSize: 20 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 10, padding: '11px 13px', marginBottom: 10, fontFamily: "'Outfit',sans-serif" },
  check: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 700, color: '#555' },
  upload: { height: 150, border: '2px dashed #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12, color: '#999', cursor: 'pointer' },
  preview: { width: '100%', height: '100%', objectFit: 'cover' },
  primary: { background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  secondary: { background: 'white', color: '#444', border: '2px solid #eee', borderRadius: 12, padding: '9px 12px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  danger: { background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 18, textAlign: 'center' },
  emptyText: { color: '#666', maxWidth: 360, lineHeight: 1.6 },
  toast: { maxWidth: 1100, margin: '0 auto 14px', background: '#27ae60', color: 'white', borderRadius: 12, padding: '10px 14px', fontWeight: 800 },
  limitAlert: { maxWidth: 1100, margin: '0 auto 14px', background: '#fff4e5', color: '#9a5a00', borderRadius: 12, padding: '10px 14px', fontWeight: 800 },
};
