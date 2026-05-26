# 🏪 Guide d'intégration — Système de Boutiques R.COM

## Nouveaux fichiers à ajouter dans ton projet

```
src/
├── firebase/
│   ├── config.js          ← (ton fichier existant ou le nouveau)
│   └── db.js              ← NOUVEAU : toutes les fonctions Firebase
├── hooks/
│   └── useAuth.js         ← NOUVEAU : contexte d'authentification
├── pages/
│   ├── AdminUsers.jsx     ← NOUVEAU : admin voit tous les comptes
│   ├── AdminUsers.module.css
│   ├── MyShop.jsx         ← NOUVEAU : propriétaire gère sa boutique
│   ├── MyShop.module.css
│   ├── Shops.jsx          ← NOUVEAU : liste publique des boutiques
│   ├── Shops.module.css
│   ├── ShopDetail.jsx     ← NOUVEAU : détail d'une boutique (avec panier)
│   └── ShopDetail.module.css
├── components/
│   ├── NavBar.jsx         ← NOUVEAU (ou à adapter)
│   └── NavBar.module.css
└── App.jsx                ← À FUSIONNER avec tes routes existantes

firebase-rules.json        ← Colle ces règles dans Firebase Console
```

---

## Étape 1 — Mets à jour les règles Firebase

Dans **Firebase Console → Realtime Database → Rules**, colle le contenu de `firebase-rules.json`.

---

## Étape 2 — Configure le numéro WhatsApp

Dans `src/firebase/db.js`, ligne 9, remplace :
```js
export const ORDER_WHATSAPP = '+2250102030405';
```
par ton vrai numéro (format international, sans espaces).

---

## Étape 3 — Fusionne App.jsx

Ajoute ces routes dans ton `<Routes>` existant :

```jsx
import AdminUsers from './pages/AdminUsers';
import MyShop     from './pages/MyShop';
import Shops      from './pages/Shops';
import ShopDetail from './pages/ShopDetail';

// Dans <Routes> :
<Route path="/admin/utilisateurs" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
<Route path="/ma-boutique"        element={<RequireAuth><RequireShop><MyShop /></RequireShop></RequireAuth>} />
<Route path="/boutiques"          element={<Shops />} />
<Route path="/boutique/:shopId"   element={<ShopDetail />} />
```

---

## Étape 4 — Ajoute les liens dans ta NavBar existante

```jsx
import { useAuth } from '../hooks/useAuth';

const { profile, isAdmin } = useAuth();

// Dans ton JSX :
<Link to="/boutiques">🏪 Boutiques</Link>

{profile?.hasShop && (
  <Link to="/ma-boutique">✏️ Ma boutique</Link>
)}

{isAdmin && (
  <Link to="/admin/utilisateurs">👥 Comptes</Link>  {/* ← BOUTON ADMIN COMPTES */}
)}
```

---

## Ce que ça fait concrètement

### 👑 Admin (`rayan.compagnie@gmail.com`)
- Va sur `/admin/utilisateurs` → voit **tous les comptes enregistrés**
- Clique **"Autoriser une boutique"** sur un compte → ce compte reçoit une boutique avec **15 articles de base**
- Peut **modifier la limite** (ex: passer à 30, 50...) ou **supprimer** la boutique
- Sa propre boutique (articles dans `/articles`) est **intouchable** par les autres
- Toutes les commandes arrivent sur **son numéro WhatsApp**

### 🏪 Propriétaire de boutique
- Va sur `/ma-boutique` → peut **ajouter/modifier/supprimer** ses articles (dans sa limite)
- Ne peut PAS dépasser sa limite d'articles (bloqué côté client ET côté Firebase rules)
- Ne peut PAS toucher les articles des autres boutiques ni ceux de l'admin
- Le bouton "Commander" sur ses articles → **même numéro WhatsApp que l'admin**

### 🛍️ Client
- Va sur `/boutiques` → voit toutes les boutiques actives
- Clique sur une boutique → voit ses articles, ajoute au panier
- Commande via WhatsApp → **même numéro pour toutes les boutiques**

---

## Sécurité Firebase (résumé)

| Node               | Lecture         | Écriture                        |
|--------------------|-----------------|----------------------------------|
| `/articles`        | Tout connecté   | Admin seulement                 |
| `/users/$uid`      | Proprio ou Admin| Proprio ou Admin                |
| `/shops/$shopId`   | Tout connecté   | Admin ou propriétaire           |
| `/shopArticles/$shopId` | Public (sans compte) | Propriétaire ou Admin |
