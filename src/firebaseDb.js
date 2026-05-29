import { db, ADMIN_UID, WHATSAPP } from './firebase';
import { ref, get, set, update, remove, push, onValue } from 'firebase/database';

export const DEFAULT_ARTICLE_LIMIT = 15;

export async function getAllUsers() {
  const snap = await get(ref(db, 'users'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }));
}

export async function getAllShops() {
  const snap = await get(ref(db, 'shops'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
}

export async function getShop(shopId) {
  const snap = await get(ref(db, `shops/${shopId}`));
  return snap.exists() ? { id: shopId, ...snap.val() } : null;
}

export async function authorizeShop(userData) {
  if (!userData?.uid || userData.uid === ADMIN_UID) return;
  const ownerName = userData.name || userData.displayName || userData.email || 'Utilisateur';
  await set(ref(db, `shops/${userData.uid}`), {
    ownerUid: userData.uid,
    ownerEmail: userData.email || '',
    ownerName,
    name: `Boutique de ${ownerName}`,
    orderPhone: WHATSAPP,
    articleLimit: DEFAULT_ARTICLE_LIMIT,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await update(ref(db, `users/${userData.uid}`), {
    hasShop: true,
    shopId: userData.uid,
    articleLimit: DEFAULT_ARTICLE_LIMIT,
  });
}

export async function updateShopOrderPhone(shopId, orderPhone) {
  const cleaned = String(orderPhone || '').replace(/\D/g, '');
  await update(ref(db, `shops/${shopId}`), { orderPhone: cleaned, updatedAt: Date.now() });
}

export async function updateShopLimit(shopId, articleLimit) {
  const limit = Math.max(1, Number(articleLimit) || DEFAULT_ARTICLE_LIMIT);
  await update(ref(db, `shops/${shopId}`), { articleLimit: limit, updatedAt: Date.now() });
  await update(ref(db, `users/${shopId}`), { articleLimit: limit });
}

export async function deleteUserShop(shopId) {
  if (!shopId || shopId === ADMIN_UID) return;
  await remove(ref(db, `shops/${shopId}`));
  await remove(ref(db, `shopArticles/${shopId}`));
  await update(ref(db, `users/${shopId}`), {
    hasShop: false,
    shopId: null,
    articleLimit: null,
  });
}

export function listenShopArticles(shopId, callback) {
  const articlesRef = ref(db, `shopArticles/${shopId}`);
  return onValue(articlesRef, snap => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    callback(Object.entries(snap.val()).map(([id, data]) => ({ id, ...data })));
  });
}

export async function addShopArticle(shopId, article) {
  const [shop, articlesSnap] = await Promise.all([
    getShop(shopId),
    get(ref(db, `shopArticles/${shopId}`)),
  ]);
  const count = articlesSnap.exists() ? Object.keys(articlesSnap.val()).length : 0;
  const limit = shop?.articleLimit || DEFAULT_ARTICLE_LIMIT;
  if (count >= limit) throw new Error(`Limite atteinte : ${limit} articles maximum.`);

  const articleRef = push(ref(db, `shopArticles/${shopId}`));
  await set(articleRef, {
    ...article,
    shopId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function updateShopArticle(shopId, articleId, article) {
  await update(ref(db, `shopArticles/${shopId}/${articleId}`), {
    ...article,
    updatedAt: Date.now(),
  });
}

export async function deleteShopArticle(shopId, articleId) {
  await remove(ref(db, `shopArticles/${shopId}/${articleId}`));
}

export function buildWhatsAppOrderLink(items, shopName = 'R.COM', orderPhone = WHATSAPP) {
  const lines = items
    .map(item => `• ${item.name} x${item.qty} = ${(item.price * item.qty).toLocaleString()} FCFA`)
    .join('\n');
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const message = `Bonjour R.COM\n\nCommande ${shopName} :\n\n${lines}\n\nTOTAL : ${total.toLocaleString()} FCFA`;
  const phone = String(orderPhone || WHATSAPP).replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
