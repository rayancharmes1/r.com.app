import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import RcomLogo from '../components/RcomLogo';

const DEFAULTS = [
  { id: 'market', name: 'R.COM Market', icon: '🛒', color: '#c0392b', available: true, description: 'Marketplace officielle', isDefault: true },
  { id: 'tech', name: 'R.COM Tech', icon: '💻', color: '#2980b9', available: false, description: 'Bientôt disponible', isDefault: true },
  { id: 'delice', name: 'R.COM Délice', icon: '🍽️', color: '#e67e22', available: false, description: 'Bientôt disponible', isDefault: true },
];

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [disciplines, setDisciplines] = useState(DEFAULTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDisc, setNewDisc] = useState({ name:'', icon:'', color:'#c0392b', description:'' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const r = ref(db, 'disciplines');
    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const fbMap = {};
      const extras = [];
      Object.entries(data).forEach(([fbKey, v]) => {
        if (v.isDefault && v.id) fbMap[v.id] = { fbKey, ...v };
        else extras.push({ fbKey, ...v });
      });
      setDisciplines([...DEFAULTS.map(d => ({ ...d, ...(fbMap[d.id] || {}) })), ...extras]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const r = ref(db, 'disciplines');
    onValue(r, (snap) => {
      if (!snap.exists()) DEFAULTS.forEach(d => push(r, { ...d }));
    }, { onlyOnce: true });
  }, [isAdmin]);

  const handleToggle = async (disc) => {
    setSaving(true);
    try {
      if (disc.fbKey) await update(ref(db, `disciplines/${disc.fbKey}`), { available: !disc.available });
      else await push(ref(db, 'disciplines'), { ...disc, isDefault: true, available: !disc.available });
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const handleAddDiscipline = async () => {
    if (!newDisc.name.trim()) return;
    setSaving(true);
    await push(ref(db, 'disciplines'), { ...newDisc, available: false, isDefault: false });
    setNewDisc({ name:'', icon:'', color:'#c0392b', description:'' });
    setShowAddForm(false);
    setSaving(false);
  };

  const handleDeleteDiscipline = async (disc) => {
    if (disc.isDefault) { alert('Impossible de supprimer une discipline par défaut.'); return; }
    if (!window.confirm(`Supprimer "${disc.name}" ?`)) return;
    if (disc.fbKey) await remove(ref(db, `disciplines/${disc.fbKey}`));
  };

  const handleClick = (disc) => {
    if (!disc.available) return;
    if (disc.id === 'market' || disc.name === 'R.COM Market') navigate('/market');
  };

  return (
    <div style={s.page} onClick={()=>menuOpen&&setMenuOpen(false)}>
      <header style={s.header}>
        <RcomLogo size={44} showText={true} textSize={22}/>
        <div style={{position:'relative'}}>
          <button style={s.avatarBtn} onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}}>
            {user?.photoURL
              ? <img src={user.photoURL} style={s.avatar} alt=""/>
              : <div style={s.avatarFallback}>{(user?.displayName||user?.email||'U')[0].toUpperCase()}</div>
            }
          </button>
          {menuOpen && (
            <div style={s.dropdown} onClick={e=>e.stopPropagation()}>
              <p style={s.dropName}>{user?.displayName||user?.email}</p>
              {isAdmin && <span style={s.adminBadge}>⭐ Admin</span>}
              <hr style={{border:'none',borderTop:'1px solid #eee',margin:'10px 0'}}/>
              <button style={s.dropBtn} onClick={()=>signOut(auth)}>🚪 Déconnexion</button>
            </div>
          )}
        </div>
      </header>

      <div style={s.hero}>
        <h1 style={s.heroTitle}>Bienvenue sur <span style={s.heroSpan}>R.COM</span></h1>
        <p style={s.heroSub}>Choisissez votre univers</p>
        {isAdmin && <p style={s.adminHint}>👑 Mode admin — active/désactive chaque discipline</p>}
      </div>

      <div style={s.grid}>
        {disciplines.map((disc, idx) => (
          <div key={disc.fbKey||disc.id||idx} style={{...s.card, opacity:disc.available?1:0.65}}>
            <div style={{cursor:disc.available?'pointer':'default',flex:1}} onClick={()=>handleClick(disc)}>
              <div style={{...s.cardIcon, background:(disc.color||'#999')+'22', color:disc.color||'#999'}}>
                <span style={{fontSize:28}}>{disc.icon||disc.name?.[0]}</span>
              </div>
              <h3 style={s.cardName}>{disc.name}</h3>
              <p style={s.cardDesc}>{disc.description}</p>
              <span style={{...s.badge, background:disc.available?(disc.color||'#27ae60'):'#bbb'}}>
                {disc.available ? '✅ Disponible' : '🔒 Bientôt'}
              </span>
            </div>
            {isAdmin && (
              <div style={s.adminRow}>
                <button
                  style={{...s.toggleBtn, background:disc.available?'#fdecea':'#e8f8e8', color:disc.available?'#c0392b':'#27ae60'}}
                  onClick={()=>handleToggle(disc)} disabled={saving}
                >
                  {disc.available ? '🔴 Désactiver' : '🟢 Activer'}
                </button>
                {!disc.isDefault && (
                  <button style={s.delDiscBtn} onClick={()=>handleDeleteDiscipline(disc)}>🗑️</button>
                )}
              </div>
            )}
          </div>
        ))}
        {isAdmin && (
          <div style={{...s.card,border:'2px dashed #ddd',background:'transparent',cursor:'pointer',justifyContent:'center',alignItems:'center',display:'flex',flexDirection:'column',gap:8,minHeight:200}}
            onClick={()=>setShowAddForm(true)}>
            <div style={{fontSize:40,color:'#ccc'}}>＋</div>
            <p style={{color:'#aaa',fontSize:14,fontWeight:600}}>Nouvelle discipline</p>
          </div>
        )}
      </div>

      {isAdmin && showAddForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,marginBottom:20,letterSpacing:1}}>Nouvelle Discipline</h2>
            <input style={s.inp} placeholder="Nom * (ex: R.COM Sport)" value={newDisc.name} onChange={e=>setNewDisc({...newDisc,name:e.target.value})}/>
            <input style={s.inp} placeholder="Icône emoji (ex: ⚽)" value={newDisc.icon} onChange={e=>setNewDisc({...newDisc,icon:e.target.value})}/>
            <input style={s.inp} placeholder="Description courte" value={newDisc.description} onChange={e=>setNewDisc({...newDisc,description:e.target.value})}/>
            <label style={{fontSize:13,color:'#666',marginBottom:6,display:'block'}}>Couleur</label>
            <input type="color" value={newDisc.color} onChange={e=>setNewDisc({...newDisc,color:e.target.value})}
              style={{width:56,height:36,border:'none',cursor:'pointer',marginBottom:16,borderRadius:8}}/>
            <div style={{display:'flex',gap:12}}>
              <button style={s.saveBtn} onClick={handleAddDiscipline} disabled={saving}>Ajouter</button>
              <button style={s.cancelBtn} onClick={()=>setShowAddForm(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'#f0f2f5'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',background:'white',boxShadow:'0 2px 12px rgba(0,0,0,0.07)',position:'sticky',top:0,zIndex:100},
  avatarBtn:{background:'none',border:'none',cursor:'pointer',padding:0},
  avatar:{width:38,height:38,borderRadius:'50%',objectFit:'cover'},
  avatarFallback:{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16},
  dropdown:{position:'absolute',right:0,top:48,background:'white',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,0.15)',padding:'14px 18px',minWidth:210,zIndex:200},
  dropName:{fontSize:14,fontWeight:600,marginBottom:6,wordBreak:'break-all'},
  adminBadge:{background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,display:'inline-block'},
  dropBtn:{background:'none',border:'none',color:'#e74c3c',cursor:'pointer',fontSize:14,padding:'8px 0 0',width:'100%',textAlign:'left'},
  hero:{textAlign:'center',padding:'40px 24px 20px'},
  heroTitle:{fontFamily:"'Bebas Neue',cursive",fontSize:48,letterSpacing:2,color:'#1a1a2e'},
  heroSpan:{background:'linear-gradient(135deg,#c0392b,#e67e22)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  heroSub:{color:'#888',fontSize:16,marginTop:8},
  adminHint:{marginTop:12,fontSize:13,color:'#e67e22',fontWeight:600,background:'#fff8f0',display:'inline-block',padding:'6px 14px',borderRadius:20},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:20,padding:'20px 24px 40px',maxWidth:1100,margin:'0 auto'},
  card:{background:'white',borderRadius:20,padding:'24px 20px 16px',textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',display:'flex',flexDirection:'column'},
  cardIcon:{width:64,height:64,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'},
  cardName:{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:1,marginBottom:6},
  cardDesc:{color:'#888',fontSize:13,marginBottom:14},
  badge:{color:'white',fontSize:12,padding:'5px 14px',borderRadius:20,fontWeight:600,display:'inline-block'},
  adminRow:{display:'flex',gap:8,marginTop:14,justifyContent:'center'},
  toggleBtn:{border:'none',borderRadius:10,padding:'8px 14px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif",flex:1,transition:'all 0.2s'},
  delDiscBtn:{background:'#fdecea',border:'none',borderRadius:10,padding:'8px 10px',cursor:'pointer',fontSize:15},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:20},
  modal:{background:'white',borderRadius:20,padding:32,width:'90%',maxWidth:400},
  inp:{width:'100%',padding:'12px 14px',border:'2px solid #eee',borderRadius:10,fontSize:14,marginBottom:12,outline:'none',display:'block',fontFamily:"'Outfit',sans-serif",boxSizing:'border-box'},
  saveBtn:{flex:1,padding:'12px',background:'linear-gradient(135deg,#c0392b,#e67e22)',color:'white',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif"},
  cancelBtn:{flex:1,padding:'12px',background:'#f0f2f5',color:'#666',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif"},
};
