/* dictee.js — Notix : reconnaissance vocale. Un seul point d'entrée pour les deux cas :
   - app mobile (Capacitor) : plugin Speech Recognition du téléphone s'il est installé ;
   - navigateur : Web Speech API (SpeechRecognition), en mode local quand le navigateur le propose.
   demarrer({ langue, surPartiel, surFinal, surEtat, surErreur }) → { arreter() } */
(function () {
  'use strict';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const ANDROID = /Android/i.test(navigator.userAgent);

  const MESSAGES = {
    'not-allowed': 'Micro refusé. Autorisez le micro pour Notix dans les réglages du navigateur, puis réessayez.',
    'service-not-allowed': 'La dictée est bloquée par ce navigateur. Écrivez la note au clavier.',
    'audio-capture': 'Aucun micro trouvé sur cet appareil.',
    network: 'Pas de connexion : dans ce navigateur, la dictée a besoin d’Internet. Écrivez la note au clavier ou réessayez.',
    'language-not-supported': 'Cette langue n’est pas disponible pour la dictée sur cet appareil. Changez-la dans Réglages.',
    'bad-grammar': 'La dictée s’est arrêtée. Réessayez.'
  };

  function plugin() {
    const C = window.Capacitor;
    return C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && C.Plugins && C.Plugins.SpeechRecognition || null;
  }

  /** 'natif' (app mobile), 'web' (navigateur) ou null (pas de dictée possible). */
  function mode() { return plugin() ? 'natif' : SR ? 'web' : null; }

  /** Dictée sur l'appareil dans le navigateur : 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'inconnu'. */
  async function etatLocal(langue) {
    if (!SR || plugin()) return 'inconnu';
    try {
      let question = null;
      if (typeof SR.available === 'function') question = SR.available({ langs: [langue], processLocally: true });
      else if (typeof SR.availableOnDevice === 'function') question = SR.availableOnDevice(langue);
      // Sans réponse en 1,5 s, on considère le mode local indisponible (l'écran ne reste pas bloqué)
      if (question) return await Promise.race([question, new Promise(r => setTimeout(() => r('inconnu'), 1500))]);
    } catch (e) { /* navigateur sans mode local */ }
    return 'inconnu';
  }

  /** Télécharge la langue pour la dictée sur l'appareil (Chrome). Doit suivre un geste de l'utilisateur. */
  async function installerLocal(langue) {
    if (SR && typeof SR.install === 'function') return SR.install({ langs: [langue], processLocally: true });
    if (SR && typeof SR.installOnDevice === 'function') return SR.installOnDevice(langue);
    return false;
  }

  /** Phrase affichée à l'utilisateur : où part l'audio. */
  async function origineAudio(langue) {
    const m = mode();
    if (m === 'natif') return { local: false, texte: 'Dans l’app, la dictée utilise la reconnaissance vocale du téléphone. Selon le téléphone et ses réglages, l’audio peut être envoyé à Apple (iPhone) ou à Google (Android) pour être transcrit. Notix n’envoie rien d’autre : vos notes restent sur l’appareil.' };
    if (!m) return { local: false, texte: 'Ce navigateur ne propose pas la dictée. Vous pouvez écrire vos notes au clavier ; elles restent sur cet appareil.' };
    if (await etatLocal(langue) === 'available') return { local: true, texte: 'La dictée se fait sur cet appareil : l’audio ne quitte pas le téléphone. Vos notes restent aussi sur l’appareil.' };
    return { local: false, texte: 'Dans ce navigateur, l’audio de la dictée est envoyé au service de reconnaissance vocale du navigateur (Google pour Chrome, Apple pour Safari, Microsoft pour Edge) pour être transcrit. Notix n’envoie rien d’autre : vos notes restent sur cet appareil.' };
  }

  function demarrerWeb(o) {
    let actif = true, rec = null, demarre = false, relances = [];
    const local = o.local === true;
    function lancer() {
      rec = new SR();
      rec.lang = o.langue || 'fr-FR';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      // Sur Android, le mode continu répète les phrases : une phrase par session, relancée aussitôt
      rec.continuous = !ANDROID;
      if (local) { try { rec.processLocally = true; } catch (e) { /* ignoré */ } }
      rec.onstart = () => { if (!demarre) { demarre = true; o.surEtat('ecoute'); } };
      rec.onresult = e => {
        let partiel = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) o.surFinal(r[0].transcript); else partiel += r[0].transcript;
        }
        o.surPartiel(partiel);
      };
      rec.onerror = e => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        actif = false;
        o.surErreur(MESSAGES[e.error] || 'La dictée s’est arrêtée (' + e.error + '). Réessayez.');
      };
      rec.onend = () => {
        o.surPartiel('');
        // Le navigateur coupe après un silence : on relance tant que l'utilisateur n'a pas arrêté
        const t = Date.now();
        relances = relances.filter(x => t - x < 3000).concat(t);
        if (actif && relances.length < 6) { try { lancer(); return; } catch (err) { /* relance impossible */ } }
        actif = false;
        o.surEtat('arret');
      };
      rec.start();
    }
    try { lancer(); } catch (e) { actif = false; setTimeout(() => o.surErreur('La dictée n’a pas pu démarrer. Réessayez.'), 0); }
    return { arreter() { if (!actif) return; actif = false; try { rec.stop(); } catch (e) { o.surEtat('arret'); } } };
  }

  function demarrerNatif(o) {
    const P = plugin();
    let actif = true, courant = '', ecouteurs = [];
    const options = { language: o.langue || 'fr-FR', partialResults: true, popup: false, maxResults: 1 };
    const fin = () => { ecouteurs.forEach(x => x && x.remove && x.remove()); ecouteurs = []; o.surEtat('arret'); };
    const echec = msg => { actif = false; fin(); o.surErreur(msg); };
    (async () => {
      try {
        const perm = await P.requestPermissions();
        if (perm && perm.speechRecognition && perm.speechRecognition !== 'granted') return echec(MESSAGES['not-allowed']);
        ecouteurs.push(await P.addListener('partialResults', d => { courant = (d && d.matches && d.matches[0]) || ''; o.surPartiel(courant); }));
        ecouteurs.push(await P.addListener('listeningState', d => {
          if (!d || d.status !== 'stopped') return;
          if (courant) { o.surFinal(courant); courant = ''; o.surPartiel(''); }
          if (actif) P.start(options).catch(() => { actif = false; fin(); }); else fin();
        }));
        await P.start(options);
        o.surEtat('ecoute');
      } catch (e) { echec('La dictée n’a pas pu démarrer. Vérifiez l’autorisation du micro.'); }
    })();
    return { arreter() { if (!actif) return; actif = false; P.stop().catch(() => fin()); } };
  }

  /** Synchrone : doit être appelé directement depuis le toucher du bouton (Safari l'exige).
      o.local = true si etatLocal() a répondu 'available' auparavant. */
  function demarrer(o) {
    const m = mode();
    if (m === 'natif') return demarrerNatif(o);
    if (m === 'web') return demarrerWeb(o);
    throw new Error('La dictée n’est pas disponible dans ce navigateur.');
  }

  window.notixDictee = { mode, etatLocal, installerLocal, origineAudio, demarrer };
})();
