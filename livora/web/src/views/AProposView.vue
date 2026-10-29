<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>À propos</h1></header>

    <section class="bloc card bloc--alerte">
      <h2 class="bloc-titre">Avertissement santé</h2>
      <p>Livora propose des conseils généraux de sport, d'alimentation et de sommeil. Ils ne remplacent pas l'avis d'un médecin, d'un diététicien ou d'un kinésithérapeute.</p>
      <p>Avant de reprendre le sport après une longue pause, en cas de maladie, de grossesse, de traitement ou de douleur, demande l'avis d'un professionnel de santé. Arrête l'exercice en cas de douleur, d'essoufflement inhabituel ou de malaise.</p>
      <p>Les programmes et recettes générés automatiquement peuvent contenir des erreurs : vérifie toujours les ingrédients si tu as une allergie.</p>
    </section>

    <section class="bloc card">
      <h2 class="bloc-titre">Tes données</h2>
      <p>Dans cette version, tout ce que tu saisis (questionnaire, séances, pesées, sommeil) reste <strong>sur ton appareil</strong>, dans le stockage du navigateur. Rien n'est envoyé à un serveur Livora.</p>
      <p>Si tu as configuré une clé d'IA pour générer ton programme, tes réponses au questionnaire sont envoyées à ce service pour la génération uniquement.</p>
      <p>Tu peux tout effacer à tout moment depuis <RouterLink to="/reglages" class="lien">Réglages</RouterLink>, ou exporter tes réponses depuis le questionnaire.</p>
    </section>

    <section class="bloc card">
      <h2 class="bloc-titre">Éditeur</h2>
      <p>Livora — application personnelle en cours de développement. Les mentions légales complètes (éditeur, hébergeur, contact) seront ajoutées avant toute mise en ligne publique.</p>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 560px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.bloc { padding: var(--space-md); margin-bottom: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); font-size: var(--text-sm); line-height: 1.55; }
.bloc--alerte { border-left: 5px solid var(--color-warn); }
.bloc-titre { font-size: var(--text-lg); }
.lien { text-decoration: underline; font-weight: 600; }
</style>
