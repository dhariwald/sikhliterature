'''Builds every reading page and index from contents.yml.

Only readings that actually exist as .md files under docs/ become pages. A
reading listed in contents.yml but not yet written is counted, so each text
still says how far along it is, but it gets no page, no link and no line in
the sidebar -- nothing empty to click into.

Nothing in here needs editing to add readings; edit contents.yml instead.
'''

import html as _html
import os
import re
import yaml
from mkdocs.structure.files import File

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load():
    with open(os.path.join(_ROOT, 'contents.yml'), encoding='utf8') as fh:
        return yaml.safe_load(fh)['texts']


def _uri(text, div, n):
    unit = text['unit'].lower()
    return text['slug'] + '/' + div['slug'] + '/' + unit + '-' + str(n).zfill(2) + '.md'


# Audio readings live under docs/audio/, mirroring the reading's own path:
#   docs/suraj-prakash/ras-2/ansu-24.md  ->  docs/audio/suraj-prakash/ras-2/ansu-24.m4a
# Any of these formats will do; the first one found is used.
AUDIO_DIR = 'audio'
AUDIO_EXTS = ('.m4a', '.mp3', '.aac', '.ogg', '.opus', '.wav', '.flac', '.webm')
_AUDIO_TYPES = {'.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.aac': 'audio/aac',
                '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
                '.flac': 'audio/flac', '.webm': 'audio/webm'}


def _audio_for(src_uri):
    '''Candidate audio paths (relative to docs/) for a reading's .md path.'''
    stem = src_uri[:-3] if src_uri.endswith('.md') else src_uri
    return [AUDIO_DIR + '/' + stem + ext for ext in AUDIO_EXTS]


_H2 = re.compile(r'^##\s+(.*?)\s*#*\s*$')


def _header(path):
    '''The short descriptive header of a reading: its first "## " line,
    without footnote markers or markdown emphasis. '' if there is none.'''
    try:
        with open(path, encoding='utf8') as fh:
            in_fence = False
            for line in fh:
                if _FENCE.match(line):
                    in_fence = not in_fence
                    continue
                m = None if in_fence else _H2.match(line.rstrip('\n'))
                if m:
                    t = re.sub(r'\[\^[^\]]*\]', '', m.group(1))
                    t = re.sub(r'[*_`]', '', t).strip()
                    return t
    except OSError:
        pass
    return ''


# The next posted reading after each one, filled in by on_files:
#   'panth-prakash/volume-1/episode-15.md' -> ('panth-prakash/volume-1/episode-16.md', 'Episode 16', 'header')
_NEXT = {}

# Gurmukhi fonts dropped into docs/assets/fonts/ are offered in the Reader
# panel automatically. The list is written to a small script at build time.
FONT_DIR = 'assets/fonts'
FONT_EXTS = ('.woff2', '.woff', '.ttf', '.otf')


def _font_list(docs_dir):
    folder = os.path.join(docs_dir, FONT_DIR)
    fams = {}
    if not os.path.isdir(folder):
        return []
    for name in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in FONT_EXTS:
            continue
        low = stem.lower()
        weight = 700 if 'bold' in low else 400
        style = 'italic' if 'italic' in low else 'normal'
        fam = re.sub(r'[-_ ]?(regular|bold|italic|book|normal|medium)\b', '', stem, flags=re.I)
        fam = re.sub(r'[-_]+', ' ', fam).strip() or stem
        fam = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', fam)
        fam = ' '.join(w[:1].upper() + w[1:] for w in fam.split())
        entry = fams.setdefault(fam, {'id': 'local-' + re.sub(r'[^a-z0-9]+', '-', fam.lower()).strip('-'),
                                      'name': fam, 'family': fam, 'faces': []})
        entry['faces'].append({'url': 'fonts/' + name, 'weight': weight, 'style': style})
    return list(fams.values())


def _total(text):
    return sum(d['to'] - d['from'] + 1 for d in text['divisions'])


