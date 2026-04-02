import re
import os
import sys

file_path = r'c:\Users\willi\OneDrive\Desktop\MyRotina-Provisional-name\Rotina.html'

if not os.path.exists('src'):
    os.makedirs('src')

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if style_match:
    with open('src/style.css', 'w', encoding='utf-8') as f:
        # Include tailwind base
        f.write('@import "tailwindcss";\n')
        f.write(style_match.group(1))

# Extract the main script. Look for the script block that doesn't have src=
script_match = re.search(r'<script>((?!src=).*?)</script>', html, re.DOTALL)
if script_match:
    # There could be multiple scripts. The largest one is the logic.
    scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
    main_script = max(scripts, key=len)
    with open('src/main.js', 'w', encoding='utf-8') as f:
        f.write(main_script)

# Remove the script block and style block from HTML, inject module script and css link
html = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="./src/style.css">', html, flags=re.DOTALL)
# Remove all scripts except the ones with src
# Wait, let's just strip the large inline script and replace with module
html = re.sub(r'<script>(\s*const\s*DEMO_HABIT_NAMES.*|\s*const\s*STORAGE_KEYS.*?)</script>', '<script type="module" src="./src/main.js"></script>', html, flags=re.DOTALL)
# A safer way to replace inline scripts over 1000 chars:
def replacer(m):
    if len(m.group(0)) > 1000:
        return '<script type="module" src="./src/main.js"></script>'
    return m.group(0)

html = re.sub(r'<script>.*?</script>', replacer, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Split success!")
