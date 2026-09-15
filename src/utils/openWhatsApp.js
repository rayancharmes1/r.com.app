// src/utils/openWhatsApp.js
// Ouvre WhatsApp de manière fiable sur iPhone (PWA installée), Android, et desktop.

export function openWhatsApp(url) {
  if (!url) return;

  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  // Convertir l'URL wa.me en schéma natif whatsapp://
  let nativeUrl = url;
  if (url.includes('wa.me/')) {
    // Extraire le numéro et le texte de l'URL wa.me
    const match = url.match(/wa\.me\/(\d+)(?:\?text=(.*))?/);
    if (match) {
      const phone = match[1];
      const text = match[2] || '';
      nativeUrl = `whatsapp://send?phone=${phone}${text ? `&text=${text}` : ''}`;
    }
  }

  // Cas critique : iPhone + PWA installée
  if (isIOS && isStandalone) {
    window.location.href = nativeUrl;
    return;
  }

  if (isIOS) {
    const win = window.open(nativeUrl, '_blank');
    if (!win) window.location.href = nativeUrl;
    return;
  }

  // Android + Desktop : utiliser l'URL https standard
  window.open(url, '_blank', 'noopener,noreferrer');
}