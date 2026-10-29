<template>
  <div class="landing">
    <!-- ── Nav ───────────────────────────────────────────────── -->
    <nav class="l-nav">
      <img src="/logo.png" alt="Movyx" class="l-nav-logo" />
      <div class="l-nav-links">
        <a href="mailto:contact@movyx.com" class="l-nav-contact">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
          contact@movyx.com
        </a>
        <RouterLink to="/login" class="btn btn-secondary btn-sm">Se connecter</RouterLink>
        <RouterLink to="/login?mode=register" class="btn btn-primary btn-sm">Créer un compte</RouterLink>
      </div>
    </nav>

    <!-- ── Hero ──────────────────────────────────────────────── -->
    <section class="l-hero">
      <div class="l-hero-content">
        <img src="/logo.png" alt="Movyx" class="l-hero-logo" />
        <h1 class="l-hero-title">La solution numérique<br>dédiée aux podologues</h1>
        <p class="l-hero-desc">Gérez vos patients, réalisez des bilans podologiques complets et exportez en PDF — disponible même hors ligne.</p>
        <div class="l-hero-ctas">
          <RouterLink to="/login?mode=register" class="btn btn-primary btn-lg">Démarrer gratuitement</RouterLink>
          <RouterLink to="/login" class="btn btn-outline btn-lg">Se connecter</RouterLink>
        </div>
        <p class="l-hero-note">Aucune carte bancaire requise • Données stockées localement</p>
      </div>
      <div class="l-hero-visual" aria-hidden="true">
        <div class="l-mockup">
          <div class="l-mockup-bar"><span/><span/><span/></div>
          <div class="l-mockup-tabs">
            <div class="l-mockup-tab active">🩺 Interrogatoire</div>
            <div class="l-mockup-tab">🦾 Motrices</div>
            <div class="l-mockup-tab">📊 Baromètrie</div>
          </div>
          <div class="l-mockup-body">
            <div class="l-mockup-row"><span class="l-mockup-label">Motif</span><span class="l-mockup-val">Douleur plantaire</span></div>
            <div class="l-mockup-row"><span class="l-mockup-label">EVA</span><span class="l-mockup-eva">7/10</span></div>
            <div class="l-mockup-row"><span class="l-mockup-label">Statut</span><span class="l-mockup-badge">finalisé</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────── -->
    <section class="l-features">
      <h2 class="l-section-title">Tout ce dont vous avez besoin</h2>
      <div class="l-features-grid">
        <div v-for="f in features" :key="f.title" class="l-feature-card">
          <div class="l-feature-icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ── Pricing ────────────────────────────────────────────── -->
    <section class="l-pricing">
      <h2 class="l-section-title">Tarifs simples et transparents</h2>
      <p class="l-pricing-sub">Commencez gratuitement. Passez en Pro quand vous êtes prêt.</p>
      <div class="l-pricing-grid">

        <!-- Plan Gratuit -->
        <div class="l-pricing-card">
          <div class="l-pricing-header">
            <div class="l-pricing-badge">Gratuit</div>
            <div class="l-pricing-price">0 <span class="l-pricing-per">€ / mois</span></div>
            <p class="l-pricing-desc-small">Pour découvrir Movyx sans engagement</p>
          </div>
          <ul class="l-pricing-list">
            <li class="included">Jusqu'à 10 patients</li>
            <li class="included">Bilans podologiques complets</li>
            <li class="included">Export PDF des bilans</li>
            <li class="included">Fonctionnement hors ligne</li>
            <li class="excluded">Facturation &amp; comptabilité</li>
            <li class="excluded">Onglets &amp; champs personnalisés</li>
            <li class="excluded">Patients illimités</li>
          </ul>
          <RouterLink to="/login?mode=register" class="btn btn-secondary l-pricing-cta">Démarrer gratuitement</RouterLink>
        </div>

        <!-- Plan Pro -->
        <div class="l-pricing-card l-pricing-card--pro">
          <div class="l-pricing-popular">Recommandé</div>
          <div class="l-pricing-header">
            <div class="l-pricing-badge l-pricing-badge--pro">Pro</div>
            <div class="l-pricing-price">29 <span class="l-pricing-per">€ / mois</span></div>
            <p class="l-pricing-desc-small">Tout ce qu'il faut pour votre cabinet</p>
          </div>
          <ul class="l-pricing-list">
            <li class="included">Patients illimités</li>
            <li class="included">Bilans podologiques complets</li>
            <li class="included">Export PDF des bilans</li>
            <li class="included">Fonctionnement hors ligne</li>
            <li class="included"><strong>Facturation &amp; comptabilité</strong></li>
            <li class="included"><strong>Onglets &amp; champs personnalisés</strong></li>
            <li class="included"><strong>Génération PDF factures</strong></li>
          </ul>
          <button class="btn btn-primary l-pricing-cta" @click="showUpgradeModal = true">
            Passer en Pro — 29 €/mois
          </button>
          <p class="l-pricing-note-small">Sans engagement · Résiliable à tout moment</p>
        </div>

      </div>
    </section>

    <!-- ── Modal Upgrade Pro ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="l-fade">
        <div v-if="showUpgradeModal" class="l-modal-overlay" @click.self="showUpgradeModal = false">
          <div class="l-modal">
            <button class="l-modal-close" @click="showUpgradeModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div v-if="!upgradeSuccess">
              <div class="l-modal-icon">⚡</div>
              <h2 class="l-modal-title">Passer au plan Pro</h2>
              <p class="l-modal-sub">Accédez à toutes les fonctionnalités Movyx pour <strong>29 €/mois</strong></p>

              <div class="l-modal-features">
                <div v-for="f in proFeatures" :key="f" class="l-modal-feature">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52B848" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ f }}
                </div>
              </div>

              <div class="l-mock-payment">
                <p class="l-mock-label">Informations de paiement (simulation)</p>
                <div class="l-mock-card">
                  <input class="l-mock-input" placeholder="•••• •••• •••• ••••" readonly />
                  <div class="l-mock-row">
                    <input class="l-mock-input l-mock-half" placeholder="MM / AA" readonly />
                    <input class="l-mock-input l-mock-half" placeholder="CVV" readonly />
                  </div>
                </div>
              </div>

              <button class="btn btn-primary l-modal-pay" @click="simulateUpgrade" :disabled="upgrading">
                <span v-if="!upgrading">Activer le plan Pro — 29 €/mois</span>
                <span v-else>Activation en cours…</span>
              </button>
              <p class="l-modal-legal">Sans engagement · Résiliable à tout moment · Données locales</p>
            </div>

            <div v-else class="l-upgrade-success">
              <div class="l-success-icon">✓</div>
              <h2>Plan Pro activé !</h2>
              <p>Félicitations ! Vous avez maintenant accès à toutes les fonctionnalités Pro de Movyx.</p>
              <RouterLink to="/login" class="btn btn-primary l-success-cta" @click="showUpgradeModal = false">
                Se connecter maintenant
              </RouterLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Footer ─────────────────────────────────────────────── -->
    <footer class="l-footer">
      <img src="/logo.png" alt="Movyx" class="l-nav-logo" />
      <p>© {{ new Date().getFullYear() }} Movyx — Tous droits réservés</p>
      <a href="mailto:contact@movyx.com" class="l-footer-mail">contact@movyx.com</a>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const features = [
  { icon: '👤', title: 'Répertoire client',        desc: 'Gérez vos patients avec historique complet des consultations, filtres alphabétiques et recherche instantanée.' },
  { icon: '🩺', title: 'Bilans structurés',         desc: 'Interrogatoire, préférences motrices, baromètrie plantaire, schéma corporel et chaînes GDS en un seul espace.' },
  { icon: '📄', title: 'Export PDF professionnel',  desc: 'Générez des PDF complets incluant annotations, schéma corporel, et toutes les données du bilan.' },
  { icon: '🧾', title: 'Facturation complète',      desc: 'Créez vos factures en un clic depuis la fiche patient, générez des PDF pro et suivez vos encaissements.' },
  { icon: '⚙️', title: 'Personnalisation totale',   desc: 'Créez vos propres onglets, ajoutez des champs sur mesure, adaptez l\'application à votre pratique.' },
  { icon: '📡', title: 'Hors ligne',                desc: 'Toutes vos données sont stockées localement. L\'application fonctionne sans connexion internet.' },
]

