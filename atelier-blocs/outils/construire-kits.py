#!/usr/bin/env python3
"""construire-kits.py — regénère kit-base.js de l'Atelier et les ZIP téléchargeables à partir des dossiers de kits.

   python3 outils/construire-kits.py <dossier des kits> <kit-base.js à écrire> [<dossier des ZIP>]

Chaque dossier de kit contient kit.json (définition pour l'Atelier) et ses fichiers (README.md, PROMPT.md, KIT.md…).
- kit-base.js : un AB.kits.declarer(...) par kit ; reference = KIT.md ; fichiersFournis = tous les fichiers sauf kit.json
  (les binaires en « data:;base64,… »).
- ZIP : <id>-v<version>.zip avec le dossier <id>/ (fichiers + kit-atelier.json), réimportable dans l'Atelier,
  et kits-atelier-tous.zip (un dossier par kit + LISEZMOI.md)."""
import json, os, sys, base64, zipfile, datetime

ORDRE = ['app-complete', 'securite-renforcee', 'base-projet', 'base-auto', 'bases-donnees', 'socle-pwa', 'charte-base', 'securite-base', 'affichage-fr']
IGNORER = {'node_modules', '.DS_Store'}

source, cible = sys.argv[1], sys.argv[2]
sortie_zip = sys.argv[3] if len(sys.argv) > 3 else None
dossiers = [d for d in sorted(os.listdir(source)) if os.path.isfile(os.path.join(source, d, 'kit.json'))]
dossiers.sort(key=lambda d: ORDRE.index(d) if d in ORDRE else len(ORDRE))

def fichiers_du_kit(racine):
    out = {}
    for base, sous, noms in os.walk(racine):
        sous[:] = sorted(s for s in sous if s not in IGNORER)
        for n in sorted(noms):
            if n in IGNORER: continue
            chemin = os.path.relpath(os.path.join(base, n), racine).replace(os.sep, '/')
            if chemin == 'kit.json': continue
            out[chemin] = open(os.path.join(base, n), 'rb').read()
    return out

def texte_ou_data(octets):
    try:
        t = octets.decode('utf-8')
        if '\x00' not in t: return t
    except UnicodeDecodeError: pass
    return 'data:;base64,' + base64.b64encode(octets).decode('ascii')

kits = []
for d in dossiers:
    defn = json.load(open(os.path.join(source, d, 'kit.json'), encoding='utf-8'))
    fichiers = fichiers_du_kit(os.path.join(source, d))
    if 'KIT.md' in fichiers: defn['reference'] = fichiers['KIT.md'].decode('utf-8')
    kits.append((d, defn, fichiers))

entete = """/* ==========================================================================
   kit-base.js — kits fournis avec la plateforme. FICHIER GÉNÉRÉ : ne pas modifier à la main.
   Source : un dossier par kit (kit.json + README.md, PROMPT.md, KIT.md, outils, modèles, exemples),
   assemblé par outils/construire-kits.py le %s.
   Chaque kit est installé une fois (id@version) avec ses fichiers (onglet Fichiers du kit) ;
   une modification dans l'écran « Kits » crée une nouvelle version.
   ========================================================================== */
""" % datetime.date.today().isoformat()
parties = [entete]
for d, defn, fichiers in kits:
    js = dict(defn)
    js['fichiersFournis'] = {c: texte_ou_data(o) for c, o in fichiers.items()}
    parties.append('/* Kit « %s » v%s — %d fichiers */\nAB.kits.declarer(%s);\n' % (defn['nom'], defn['version'], len(fichiers), json.dumps(js, ensure_ascii=False, indent=1)))
open(cible, 'w', encoding='utf-8').write('\n'.join(parties))
print('%s : %d kits, %d octets' % (cible, len(kits), os.path.getsize(cible)))

if sortie_zip:
    os.makedirs(sortie_zip, exist_ok=True)
    date = datetime.datetime.now().timetuple()[:6]
    def ajouter(z, chemin, octets):
        info = zipfile.ZipInfo(chemin, date_time=date)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, octets)
    tous = zipfile.ZipFile(os.path.join(sortie_zip, 'kits-atelier-tous.zip'), 'w')
    lignes = ['# Kits de l’Atelier de Blocs', '', 'Un dossier par kit. Dans chacun : `README.md` (à lire d’abord), `PROMPT.md` (prompt d’entrée pour Claude),',
              '`KIT.md` (référence complète), les fichiers prêts et l’outil de recette. `kit-atelier.json` sert au réimport',
              'dans l’Atelier (Kits → Importer un kit : ce ZIP entier ou le ZIP d’un seul kit).', '',
              '| Dossier | Kit | Version | Fichiers |', '| --- | --- | --- | --- |']
    for d, defn, fichiers in kits:
        nom = '%s-v%s.zip' % (defn['id'], defn['version'])
        definition = json.dumps(defn, ensure_ascii=False, indent=2).encode('utf-8')
        with zipfile.ZipFile(os.path.join(sortie_zip, nom), 'w') as z:
            for c, o in fichiers.items(): ajouter(z, '%s/%s' % (defn['id'], c), o)
            ajouter(z, '%s/kit-atelier.json' % defn['id'], definition)
        for c, o in fichiers.items(): ajouter(tous, '%s/%s' % (defn['id'], c), o)
        ajouter(tous, '%s/kit-atelier.json' % defn['id'], definition)
        lignes.append('| `%s/` | %s | %s | %d |' % (defn['id'], defn['nom'], defn['version'], len(fichiers)))
        print('  %-36s %3d fichiers' % (nom, len(fichiers)))
    ajouter(tous, 'LISEZMOI.md', ('\n'.join(lignes) + '\n').encode('utf-8'))
    tous.close()
    print('  kits-atelier-tous.zip')
