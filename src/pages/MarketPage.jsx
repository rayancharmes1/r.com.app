import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, remove, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import RcomLogo from '../components/RcomLogo';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const MAX_PHOTOS = 4;
const WHATSAPP_NUMBER = '2250160672966';

function compressImage(file, maxSize = 500) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MarketPage() {
  const { user, isAdmin } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();

  const [articles, setArticles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [showCart, setShowCart] = useState(false);
  const [showLoginWall, setShowLoginWall] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Admin form state
  const [form, setForm] = useState({ name:'', price:'', oldPrice:'', description:'', category:'', stock:'' });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const r = ref(db, 'articles');
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) setArticles(Object.entries(snap.val()).map(([id,v])=>({id,...v})).reverse());
      else setArticles([]);
    });
    return unsub;
  }, []);

  useEffect(() => { setCarouselIdx(0); }, [selected]);

  // Categories
  const categories = ['Tous', ...Array.from(new Set(articles.map(a => a.category).filter(Boolean)))];

  const filtered = articles.filter(a => {
    const matchSearch = a.name?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Tous' || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  const discount = (art) => {
    if (!art.oldPrice || art.oldPrice <= art.price) return null;
    return Math.round((1 - art.price / art.oldPrice) * 100);
  };

  const getImages = (art) => art.images?.length ? art.images : (art.imageUrl ? [art.imageUrl] : []);

  const cartQty = (id) => {
    const item = cart.find(i => i.article.id === id);
    return item ? item.quantity : 0;
  };

  // Commander via WhatsApp
  const handleOrder = () => {
    if (!user) { setShowCart(false); setShowLoginWall(true); return; }
    if (cart.length === 0) return;

    const lines = cart.map(i => `• ${i.article.name} x${i.quantity} = ${(i.article.price * i.quantity).toLocaleString()} FCFA`).join('\n');
    const message = `Bonjour R.COM 👋\n\nJe voudrais commander :\n\n${lines}\n\n💰 *TOTAL : ${totalPrice.toLocaleString()} FCFA*\n\nNom : ${user.displayName || user.email}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    clearCart();
    setShowCart(false);
    setShowOrderSuccess(true);
    setTimeout(() => setShowOrderSuccess(false), 4000);
  };

  // Image upload (admin)
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    const canAdd = MAX_PHOTOS - imagePreviews.length;
    if (canAdd <= 0) { alert(`Maximum ${MAX_PHOTOS} photos.`); return; }
    setUploadProgress('Compression...');
    const compressed = await Promise.all(files.slice(0, canAdd).map(f => compressImage(f)));
    setImagePreviews(prev => [...prev, ...compressed]);
    setUploadProgress('');
  };

  const removePhoto = (idx) => setImagePreviews(prev => prev.filter((_,i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) { alert('Nom et prix obligatoires.'); return; }
    setUploading(true); setUploadProgress('Publication...');
    try {
      const data = {
        name: form.name.trim(),
        category: form.category?.trim() || '',
        price: parseFloat(form.price),
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
        stock: form.stock ? parseInt(form.stock) : 999,
        description: form.description?.trim() || '',
        images: imagePreviews,
        imageUrl: imagePreviews[0] || '',
        createdAt: editId ? (form.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      };
      if (editId) await update(ref(db, `articles/${editId}`), data);
      else await push(ref(db, 'articles'), data);
      resetForm();
    } catch (err) { alert('Erreur : ' + err.message); }
    setUploading(false); setUploadProgress('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet article ?')) await remove(ref(db, `articles/${id}`));
  };

  const handleEdit = (art) => {
    setForm({...art});
    setImagePreviews(art.images || (art.imageUrl ? [art.imageUrl] : []));
    setEditId(art.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name:'', price:'', oldPrice:'', description:'', category:'', stock:'' });
    setImagePreviews([]); setEditId(null); setShowForm(false); setUploadProgress('');
  };

  return (
    <div style={s.page} onClick={()=>menuOpen&&setMenuOpen(false)}>

      {/* ── HEADER ── */}
      <header style={s.header}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button style={s.backBtn} onClick={()=>navigate('/')}>←</button>
          <RcomLogo size={34} showText={false}/>
          <span style={s.headerTitle}>R.COM Market</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* Cart button */}
          <button style={s.cartBtn} onClick={()=>setShowCart(true)}>
            🛒
            {totalItems > 0 && <span style={s.cartBadge}>{totalItems}</span>}
          </button>
          {/* User menu */}
          {user ? (
            <div style={{position:'relative'}}>
              <button style={s.avatarBtn} onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}}>
                {user.photoURL
                  ? <img src={user.photoURL} style={s.avatar} alt=""/>
                  : <div style={s.avatarFallback}>{(user.displayName||user.email||'U')[0].toUpperCase()}</div>
                }
              </button>
              {menuOpen && (
                <div style={s.dropdown} onClick={e=>e.stopPropagation()}>
                  <p style={s.dropName}>{user.displayName||user.email}</p>
                  {isAdmin && <span style={s.adminBadge}>⭐ Admin</span>}
                  <hr style={{border:'none',borderTop:'1px solid #eee',margin:'8px 0'}}/>
                  <button style={s.dropBtn} onClick={()=>signOut(auth)}>🚪 Déconnexion</button>
                </div>
              )}
            </div>
          ) : (
            <button style={s.loginHeaderBtn} onClick={()=>navigate('/login')}>Connexion</button>
          )}
          {isAdmin && (
            <button style={s.addBtn} onClick={()=>{resetForm();setShowForm(true);}}>+ Article</button>
          )}
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <div style={s.heroBanner}>
        <div>
          <h2 style={s.heroTitle}>R.COM Market</h2>
          <p style={s.heroSub}>Les meilleurs articles au meilleur prix</p>
        </div>
        {!user && (
          <button style={s.heroLoginBtn} onClick={()=>navigate('/login')}>
            Se connecter pour commander
          </button>
        )}
      </div>

      {/* ── SEARCH + CATEGORIES ── */}
      <div style={s.searchWrap}>
        <div style={s.searchBox}>
          <span style={{fontSize:18,color:'#aaa'}}>🔍</span>
          <input style={s.searchInput} placeholder="Rechercher un article..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div style={s.catRow}>
        {categories.map(cat => (
          <button key={cat} style={{...s.catBtn, background:activeCategory===cat?'#c0392b':'white', color:activeCategory===cat?'white':'#555'}}
            onClick={()=>setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── ARTICLES GRID ── */}
      {filtered.length === 0 ? (
        <div style={s.empty}>
          <div style={{fontSize:48,marginBottom:12}}>🛒</div>
          <p style={{color:'#999',fontSize:16}}>{isAdmin ? 'Aucun article. Cliquez sur "+ Article".' : 'Aucun article disponible.'}</p>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map(art => {
            const imgs = getImages(art);
            const qty = cartQty(art.id);
            const disc = discount(art);
            return (
              <div key={art.id} style={s.card}>
                {/* Image */}
                <div style={s.imgWrap} onClick={()=>setSelected(art)}>
                  {imgs[0] ? <img src={imgs[0]} alt={art.name} style={s.img}/> : <div style={s.imgPlaceholder}>📦</div>}
                  {imgs.length > 1 && <span style={s.photoCount}>📷 {imgs.length}</span>}
                  {disc && <span style={s.discountBadge}>-{disc}%</span>}
                  {art.stock === 0 && <div style={s.outOfStock}>Rupture de stock</div>}
                </div>
                {/* Body */}
                <div style={s.cardBody}>
                  {art.category && <span style={s.category}>{art.category}</span>}
                  <h3 style={s.artName} onClick={()=>setSelected(art)}>{art.name}</h3>
                  <div style={s.priceRow}>
                    <span style={s.price}>{Number(art.price).toLocaleString()} FCFA</span>
                    {art.oldPrice && <span style={s.oldPrice}>{Number(art.oldPrice).toLocaleString()} FCFA</span>}
                  </div>

                  {/* Add to cart / qty selector */}
                  {art.stock !== 0 && (
                    qty === 0 ? (
                      <button style={s.addCartBtn} onClick={()=>addToCart(art)}>
                        🛒 Ajouter au panier
                      </button>
                    ) : (
                      <div style={s.qtyRow}>
                        <button style={s.qtyBtn} onClick={()=>updateQuantity(art.id, qty-1)}>−</button>
                        <span style={s.qtyNum}>{qty}</span>
                        <button style={s.qtyBtn} onClick={()=>updateQuantity(art.id, qty+1)}>+</button>
                        <button style={s.removeCartBtn} onClick={()=>removeFromCart(art.id)}>🗑️</button>
                      </div>
                    )
                  )}

                  {/* Admin buttons */}
                  {isAdmin && (
                    <div style={s.adminBtns} onClick={e=>e.stopPropagation()}>
                      <button style={s.editBtn} onClick={()=>handleEdit(art)}>✏️</button>
                      <button style={s.stockBtn} onClick={()=>update(ref(db,`articles/${art.id}`),{stock:0})}>📦 Épuisé</button>
                      <button style={s.delBtn} onClick={()=>handleDelete(art.id)}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FLOATING CART BUTTON (mobile) ── */}
      {totalItems > 0 && (
        <button style={s.floatingCart} onClick={()=>setShowCart(true)}>
          🛒 Voir mon panier ({totalItems}) — {totalPrice.toLocaleString()} FCFA
        </button>
      )}

      {/* ── DETAIL MODAL + CAROUSEL ── */}
      {selected && (() => {
        const imgs = getImages(selected);
        const qty = cartQty(selected.id);
        return (
          <div style={s.overlay} onClick={()=>setSelected(null)}>
            <div style={s.detailModal} onClick={e=>e.stopPropagation()}>
              <button style={s.closeBtn} onClick={()=>setSelected(null)}>✕</button>
              {imgs.length > 0 && (
                <div style={s.carousel}>
                  <img src={imgs[carouselIdx]} alt="" style={s.carouselImg}/>
                  {imgs.length > 1 && (
                    <>
                      <button style={{...s.carArrow,left:8}} onClick={()=>setCarouselIdx((carouselIdx-1+imgs.length)%imgs.length)}>‹</button>
                      <button style={{...s.carArrow,right:8}} onClick={()=>setCarouselIdx((carouselIdx+1)%imgs.length)}>›</button>
                      <div style={s.carDots}>
                        {imgs.map((_,i)=><span key={i} style={{...s.dot,background:i===carouselIdx?'white':'rgba(255,255,255,0.4)'}} onClick={()=>setCarouselIdx(i)}/>)}
                      </div>
                    </>
                  )}
                </div>
              )}
              {imgs.length > 1 && (
                <div style={s.thumbRow}>
                  {imgs.map((url,i)=><img key={i} src={url} alt="" style={{...s.thumb,outline:i===carouselIdx?'3px solid #c0392b':'3px solid transparent'}} onClick={()=>setCarouselIdx(i)}/>)}
                </div>
              )}
              {selected.stock === 0 && <div style={s.outOfStockBig}>Rupture de stock</div>}
              {selected.category && <span style={{...s.category,display:'inline-block',marginBottom:6}}>{selected.category}</span>}
              <h2 style={s.detailName}>{selected.name}</h2>
              <div style={s.detailPriceRow}>
                <span style={s.detailPrice}>{Number(selected.price).toLocaleString()} FCFA</span>
                {selected.oldPrice && <span style={s.oldPrice}>{Number(selected.oldPrice).toLocaleString()} FCFA</span>}
                {discount(selected) && <span style={s.discountBadge2}>-{discount(selected)}%</span>}
              </div>
              {selected.description && <p style={s.detailDesc}>{selected.description}</p>}
              {selected.stock > 0 && <p style={s.stockInfo}>{selected.stock > 900 ? '✅ En stock' : `📦 ${selected.stock} restant(s)`}</p>}
              {selected.stock !== 0 && (
                qty === 0 ? (
                  <button style={{...s.addCartBtn,width:'100%',marginTop:16,padding:14,fontSize:16}} onClick={()=>{addToCart(selected);setSelected(null);}}>
                    🛒 Ajouter au panier
                  </button>
                ) : (
                  <div style={{...s.qtyRow,justifyContent:'center',marginTop:16}}>
                    <button style={s.qtyBtn} onClick={()=>updateQuantity(selected.id,qty-1)}>−</button>
                    <span style={s.qtyNum}>{qty} dans le panier</span>
                    <button style={s.qtyBtn} onClick={()=>updateQuantity(selected.id,qty+1)}>+</button>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })()}

      {/* ── CART MODAL ── */}
      {showCart && (
        <div style={s.overlay} onClick={()=>setShowCart(false)}>
          <div style={s.cartModal} onClick={e=>e.stopPropagation()}>
            <div style={s.cartHeader}>
              <h2 style={s.cartTitle}>🛒 Mon Panier</h2>
              <button style={s.closeBtn} onClick={()=>setShowCart(false)}>✕</button>
            </div>
            {cart.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#aaa'}}>
                <div style={{fontSize:48}}>🛒</div>
                <p style={{marginTop:12}}>Votre panier est vide</p>
              </div>
            ) : (
              <>
                <div style={s.cartItems}>
                  {cart.map(item => (
                    <div key={item.article.id} style={s.cartItem}>
                      {item.article.imageUrl && <img src={item.article.imageUrl} style={s.cartItemImg} alt=""/>}
                      <div style={{flex:1}}>
                        <p style={s.cartItemName}>{item.article.name}</p>
                        <p style={s.cartItemPrice}>{Number(item.article.price).toLocaleString()} FCFA / unité</p>
                        <div style={s.qtyRow}>
                          <button style={s.qtyBtn} onClick={()=>updateQuantity(item.article.id, item.quantity-1)}>−</button>
                          <span style={s.qtyNum}>{item.quantity}</span>
                          <button style={s.qtyBtn} onClick={()=>updateQuantity(item.article.id, item.quantity+1)}>+</button>
                          <button style={s.removeCartBtn} onClick={()=>removeFromCart(item.article.id)}>🗑️</button>
                        </div>
                      </div>
                      <p style={s.cartItemTotal}>{(item.article.price * item.quantity).toLocaleString()} FCFA</p>
                    </div>
                  ))}
                </div>
                <div style={s.cartFooter}>
                  <div style={s.cartTotalRow}>
                    <span style={{fontWeight:700,fontSize:16}}>Total</span>
                    <span style={{fontWeight:800,fontSize:20,color:'#c0392b'}}>{totalPrice.toLocaleString()} FCFA</span>
                  </div>
                  <button style={s.whatsappBtn} onClick={handleOrder}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{marginRight:8}}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.524 5.855L.057 23.714a.5.5 0 00.614.614l5.858-1.467A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.742-.524-5.295-1.437l-.378-.222-3.927.983.982-3.927-.222-.378A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    Commander via WhatsApp
                  </button>
                  {!user && <p style={{textAlign:'center',color:'#e67e22',fontSize:13,marginTop:8}}>⚠️ Vous devez être connecté pour commander</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LOGIN WALL MODAL ── */}
      {showLoginWall && (
        <div style={s.overlay} onClick={()=>setShowLoginWall(false)}>
          <div style={{...s.cartModal,maxWidth:380,textAlign:'center',padding:36}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:48,marginBottom:12}}>🔐</div>
            <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:1,marginBottom:8}}>Connexion requise</h2>
            <p style={{color:'#666',fontSize:14,marginBottom:24,lineHeight:1.6}}>
              Pour passer une commande, vous devez avoir un compte R.COM.<br/>C'est gratuit et rapide !
            </p>
            <button style={{...s.whatsappBtn,background:'linear-gradient(135deg,#c0392b,#e67e22)'}} onClick={()=>navigate('/login')}>
              Se connecter / S'inscrire
            </button>
            <button style={{...s.whatsappBtn,background:'#f0f2f5',color:'#555',marginTop:10}} onClick={()=>setShowLoginWall(false)}>
              Continuer à regarder
            </button>
          </div>
        </div>
      )}

      {/* ── ORDER SUCCESS TOAST ── */}
      {showOrderSuccess && (
        <div style={s.toast}>
          ✅ Commande envoyée sur WhatsApp ! On vous contacte bientôt.
        </div>
      )}

      {/* ── ADMIN FORM MODAL ── */}
      {isAdmin && showForm && (
        <div style={s.overlay}>
          <div style={s.formModal}>
            <h2 style={s.formTitle}>{editId?'Modifier':'Nouvel'} Article</h2>
            <div style={s.formScroll}>
              <p style={s.photoLabel}>Photos ({imagePreviews.length}/{MAX_PHOTOS}) <span style={{fontWeight:400,color:'#aaa',fontSize:11}}>· 1ère = principale</span></p>
              <div style={s.photoGrid}>
                {imagePreviews.map((url,i)=>(
                  <div key={i} style={s.photoCell}>
                    <img src={url} alt="" style={s.photoCellImg}/>
                    <button style={s.photoRemove} onClick={()=>removePhoto(i)}>✕</button>
                    {i===0 && <span style={s.photoPrincipal}>Principale</span>}
                  </div>
                ))}
                {imagePreviews.length < MAX_PHOTOS && (
                  <label style={s.photoAdd}>
                    <div style={{fontSize:26,color:'#ccc'}}>＋</div>
                    <div style={{fontSize:11,color:'#bbb',marginTop:3}}>Photo</div>
                    <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleImageChange}/>
                  </label>
                )}
              </div>
              {uploadProgress && <p style={{color:'#e67e22',fontSize:13,marginBottom:10,textAlign:'center'}}>{uploadProgress}</p>}
              <input style={s.inp} placeholder="Nom de l'article *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <input style={s.inp} placeholder="Catégorie (ex: Électronique)" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
              <input style={s.inp} type="number" placeholder="Prix en FCFA *" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
              <input style={s.inp} type="number" placeholder="Ancien prix (pour afficher réduction)" value={form.oldPrice} onChange={e=>setForm({...form,oldPrice:e.target.value})}/>
              <input style={s.inp} type="number" placeholder="Stock (vide = illimité)" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/>
              <textarea style={{...s.inp,height:90,resize:'vertical'}} placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button style={{...s.saveBtn,opacity:uploading?0.7:1}} onClick={handleSubmit} disabled={uploading}>
                {uploading ? '⏳ Publication...' : editId ? '✅ Modifier' : '🚀 Publier'}
              </button>
              <button style={s.cancelBtn} onClick={resetForm} disabled={uploading}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'#f0f2f5',paddingBottom:90},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'white',boxShadow:'0 2px 12px rgba(0,0,0,0.07)',position:'sticky',top:0,zIndex:100},
  backBtn:{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#333',padding:'0 6px 0 0'},
  headerTitle:{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1,color:'#c0392b'},
  cartBtn:{position:'relative',background:'none',border:'none',fontSize:24,cursor:'pointer',padding:'4px 8px'},
  cartBadge:{position:'absolute',top:0,right:0,background:'#e74c3c',color:'white',fontSize:10,fontWeight:700,width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'},
  avatarBtn:{background:'none',border:'none',cursor:'pointer',padding:0},
  avatar:{width:34,height:34,borderRadius:'50%',objectFit:'cover'},
  avatarFallback:{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14},
  dropdown:{position:'absolute',right:0,top:44,background:'white',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,0.15)',padding:'14px 18px',minWidth:200,zIndex:200},
  dropName:{fontSize:14,fontWeight:600,marginBottom:6,wordBreak:'break-all'},
  adminBadge:{background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,display:'inline-block'},
  dropBtn:{background:'none',border:'none',color:'#e74c3c',cursor:'pointer',fontSize:14,padding:'8px 0 0',width:'100%',textAlign:'left'},
  loginHeaderBtn:{background:'#f0f2f5',border:'none',borderRadius:8,padding:'7px 14px',fontSize:13,fontWeight:700,cursor:'pointer',color:'#333'},
  addBtn:{background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',border:'none',borderRadius:10,padding:'7px 14px',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:"'Outfit',sans-serif"},
  heroBanner:{background:'linear-gradient(135deg,#c0392b 0%,#e67e22 100%)',padding:'28px 24px',color:'white',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},
  heroTitle:{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:2,margin:0},
  heroSub:{fontSize:14,opacity:0.85,margin:'4px 0 0'},
  heroLoginBtn:{background:'white',color:'#c0392b',border:'none',borderRadius:10,padding:'10px 18px',fontWeight:700,cursor:'pointer',fontSize:14,fontFamily:"'Outfit',sans-serif"},
  searchWrap:{padding:'14px 16px 8px'},
  searchBox:{background:'white',borderRadius:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  searchInput:{border:'none',outline:'none',fontSize:15,flex:1,fontFamily:"'Outfit',sans-serif"},
  catRow:{display:'flex',gap:8,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none'},
  catBtn:{border:'none',borderRadius:20,padding:'7px 16px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Outfit',sans-serif",boxShadow:'0 2px 6px rgba(0,0,0,0.08)',flexShrink:0},
  empty:{textAlign:'center',padding:'80px 20px'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,padding:'8px 16px',maxWidth:1200,margin:'0 auto'},
  card:{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.08)',transition:'transform 0.18s'},
  imgWrap:{position:'relative',height:175,overflow:'hidden',background:'#f8f8f8',cursor:'pointer'},
  img:{width:'100%',height:'100%',objectFit:'cover'},
  imgPlaceholder:{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:48,color:'#ddd'},
  photoCount:{position:'absolute',bottom:8,right:8,background:'rgba(0,0,0,0.55)',color:'white',fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:8},
  discountBadge:{position:'absolute',top:10,left:10,background:'#e74c3c',color:'white',fontSize:12,fontWeight:700,padding:'3px 8px',borderRadius:8},
  discountBadge2:{background:'#e74c3c',color:'white',fontSize:13,fontWeight:700,padding:'3px 8px',borderRadius:8},
  outOfStock:{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14},
  outOfStockBig:{background:'#e74c3c',color:'white',textAlign:'center',padding:'9px',fontSize:14,fontWeight:700,borderRadius:10,marginBottom:14},
  cardBody:{padding:'10px 12px 14px'},
  category:{fontSize:10,fontWeight:700,color:'#e67e22',textTransform:'uppercase',letterSpacing:1},
  artName:{fontSize:14,fontWeight:700,margin:'3px 0 6px',lineHeight:1.3,cursor:'pointer'},
  priceRow:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:10},
  price:{fontWeight:800,fontSize:15,color:'#c0392b'},
  oldPrice:{fontSize:12,color:'#bbb',textDecoration:'line-through'},
  addCartBtn:{width:'100%',padding:'9px',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:"'Outfit',sans-serif"},
  qtyRow:{display:'flex',alignItems:'center',gap:8},
  qtyBtn:{width:32,height:32,border:'2px solid #eee',borderRadius:8,background:'white',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#333'},
  qtyNum:{fontWeight:700,fontSize:14,minWidth:24,textAlign:'center'},
  removeCartBtn:{background:'#fdecea',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'},
  adminBtns:{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'},
  editBtn:{background:'#f0f2f5',border:'none',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontSize:12,fontWeight:600},
  stockBtn:{background:'#fff3e0',border:'none',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontSize:11,fontWeight:600},
  delBtn:{background:'#fdecea',border:'none',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontSize:13},
  floatingCart:{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',border:'none',borderRadius:30,padding:'14px 28px',fontWeight:700,fontSize:15,cursor:'pointer',boxShadow:'0 8px 30px rgba(192,57,43,0.4)',zIndex:99,fontFamily:"'Outfit',sans-serif",whiteSpace:'nowrap'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16},
  detailModal:{background:'white',borderRadius:24,padding:24,width:'100%',maxWidth:480,maxHeight:'92vh',overflowY:'auto',position:'relative'},
  closeBtn:{position:'absolute',top:14,right:14,background:'#f0f2f5',border:'none',borderRadius:50,width:32,height:32,cursor:'pointer',fontSize:16,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'},
  carousel:{position:'relative',borderRadius:16,overflow:'hidden',marginBottom:10,background:'#111'},
  carouselImg:{width:'100%',height:260,objectFit:'cover',display:'block'},
  carArrow:{position:'absolute',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.45)',color:'white',border:'none',borderRadius:50,width:36,height:36,fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  carDots:{position:'absolute',bottom:10,left:0,right:0,display:'flex',justifyContent:'center',gap:6},
  dot:{width:8,height:8,borderRadius:'50%',cursor:'pointer',display:'inline-block'},
  thumbRow:{display:'flex',gap:8,marginBottom:14,overflowX:'auto'},
  thumb:{width:56,height:56,objectFit:'cover',borderRadius:10,cursor:'pointer',flexShrink:0},
  detailName:{fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:1,marginBottom:8},
  detailPriceRow:{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'},
  detailPrice:{fontSize:22,fontWeight:800,color:'#c0392b'},
  detailDesc:{color:'#555',fontSize:14,lineHeight:1.6,marginBottom:12},
  stockInfo:{color:'#27ae60',fontSize:13,fontWeight:600,marginBottom:8},
  cartModal:{background:'white',borderRadius:24,padding:0,width:'100%',maxWidth:480,maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden'},
  cartHeader:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 16px',borderBottom:'1px solid #f0f2f5',position:'relative'},
  cartTitle:{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:1},
  cartItems:{flex:1,overflowY:'auto',padding:'8px 24px'},
  cartItem:{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid #f5f5f5',alignItems:'flex-start'},
  cartItemImg:{width:60,height:60,borderRadius:10,objectFit:'cover',flexShrink:0},
  cartItemName:{fontWeight:700,fontSize:14,marginBottom:2},
  cartItemPrice:{color:'#888',fontSize:12,marginBottom:6},
  cartItemTotal:{fontWeight:800,color:'#c0392b',fontSize:15,whiteSpace:'nowrap'},
  cartFooter:{padding:'16px 24px 24px',borderTop:'1px solid #f0f2f5'},
  cartTotalRow:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  whatsappBtn:{width:'100%',padding:'14px',background:'#25D366',color:'white',border:'none',borderRadius:12,fontWeight:700,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Outfit',sans-serif"},
  toast:{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',background:'#27ae60',color:'white',padding:'14px 24px',borderRadius:14,fontWeight:700,fontSize:14,zIndex:400,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',whiteSpace:'nowrap'},
  formModal:{background:'white',borderRadius:24,padding:24,width:'100%',maxWidth:440,maxHeight:'95vh',display:'flex',flexDirection:'column'},
  formTitle:{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:1,marginBottom:12},
  formScroll:{overflowY:'auto',flex:1,paddingRight:2},
  photoLabel:{fontSize:13,fontWeight:700,color:'#555',marginBottom:8},
  photoGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12},
  photoCell:{position:'relative',aspectRatio:'1',borderRadius:10,overflow:'hidden',background:'#f0f0f0'},
  photoCellImg:{width:'100%',height:'100%',objectFit:'cover'},
  photoRemove:{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.6)',color:'white',border:'none',borderRadius:50,width:20,height:20,fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  photoPrincipal:{position:'absolute',bottom:3,left:3,background:'#c0392b',color:'white',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4},
  photoAdd:{aspectRatio:'1',borderRadius:10,border:'2px dashed #ddd',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'#fafafa'},
  inp:{display:'block',width:'100%',padding:'11px 14px',border:'2px solid #eee',borderRadius:10,fontSize:14,marginBottom:10,outline:'none',fontFamily:"'Outfit',sans-serif",boxSizing:'border-box'},
  saveBtn:{flex:1,padding:'13px',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontSize:15},
  cancelBtn:{flex:1,padding:'13px',background:'#f0f2f5',color:'#666',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif"},
};