def on_files(files, config):
    docs_dir = config['docs_dir']
    existing = set(f.src_uri for f in files)
    add = []

    def generate(src_uri, lines):
        if src_uri in existing:
            return
        add.append(File.generated(config, src_uri, content='\n'.join(lines)))

    def posted(src_uri):
        return os.path.exists(os.path.join(docs_dir, src_uri))

    def voiced(src_uri):
        return any(os.path.exists(os.path.join(docs_dir, a)) for a in _audio_for(src_uri))

    def numbers(text, div):
        '''The readings of this division that have actually been written.'''
        return [n for n in range(div['from'], div['to'] + 1) if posted(_uri(text, div, n))]

    texts = _load()

    # ---- the reading order, for the "next" link on each page --------------
    _NEXT.clear()
    for text in texts:
        order = []
        for div in text['divisions']:
            for n in numbers(text, div):
                order.append((_uri(text, div, n), text['unit'] + ' ' + str(n), div['title']))
        for a, b in zip(order, order[1:]):
            name = b[1] if a[2] == b[2] else b[2] + ', ' + b[1]   # say so when it crosses a Ras / volume
            _NEXT[a[0]] = (b[0], name, _header(os.path.join(docs_dir, b[0])))

    # ---- the Gurmukhi fonts on offer -------------------------------------
    import json
    fonts = _font_list(docs_dir)
    add.append(File.generated(config, 'assets/gurmukhi-fonts.js', content=(
        '/* Generated at build time from docs/assets/fonts/. Do not edit. */\n'
        'window.SIKHLIT_FONTS = (function () {\n'
        '  var base = (document.currentScript && document.currentScript.src) || location.href;\n'
        '  var list = ' + json.dumps(fonts, ensure_ascii=False) + ';\n'
        '  list.forEach(function (f) { f.faces.forEach(function (x) { x.url = new URL(x.url, base).href; }); });\n'
        '  return list;\n'
        '})();\n')))

    # ---- home ------------------------------------------------------------
    home = ['# Sikh Literature', '']
    for text in texts:
        live = sum(len(numbers(text, d)) for d in text['divisions'])
        if live:
            home.append('## [' + text['title'] + '](' + text['slug'] + '/index.md)')
        else:
            home.append('## ' + text['title'])
        home.append('')
        if text.get('subtitle'):
            home.append('*' + text['subtitle'] + '*')
            home.append('')
        home.append(str(live) + ' of ' + str(_total(text)) + ' posted.')
        home.append('')
    generate('index.md', home)

    # ---- one index per text, one per division ----------------------------
    for text in texts:
        unit = text['unit']
        slug = unit.lower()

        index = ['# ' + text['title'], '']
        if text.get('subtitle'):
            index += ['*' + text['subtitle'] + '*', '']

        any_live = False
        for div in text['divisions']:
            live = numbers(text, div)
            if not live:
                continue          # an empty Ras / volume / chapter is left out entirely
            any_live = True

            span = str(len(live)) + ' of ' + str(div['to'] - div['from'] + 1)
            guru = (' <span class="div-guru"><span class="div-sep">&mdash; </span>' + _html.escape(div['guru']) + '</span>') if div.get('guru') else ''
            index += ['## ' + div['title'] + guru, '', '*' + span + ' posted.*', '']
            division = ['# ' + text['title'] + ' &middot; ' + div['title'] + guru, '',
                        '*' + span + ' posted.*', '']

            for n in live:
                name = unit + ' ' + str(n)
                leaf = slug + '-' + str(n).zfill(2) + '.md'
                tag = ' &middot; *audio*' if voiced(_uri(text, div, n)) else ''
                head = _header(os.path.join(docs_dir, _uri(text, div, n)))
                desc = (' <span class="idx-head">' + _html.escape(head) + '</span>') if head else ''
                index.append('- [' + name + '](' + div['slug'] + '/' + leaf + ')' + desc + tag)
                division.append('- [' + name + '](' + leaf + ')' + desc + tag)

            index.append('')
            division += ['', '[All of ' + text['title'] + '](../index.md)']
            generate(text['slug'] + '/' + div['slug'] + '/index.md', division)

        if not any_live:
            continue
        generate(text['slug'] + '/index.md', index)

    for f in add:
        files.append(f)
    return files


# --------------------------------------------------------------------------
# The contents sidebar is worth the space only when a page really has
# subsections. A reading is a title, one chapter heading and its notes; a
# table of contents for that is just the page's own name repeated back.
# --------------------------------------------------------------------------

