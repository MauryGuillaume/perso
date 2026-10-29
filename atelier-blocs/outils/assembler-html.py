# outils/assembler-html.py — regénère atelier-blocs.html (fichier unique) à partir de index.html et des fichiers .js / .css.
# Usage : python3 outils/assembler-html.py . > atelier-blocs.html
import re, sys, os
d = sys.argv[1]
html = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
def css(m):
    return '<style>\n' + open(os.path.join(d, m.group(1)), encoding='utf-8').read() + '\n</style>'
def js(m):
    src = open(os.path.join(d, m.group(1)), encoding='utf-8').read()
    return '<script>/* ' + m.group(1) + ' */\n' + re.sub(r'</(script)', lambda m: '<\\/' + m.group(1), src, flags=re.I) + '\n</script>'
html = re.sub(r'<link rel="stylesheet" href="([\w.-]+\.css)">', css, html)
html = re.sub(r'<script src="([\w.-]+\.js)"></script>', js, html)
sys.stdout.write(html)
