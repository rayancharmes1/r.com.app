// src/utils/openWhatsApp.js
// Ouvre WhatsApp de manière fiable sur iPhone (PWA installée), Android, et desktop.

export function openWhatsApp(url) {
  if (!url) return;

  // Détection iPhone / iPad (y compris iPadOS 13+ qui se fait passer pour un Mac)
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Détection si on est en mode PWA installée (standalone)
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  // Cas critique : iPhone + PWA installée → window.open ne marche pas
  if (isIOS && isStandalone) {
    // On redirige la PWA entière vers WhatsApp.
    // iOS détecte automatiquement le lien wa.me et propose d'ouvrir l'app.
    window.location.href = url;
    return;
  }

  // Cas iPhone en Safari (pas installée) : window.open marche
  if (isIOS) {
    const win = window.open(url, '_blank');
    // Si Safari bloque le popup (peu probable ici, mais possible)
    if (!win) window.location.href = url;
    return;
  }

  // Android + Desktop : window.open fonctionne normalement
  window.open(url, '_blank', 'noopener,noreferrer');
}