// ── Upgrade modal ──────────────────────────────────────────────────────────
const showUpgradeModal = ref(false)
const upgrading        = ref(false)
const upgradeSuccess   = ref(false)

const proFeatures = [
  'Patients illimités',
  'Module Facturation complet',
  'Génération PDF factures professionnels',
  'Comptabilité avec KPIs & export CSV',
  'Onglets & champs personnalisés',
  'Support prioritaire',
]

async function simulateUpgrade() {
  upgrading.value = true
  await new Promise(r => setTimeout(r, 1800))
  upgrading.value = false
  upgradeSuccess.value = true
}
</script>

<style scoped>
/* ── Layout ─── */
.landing { min-height: 100dvh; display: flex; flex-direction: column; background: var(--color-bg); overflow-x: hidden; }

/* ── Nav ─── */
.l-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px; border-bottom: 1px solid var(--color-border);
  background: var(--color-surface); position: sticky; top: 0; z-index: 100;
}
.l-nav-logo { height: 38px; width: auto; object-fit: contain; }
.l-nav-links { display: flex; align-items: center; gap: 16px; }
.l-nav-contact {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); color: var(--color-text-muted);
  transition: color var(--transition-fast);
}
.l-nav-contact:hover { color: var(--color-primary); }

/* ── Hero ─── */
.l-hero {
  display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, #f0fdf4 100%);
  max-width: 1280px; margin: 0 auto; width: 100%;
}
.l-hero-logo { height: 80px; width: auto; object-fit: contain; margin-bottom: 24px; }
.l-hero-title { font-size: clamp(28px, 4vw, 48px); font-weight: 800; line-height: 1.15; color: var(--color-text); margin-bottom: 20px; }
.l-hero-desc { font-size: var(--text-lg); color: var(--color-text-muted); max-width: 480px; margin-bottom: 32px; line-height: 1.6; }
.l-hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.btn-outline {
  background: transparent; border: 2px solid var(--color-primary); color: var(--color-primary);
  padding: 10px 24px; border-radius: var(--radius-md); font-weight: 600; transition: all var(--transition-fast);
}
.btn-outline:hover { background: var(--color-primary-light); }
.btn-lg { padding: 12px 28px; font-size: var(--text-base); }
.l-hero-note { font-size: var(--text-xs); color: var(--color-text-light); }