_FENCE = re.compile(r'^\s*(```|~~~)')
_HEAD = re.compile(r'^(#{2,6})\s+(.*?)\s*#*\s*$')
_SKIP = {'notes', 'note'}


def _has_subsections(markdown):
    in_fence = False
    h2 = h3 = 0
    for line in markdown.splitlines():
        if _FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = _HEAD.match(line)
        if not m:
            continue
        title = re.sub(r'[*_`\[\]]', '', m.group(2)).strip().lower()
        if title in _SKIP:
            continue
        level = len(m.group(1))
        if level == 2:
            h2 += 1
        elif level == 3:
            h3 += 1
    return h2 > 1 or h3 > 1


def _find_audio(page, files):
    '''(url, mime) of this reading's audio, or None.

    An `audio:` line in the page's front matter wins (a full URL, for audio
    hosted somewhere else); otherwise docs/audio/<same path>.<ext> is used.'''
    given = page.meta.get('audio')
    if given:
        ext = os.path.splitext(str(given).split('?')[0])[1].lower()
        return str(given), _AUDIO_TYPES.get(ext, '')
    for path in _audio_for(page.file.src_uri):
        f = files.get_file_from_path(path)
        if f is not None:
            ext = os.path.splitext(path)[1].lower()
            return f.url_relative_to(page.file), _AUDIO_TYPES.get(ext, '')
    return None


def on_page_markdown(markdown, page, config, files):
    page.meta['_audio'] = _find_audio(page, files)
    if _has_subsections(markdown):
        return markdown
    hide = list(page.meta.get('hide') or [])
    if 'toc' not in hide:
        hide.append('toc')
    page.meta['hide'] = hide
    return markdown


def _next_link(page, files):
    nxt = _NEXT.get(page.file.src_uri)
    if not nxt:
        return ''
    f = files.get_file_from_path(nxt[0])
    if f is None:
        return ''
    head = ('<span class="rdr-next__head">' + _html.escape(nxt[2]) + '</span>') if nxt[2] else ''
    return ('<a class="rdr-next" href="' + _html.escape(f.url_relative_to(page.file), quote=True) + '">'
            '<span class="rdr-next__label">Next</span>'
            '<span class="rdr-next__name">' + _html.escape(nxt[1]) + ' &rarr;</span>' + head + '</a>\n')


# Where the notes begin: a "Notes" heading (with the rule above it), or
# failing that the footnote list itself.
_NOTES = re.compile(r'(?:<hr\s*/?>\s*)?<h[1-6][^>]*\bid="notes?"|<div class="footnote">', re.I)


def on_page_content(html, page, config, files):
    '''Add the link to the next reading just above the notes (or at the end
    if there are none), then attach the audio reading, if there is one.
    audio.js turns the plain <audio> element into the floating player;
    without JavaScript it still works as the browser's own player.'''
    link = _next_link(page, files)
    if link:
        m = _NOTES.search(html)
        html = html[:m.start()] + link + html[m.start():] if m else html + '\n' + link
    found = page.meta.get('_audio')
    if not found:
        return html
    url, mime = found
    kind = ' type="' + mime + '"' if mime else ''
    return (html + '\n<audio class="aud-src" controls preload="metadata">'
            '<source src="' + _html.escape(url, quote=True) + '"' + kind + '></audio>\n')


def on_config(config):
    js = config['extra_javascript']
    names = [str(x) for x in js]
    if 'assets/gurmukhi-fonts.js' not in names:
        at = names.index('assets/reader.js') if 'assets/reader.js' in names else 0
        js.insert(at, 'assets/gurmukhi-fonts.js')
    return config


def on_nav(nav, config, files):
    '''Name each section from contents.yml rather than from its folder name,
    so the sidebar reads 'Bhagat Mala', not 'Bhagat mala'.'''
    titles = {}
    for text in _load():
        titles[text['slug']] = text['title']
        for div in text['divisions']:
            titles[div['slug']] = div['title']

    def walk(items):
        for item in items:
            children = getattr(item, 'children', None)
            if children:
                key = str(item.title).lower().replace(' ', '-')
                if key in titles:
                    item.title = titles[key]
                walk(children)

    walk(nav.items)
    return nav
