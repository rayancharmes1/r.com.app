import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_UID } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  addShopArticle,
  authorizeShop,
  deleteShopArticle,
  deleteUserShop,
  getAllShops,
  getAllUsers,
  listenShopArticles,
  updateShopArticle,
  updateShopDetails,
  updateShopLimit,
  updateShopOrderPhone,
} from '../firebaseDb';

const emptyArticle = {
  name: '',
  description: '',
  category: '',
  price: '',
  oldPrice: '',
  stock: '',
  images: [],
  isPromo: false,
};

function compressImage(file, max = 700) {
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState({});
  const [shopForms, setShopForms] = useState({});
  const [search, setSearch] = useState('');
  const [limits, setLimits] = useState({});
  const [phones, setPhones] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [articles, setArticles] = useState([]);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [editArticleId, setEditArticleId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState({});

  const load = async () => {
    setLoading(true);
    const [nextUsers, nextShops] = await Promise.all([getAllUsers(), getAllShops()]);
    const shopMap = {};
    const forms = {};
    nextShops.forEach(shop => {
      const key = shop.ownerUid || shop.id;
      shopMap[key] = shop;
      forms[key] = {
        name: shop.name || '',
        description: shop.description || '',
        imageUrl: shop.imageUrl || '',
        bannerUrl: shop.bannerUrl || '',
        orderPhone: shop.orderPhone || '',
        active: shop.active !== false,
      };
    });
    setUsers(nextUsers.sort((a, b) => (a.email || '').localeCompare(b.email || '')));
    setShops(shopMap);
    setShopForms(forms);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedShopId) return undefined;
    return listenShopArticles(selectedShopId, setArticles);
  }, [selectedShopId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(user =>
      `${user.name || ''} ${user.displayName || ''} ${user.email || ''}`.toLowerCase().includes(q)
    );
  }, [search, users]);

  const selectedShop = selectedShopId ? shops[selectedShopId] : null;
  const selectedForm = selectedShopId ? shopForms[selectedShopId] : null;

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

  const updateShopForm = (uid, patch) => {
    setShopForms(prev => ({ ...prev, [uid]: { ...(prev[uid] || {}), ...patch } }));
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

  const saveShop = async uid => {
    await updateShopDetails(uid, shopForms[uid] || shops[uid] || {});
    setMessage('Boutique mise a jour');
    await load();
  };

  const toggleShop = async uid => {
    const current = shopForms[uid]?.active ?? shops[uid]?.active !== false;
    updateShopForm(uid, { active: !current });
    await updateShopDetails(uid, { ...(shopForms[uid] || shops[uid] || {}), active: !current });
    setMessage(!current ? 'Boutique activee' : 'Boutique masquee');
    await load();
  };

  const handleShopImage = async (uid, field, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const key = `${uid}-${field}`;
    setPhotoSaving(prev => ({ ...prev, [key]: true }));
    try {
      const image = await compressImage(file, 900);
      const nextForm = { ...(shopForms[uid] || shops[uid] || {}), [field]: image };
      updateShopForm(uid, { [field]: image });
      await updateShopDetails(uid, nextForm);
      setMessage(field === 'imageUrl' ? 'Logo de boutique enregistre' : 'Banniere de boutique enregistree');
      await load();
    } catch (error) {
      alert(error.message);
    }
    setPhotoSaving(prev => ({ ...prev, [key]: false }));
  };

  const removeShop = async user => {
    if (!window.confirm(`Supprimer la boutique de ${user.name || user.email} ?`)) return;
    await deleteUserShop(user.uid);
    if (selectedShopId === user.uid) setSelectedShopId(null);
    setMessage('Boutique supprimee');
    await load();
  };

  const openArticles = uid => {
    setSelectedShopId(uid);
    setArticleForm(emptyArticle);
    setEditArticleId(null);
  };

  const handleArticleImages = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const nextImages = await Promise.all(files.slice(0, 6).map(file => compressImage(file, 800)));
    setArticleForm(prev => ({ ...prev, images: [...(prev.images || []), ...nextImages].slice(0, 6) }));
  };

  const submitArticle = async () => {
    if (!selectedShopId || !articleForm.name.trim() || !articleForm.price) {
      alert('Nom et prix obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const images = articleForm.images || [];
      const payload = {
        name: articleForm.name.trim(),
        description: articleForm.description.trim(),
        category: articleForm.category.trim(),
        price: Number(articleForm.price),
        oldPrice: articleForm.oldPrice ? Number(articleForm.oldPrice) : null,
        stock: articleForm.stock === '' ? 999 : Number(articleForm.stock),
        imageUrl: images[0] || '',
        images,
        isPromo: !!articleForm.isPromo,
      };
      if (editArticleId) await updateShopArticle(selectedShopId, editArticleId, payload);
      else await addShopArticle(selectedShopId, payload);
      setArticleForm(emptyArticle);
      setEditArticleId(null);
      setMessage(editArticleId ? 'Article modifie' : 'Article ajoute');
    } catch (error) {
      alert(error.message);
    }
    setSaving(false);
  };

  const editArticle = article => {
    setArticleForm({
      name: article.name || '',
      description: article.description || '',
      category: article.category || '',
      price: article.price || '',
      oldPrice: article.oldPrice || '',
      stock: article.stock === 999 ? '' : article.stock || '',
      images: article.images || (article.imageUrl ? [article.imageUrl] : []),
      isPromo: !!article.isPromo,
    });
    setEditArticleId(article.id);
  };

  const removeArticle = async article => {
    if (!window.confirm(`Supprimer "${article.name}" ?`)) return;
    await deleteShopArticle(selectedShopId, article.id);
    setMessage('Article supprime');
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Gestion des comptes</h1>
          <p style={s.sub}>Controle complet des boutiques, photos et articles vendeurs.</p>
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
            const form = shopForms[user.uid] || {};
            const active = form.active ?? shop?.active !== false;
            const logoSaving = !!photoSaving[`${user.uid}-imageUrl`];
            const bannerSaving = !!photoSaving[`${user.uid}-bannerUrl`];
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
                  <p style={s.adminNote}>Compte admin protege.</p>
                ) : shop ? (
                  <div style={s.actions}>
                    <div style={s.statusRow}>
                      <span style={{ ...s.badge, background: active ? '#e8f8e8' : '#f2f2f2', color: active ? '#217a31' : '#777' }}>
                        {active ? 'Boutique visible' : 'Boutique masquee'}
                      </span>
                      <button style={s.smallSecondary} onClick={() => toggleShop(user.uid)}>{active ? 'Masquer' : 'Activer'}</button>
                    </div>

                    <input
                      style={s.input}
                      placeholder="Nom de boutique"
                      value={form.name ?? shop.name ?? ''}
                      onChange={event => updateShopForm(user.uid, { name: event.target.value })}
                    />
                    <textarea
                      style={{ ...s.input, minHeight: 66, resize: 'vertical' }}
                      placeholder="Description de la boutique"
                      value={form.description ?? shop.description ?? ''}
                      onChange={event => updateShopForm(user.uid, { description: event.target.value })}
                    />

                    <div style={s.photoRow}>
                      <label style={s.photoBox}>
                        {logoSaving ? <span>Enregistrement...</span> : form.imageUrl ? <img src={form.imageUrl} alt="" style={s.photoPreview} /> : <span>Logo boutique</span>}
                        <input type="file" accept="image/*" onChange={event => handleShopImage(user.uid, 'imageUrl', event)} style={{ display: 'none' }} />
                      </label>
                      <label style={s.photoBox}>
                        {bannerSaving ? <span>Enregistrement...</span> : form.bannerUrl ? <img src={form.bannerUrl} alt="" style={s.photoPreview} /> : <span>Banniere</span>}
                        <input type="file" accept="image/*" onChange={event => handleShopImage(user.uid, 'bannerUrl', event)} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <p style={s.helpText}>Les photos sont enregistrees automatiquement apres selection.</p>

                    <div style={s.limitRow}>
                      <span style={s.label}>Limite</span>
                      <input
                        style={s.limitInput}
                        type="number"
                        min="1"
                        value={limits[user.uid] ?? shop.articleLimit ?? 15}
                        onChange={event => setLimits(prev => ({ ...prev, [user.uid]: event.target.value }))}
                      />
                      <button style={s.smallPrimary} onClick={() => saveLimit(user.uid)}>OK</button>
                    </div>
                    <div style={s.phoneRow}>
                      <span style={s.label}>WhatsApp commandes</span>
                      <input
                        style={s.phoneInput}
                        type="tel"
                        placeholder="Ex: 2250160672966"
                        value={phones[user.uid] ?? form.orderPhone ?? shop.orderPhone ?? ''}
                        onChange={event => {
                          setPhones(prev => ({ ...prev, [user.uid]: event.target.value }));
                          updateShopForm(user.uid, { orderPhone: event.target.value });
                        }}
                      />
                      <button style={s.smallPrimary} onClick={() => savePhone(user.uid)}>OK</button>
                    </div>
                    <button style={s.primary} onClick={() => saveShop(user.uid)}>Enregistrer la boutique</button>
                    <button style={s.secondary} onClick={() => openArticles(user.uid)}>Gerer articles et photos</button>
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

      {selectedShop && (
        <div style={s.overlay}>
          <section style={s.modal}>
            <div style={s.modalHead}>
              <div>
                <h2 style={s.modalTitle}>{selectedShop.name}</h2>
                <p style={s.sub}>{articles.length} article(s)</p>
              </div>
              <button style={s.secondary} onClick={() => setSelectedShopId(null)}>Fermer</button>
            </div>

            <div style={s.formGrid}>
              <input style={s.input} placeholder="Nom *" value={articleForm.name} onChange={e => setArticleForm({ ...articleForm, name: e.target.value })} />
              <input style={s.input} placeholder="Categorie" value={articleForm.category} onChange={e => setArticleForm({ ...articleForm, category: e.target.value })} />
              <input style={s.input} type="number" placeholder="Prix FCFA *" value={articleForm.price} onChange={e => setArticleForm({ ...articleForm, price: e.target.value })} />
              <input style={s.input} type="number" placeholder="Ancien prix" value={articleForm.oldPrice} onChange={e => setArticleForm({ ...articleForm, oldPrice: e.target.value })} />
              <input style={s.input} type="number" placeholder="Stock, vide = illimite" value={articleForm.stock} onChange={e => setArticleForm({ ...articleForm, stock: e.target.value })} />
              <label style={s.check}>
                <input type="checkbox" checked={articleForm.isPromo} onChange={e => setArticleForm({ ...articleForm, isPromo: e.target.checked })} />
                Promotion
              </label>
            </div>
            <textarea style={{ ...s.input, minHeight: 78, resize: 'vertical' }} placeholder="Description" value={articleForm.description} onChange={e => setArticleForm({ ...articleForm, description: e.target.value })} />

            <div style={s.articlePhotos}>
              {(articleForm.images || []).map((image, index) => (
                <div key={`${image}-${index}`} style={s.thumb}>
                  <img src={image} alt="" style={s.thumbImg} />
                  <button
                    style={s.thumbRemove}
                    onClick={() => setArticleForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                  >
                    x
                  </button>
                </div>
              ))}
              <label style={s.addPhoto}>
                <span>+ Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleArticleImages} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={s.modalActions}>
              <button style={s.primary} onClick={submitArticle} disabled={saving}>{saving ? 'Enregistrement...' : editArticleId ? 'Modifier article' : 'Ajouter article'}</button>
              {editArticleId && <button style={s.secondary} onClick={() => { setEditArticleId(null); setArticleForm(emptyArticle); }}>Annuler edition</button>}
            </div>

            <div style={s.articleGrid}>
              {articles.map(article => (
                <article key={article.id} style={s.articleCard}>
                  {article.imageUrl ? <img src={article.imageUrl} alt={article.name} style={s.articleImage} /> : <div style={s.imageEmpty}>Image</div>}
                  <div style={s.cardBody}>
                    <h3 style={s.articleName}>{article.name}</h3>
                    <p style={s.price}>{Number(article.price || 0).toLocaleString()} FCFA</p>
                    <div style={s.cardActions}>
                      <button style={s.secondary} onClick={() => editArticle(article)}>Modifier</button>
                      <button style={s.danger} onClick={() => removeArticle(article)}>Supprimer</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', padding: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, maxWidth: 1180, margin: '0 auto 18px' },
  title: { fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 1, margin: 0, color: '#1a1a2e' },
  sub: { margin: '6px 0 0', color: '#777', fontSize: 14 },
  search: { display: 'block', width: '100%', maxWidth: 1180, margin: '0 auto 18px', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 12, padding: '12px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 14, maxWidth: 1180, margin: '0 auto' },
  card: { background: 'white', border: '2px solid #eee', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  userRow: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarFallback: { width: 42, height: 42, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 },
  name: { margin: 0, fontSize: 16, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  email: { margin: '3px 0 0', color: '#777', fontSize: 13, wordBreak: 'break-all' },
  actions: { display: 'flex', flexDirection: 'column', gap: 10 },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 800 },
  limitRow: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 },
  phoneRow: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, color: '#666', gridColumn: '1 / -1' },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: "'Outfit',sans-serif" },
  limitInput: { minWidth: 0, border: '2px solid #eee', borderRadius: 10, padding: 9, fontFamily: "'Outfit',sans-serif" },
  phoneInput: { width: '100%', boxSizing: 'border-box', border: '2px solid #eee', borderRadius: 10, padding: 9, fontFamily: "'Outfit',sans-serif" },
  photoRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  photoBox: { height: 94, border: '2px dashed #ddd', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#999', fontWeight: 800, cursor: 'pointer' },
  photoPreview: { width: '100%', height: '100%', objectFit: 'cover' },
  helpText: { margin: '-4px 0 0', color: '#777', fontSize: 12, lineHeight: 1.35 },
  primary: { background: 'linear-gradient(135deg,#c0392b,#e67e22)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  smallPrimary: { background: '#2980b9', color: 'white', border: 'none', borderRadius: 10, padding: '9px 10px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  smallSecondary: { background: '#f0f2f5', color: '#444', border: 'none', borderRadius: 10, padding: '8px 10px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  secondary: { background: 'white', color: '#444', border: '2px solid #eee', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  danger: { background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 10, padding: 10, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" },
  adminNote: { color: '#c0392b', background: '#fff4f1', borderRadius: 12, padding: 12, fontSize: 13, margin: 0 },
  loading: { textAlign: 'center', color: '#777' },
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
  toast: { maxWidth: 1180, margin: '0 auto 14px', background: '#27ae60', color: 'white', borderRadius: 12, padding: '10px 14px', fontWeight: 800 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, padding: 14, overflow: 'auto' },
  modal: { maxWidth: 980, margin: '28px auto', background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 18px 50px rgba(0,0,0,0.25)' },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  modalTitle: { margin: 0, color: '#1a1a2e', fontSize: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 10 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#555' },
  articlePhotos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, margin: '10px 0 12px' },
  thumb: { position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#f1f2f4' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbRemove: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#c0392b', color: 'white', cursor: 'pointer', fontWeight: 900 },
  addPhoto: { aspectRatio: '1', border: '2px dashed #ddd', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 800, cursor: 'pointer' },
  modalActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  articleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 },
  articleCard: { border: '1px solid #eee', borderRadius: 12, overflow: 'hidden', background: '#fff' },
  articleImage: { width: '100%', height: 140, objectFit: 'cover', display: 'block' },
  imageEmpty: { height: 140, background: '#eceff3', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  cardBody: { padding: 12 },
  articleName: { margin: 0, fontSize: 15, color: '#222' },
  price: { margin: '7px 0', color: '#c0392b', fontWeight: 900 },
  cardActions: { display: 'flex', gap: 8, marginTop: 10 },
};