/* Mockup */
.l-hero-visual { display: flex; justify-content: center; }
.l-mockup {
  width: 100%; max-width: 400px; background: var(--color-surface);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-xl);
  overflow: hidden; border: 1px solid var(--color-border);
}
.l-mockup-bar { display: flex; gap: 6px; padding: 12px 16px; background: var(--color-surface-alt); }
.l-mockup-bar span { width: 12px; height: 12px; border-radius: 50%; background: var(--color-border); }
.l-mockup-bar span:nth-child(1) { background: #ff5f57; }
.l-mockup-bar span:nth-child(2) { background: #febc2e; }
.l-mockup-bar span:nth-child(3) { background: #28c840; }
.l-mockup-tabs { display: flex; gap: 4px; padding: 12px 12px 0; border-bottom: 1px solid var(--color-border); }
.l-mockup-tab { padding: 8px 14px; font-size: 12px; color: var(--color-text-muted); border-radius: var(--radius-md) var(--radius-md) 0 0; cursor: default; }
.l-mockup-tab.active { background: var(--color-primary-light); color: var(--color-primary); font-weight: 600; }
.l-mockup-body { padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.l-mockup-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--color-surface-alt); border-radius: var(--radius-md); }
.l-mockup-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.l-mockup-val { font-size: 12px; color: var(--color-text); }
.l-mockup-eva { font-size: 12px; font-weight: 700; color: #ef4444; }
.l-mockup-badge { font-size: 11px; padding: 3px 10px; background: #dcfce7; color: #16a34a; border-radius: var(--radius-full); font-weight: 600; }

/* ── Features ─── */
.l-features { padding: 80px 40px; max-width: 1280px; margin: 0 auto; width: 100%; }
.l-section-title { font-size: clamp(22px, 3vw, 36px); font-weight: 800; text-align: center; margin-bottom: 48px; color: var(--color-text); }
.l-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.l-feature-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: 28px; transition: all var(--transition-base);
}
.l-feature-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.l-feature-icon { font-size: 36px; margin-bottom: 16px; }
.l-feature-card h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: 10px; color: var(--color-text); }
.l-feature-card p { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.6; }

/* ── Pricing ─── */
.l-pricing { padding: 80px 40px; background: var(--color-surface-alt); }
.l-pricing-sub { text-align: center; color: var(--color-text-muted); font-size: var(--text-md); margin-top: -32px; margin-bottom: 48px; }
.l-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; max-width: 840px; margin: 0 auto; }
.l-pricing-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: 36px; display: flex; flex-direction: column; gap: 20px;
  position: relative;
}
.l-pricing-card--pro { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary), var(--shadow-lg); }
.l-pricing-popular {
  position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
  background: var(--color-primary); color: white;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  padding: 3px 16px; border-radius: var(--radius-full);
}
.l-pricing-header { display: flex; flex-direction: column; gap: 8px; }
.l-pricing-badge { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); }
.l-pricing-badge--pro { color: var(--color-primary); }
.l-pricing-price { font-size: 42px; font-weight: 800; color: var(--color-text); line-height: 1; }
.l-pricing-per  { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-muted); }
.l-pricing-desc-small { font-size: var(--text-sm); color: var(--color-text-muted); }
.l-pricing-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.l-pricing-list li { font-size: var(--text-sm); color: var(--color-text-muted); padding-left: 22px; position: relative; }
.l-pricing-list li.included::before  { content: '✓'; position: absolute; left: 0; color: var(--color-accent); font-weight: 700; }
.l-pricing-list li.excluded { opacity: .45; }
.l-pricing-list li.excluded::before { content: '✗'; position: absolute; left: 0; color: var(--color-text-light); font-weight: 700; }
.l-pricing-cta  { width: 100%; justify-content: center; }
.l-pricing-note-small { font-size: 11px; color: var(--color-text-light); text-align: center; }

