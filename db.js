// firebase/db.js
import { db } from './config';
import {
  ref, set, get, update, remove, push, onValue, off, query, orderByChild
} from 'firebase/database';

// ─── CONSTANTES ─────────────────────────────────────────────────────────────
export const ADMIN_EMAIL = 'rayan.compagnie@gmail.com';
export const ADMIN_UID   = 'ImB6u7fpdZbibN3LyCaAnwbHZZq1';
export const DEFAULT_ARTICLE_LIMIT = 15;
export const ORDER_WHATSAPP = '+2250102030405'; // ← remplace par le vrai numéro

// ─── USERS ───────────────────────────────────────────────────────────────────
export async function getUser(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function setUser(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}

export async function getAllUsers() {
  const snap = await get(ref(db, 'users'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([uid, val]) => ({ uid, ...val }));
}

// ─── BOUTIQUES ────────────────────────────────────────────────────────────────
export async function getShop(shopId) {
  const snap = await get(ref(db, `shops/${shopId}`));
  return snap.exists() ? { id: shopId, ...snap.val() } : null;
}

export async function getAllShops() {
  const snap = await get(ref(db, 'shops'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
}

export async function createShop(ownerUid, ownerEmail, ownerName) {
  const shopRef = ref(db, `shops/${ownerUid}`);
  await set(shopRef, {
    ownerUid,
    ownerEmail,
    ownerName,
    name: `Boutique de ${ownerName}`,
    articleLimit: DEFAULT_ARTICLE_LIMIT,
    active: true,
    createdAt: Date.now(),
  });
  // Marque l'utilisateur comme propriétaire de boutique
  await update(ref(db, `users/${ownerUid}`), { hasShop: true, shopId: ownerUid });
}

export async function updateShopLimit(shopId, newLimit) {
  await update(ref(db, `shops/${shopId}`), { articleLimit: newLimit });
}

export async function deleteShop(shopId) {
  // Supprime la boutique et ses articles
  await remove(ref(db, `shops/${shopId}`));
  await remove(ref(db, `shopArticles/${shopId}`));
  // Retire le flag utilisateur
  await update(ref(db, `users/${shopId}`), { hasShop: false, shopId: null });
}

export async function updateShop(shopId, data) {
  await update(ref(db, `shops/${shopId}`), data);
}

// ─── ARTICLES DE BOUTIQUE ─────────────────────────────────────────────────────
export async function getShopArticles(shopId) {
  const snap = await get(ref(db, `shopArticles/${shopId}`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
}

export async function addShopArticle(shopId, article) {
  const articlesRef = ref(db, `shopArticles/${shopId}`);
  const snap = await get(articlesRef);
  const shop = await getShop(shopId);
  const count = snap.exists() ? Object.keys(snap.val()).length : 0;

  if (count >= (shop?.articleLimit ?? DEFAULT_ARTICLE_LIMIT)) {
    throw new Error(`Limite de ${shop?.articleLimit ?? DEFAULT_ARTICLE_LIMIT} articles atteinte.`);
  }

  const newRef = push(articlesRef);
  await set(newRef, { ...article, createdAt: Date.now(), shopId });
  return newRef.key;
}

export async function updateShopArticle(shopId, articleId, data) {
  await update(ref(db, `shopArticles/${shopId}/${articleId}`), data);
}

export async function deleteShopArticle(shopId, articleId) {
  await remove(ref(db, `shopArticles/${shopId}/${articleId}`));
}

// ─── ARTICLES ADMIN (boutique principale) ─────────────────────────────────────
export async function getAdminArticles() {
  const snap = await get(ref(db, 'articles'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
}

export async function addAdminArticle(article) {
  const newRef = push(ref(db, 'articles'));
  await set(newRef, { ...article, createdAt: Date.now() });
  return newRef.key;
}

export async function updateAdminArticle(articleId, data) {
  await update(ref(db, `articles/${articleId}`), data);
}

export async function deleteAdminArticle(articleId) {
  await remove(ref(db, `articles/${articleId}`));
}

// ─── COMMANDES ────────────────────────────────────────────────────────────────
// Toutes les commandes (admin et boutiques) vont sur le même numéro WhatsApp.
export function buildWhatsAppOrderLink(items, shopName = 'R.COM') {
  const lines = items.map(i => `• ${i.name} x${i.qty} — ${i.price} FCFA`).join('\n');
  const msg = encodeURIComponent(
    `🛒 Nouvelle commande depuis ${shopName}\n\n${lines}\n\nMerci !`
  );
  return `https://wa.me/${ORDER_WHATSAPP.replace(/\D/g, '')}?text=${msg}`;
}

// ─── REALTIME LISTENERS ───────────────────────────────────────────────────────
export function listenShops(callback) {
  const r = ref(db, 'shops');
  onValue(r, snap => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })));
  });
  return () => off(r);
}

export function listenShopArticles(shopId, callback) {
  const r = ref(db, `shopArticles/${shopId}`);
  onValue(r, snap => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })));
  });
  return () => off(r);
}
