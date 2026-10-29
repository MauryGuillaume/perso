/* exemple.js — chaque format passe par affichage.js (window.fr). */
(function () {
  const lignes = [
    ['Prix', fr.prix(1234.5)], ['Prix TTC de 100 € HT', fr.prix(fr.ttc(100))], ['Pourcentage', fr.pourcent(0.205)],
    ['Date', fr.date('2026-10-22')], ['Date longue', fr.date('2026-10-22', 'jour')], ['Date et heure', fr.dateHeure('2026-10-22T12:30:00Z')],
    ['Relatif', fr.relatif(Date.now() - 3 * 86400000)], ['Téléphone', fr.telephone('0612345678')],
    ['Pluriel', fr.pluriel(3, 'rendez-vous', 'rendez-vous')], ['Liste', fr.liste(['Paris', 'Lyon', 'Lille'])], ['Taille', fr.taille(1234567)]
  ];
  const ul = document.getElementById('formats');
  lignes.forEach(([libelle, valeur]) => {
    const li = document.createElement('li');
    li.textContent = `${libelle} : ${valeur}`;
    ul.appendChild(li);
  });
  const etat = () => { document.getElementById('etat').textContent = `Mesure d’audience : ${consentement.a('mesure') ? 'acceptée' : 'non acceptée'}`; };
  window.addEventListener('consentement', etat);
  etat();
})();