/* ── Modal upgrade ─── */
.l-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.l-modal {
  background: var(--color-surface); border-radius: 24px; padding: 40px;
  max-width: 480px; width: 100%; position: relative; box-shadow: 0 24px 64px rgba(0,0,0,.18);
}
.l-modal-close {
  position: absolute; top: 16px; right: 16px;
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--color-text-muted); transition: all 150ms;
}
.l-modal-close:hover { background: var(--color-border); color: var(--color-text); }
.l-modal-icon  { font-size: 40px; text-align: center; margin-bottom: 16px; }
.l-modal-title { font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 8px; color: var(--color-text); }
.l-modal-sub   { text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); margin-bottom: 24px; }
.l-modal-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; background: var(--color-surface-alt); border-radius: 12px; padding: 16px; }
.l-modal-feature { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); color: var(--color-text); }
.l-mock-payment { margin-bottom: 20px; }
.l-mock-label  { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
.l-mock-card   { display: flex; flex-direction: column; gap: 8px; }
.l-mock-input  {
  width: 100%; padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--color-border); background: var(--color-surface-alt);
  font-size: var(--text-sm); color: var(--color-text-light); cursor: not-allowed;
  font-family: monospace;
}
.l-mock-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.l-modal-pay   { width: 100%; justify-content: center; font-size: var(--text-md); padding: 14px; }
.l-modal-legal { font-size: 11px; color: var(--color-text-light); text-align: center; margin-top: 10px; }

.l-upgrade-success { text-align: center; padding: 20px 0; }
.l-success-icon {
  width: 72px; height: 72px; background: #dcfce7; color: #15803d;
  border-radius: 50%; font-size: 36px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px; font-weight: 700;
}
.l-upgrade-success h2 { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
.l-upgrade-success p  { color: var(--color-text-muted); font-size: var(--text-sm); line-height: 1.6; }
.l-success-cta { margin-top: 24px; }

.l-fade-enter-active, .l-fade-leave-active { transition: opacity 200ms; }
.l-fade-enter-from,   .l-fade-leave-to     { opacity: 0; }

/* ── Footer ─── */
.l-footer {
  padding: 40px; text-align: center; border-top: 1px solid var(--color-border);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: var(--color-surface);
}
.l-footer p { font-size: var(--text-sm); color: var(--color-text-muted); }
.l-footer-mail { font-size: var(--text-sm); color: var(--color-primary); font-weight: 500; }
.l-footer-mail:hover { text-decoration: underline; }

/* ── Responsive ─── */
@media (max-width: 900px) {
  .l-hero { grid-template-columns: 1fr; padding: 48px 24px; gap: 40px; text-align: center; }
  .l-hero-desc { max-width: 100%; }
  .l-hero-ctas { justify-content: center; }
  .l-hero-visual { display: none; }
  .l-nav { padding: 12px 20px; }
  .l-features, .l-pricing { padding: 48px 20px; }
}
@media (max-width: 480px) {
  .l-nav-contact { display: none; }
}
</style>
