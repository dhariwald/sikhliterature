/* Reader mode.
   A small e-reader laid over the page: typeface, size, measure, leading,
   alignment, page tint, collapsible sidebars, and a slide-at-a-time
   slideshow mode. Everything is remembered in the browser; nothing is sent
   anywhere and nothing is needed from the network except the webfonts the
   reader actually picks. */
(function () {
  'use strict';

  var KEY = 'sikhlit.reader.v1';
  var POS = 'sikhlit.pos.';
  var root = document.documentElement;

  /* ---------------------------------------------------------------- fonts */

  var FONTS = [
    { id: 'lora',        name: 'Lora',                      family: 'Lora',
      v2: 'Lora:ital,wght@0,400;0,600;1,400;1,600', v1: 'Lora:400,400i,700,700i' },
    { id: 'literata',    name: 'Literata  ·  Play Books',   family: 'Literata',
      v2: 'Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400;1,7..72,600', v1: 'Literata:400,400i,700,700i' },
    { id: 'garamond',    name: 'EB Garamond',               family: 'EB Garamond',
      v2: 'EB+Garamond:ital,wght@0,400;0,600;1,400;1,600', v1: 'EB+Garamond:400,400i,700,700i' },
    { id: 'goudy',       name: 'Sorts Mill Goudy',          family: 'Sorts Mill Goudy',
      v2: 'Sorts+Mill+Goudy:ital@0;1', v1: 'Sorts+Mill+Goudy:400,400i' },
    { id: 'crimson',     name: 'Crimson Pro',               family: 'Crimson Pro',
      v2: 'Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600', v1: 'Crimson+Pro:400,400i,700,700i' },
    { id: 'newsreader',  name: 'Newsreader',                family: 'Newsreader',
      v2: 'Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400;1,6..72,600', v1: 'Newsreader:400,400i,700,700i' },
    { id: 'sourceserif', name: 'Source Serif',              family: 'Source Serif 4',
      v2: 'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400;1,8..60,600', v1: 'Source+Serif+4:400,400i,700,700i' },
    { id: 'baskerville', name: 'Libre Baskerville',         family: 'Libre Baskerville',
      v2: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', v1: 'Libre+Baskerville:400,400i,700' },
    { id: 'georgia',     name: 'Georgia  ·  no download',   family: 'Georgia' },
    { id: 'inter',       name: 'Inter  ·  sans',            family: 'Inter', sans: true,
      v2: 'Inter:ital,opsz,wght@0,14..32,400;0,14..32,600;1,14..32,400;1,14..32,600', v1: 'Inter:400,400i,700,700i' },
    { id: 'atkinson',    name: 'Atkinson Hyperlegible  ·  sans', family: 'Atkinson Hyperlegible', sans: true,
      v2: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700', v1: 'Atkinson+Hyperlegible:400,400i,700,700i' },
    { id: 'system',      name: 'System sans  ·  no download', family: 'system-ui', sans: true, bare: true }
  ];

  /* Gurmukhi typefaces. Latin text always uses the typeface above; Gurmukhi
     letters fall through to whichever of these is chosen. Fonts uploaded to
     docs/assets/fonts/ are appended automatically (see gurmukhi-fonts.js). */
  var GM_FONTS = [
    { id: 'noto-serif',  name: 'Noto Serif Gurmukhi',  family: 'Noto Serif Gurmukhi',
      v2: 'Noto+Serif+Gurmukhi:wght@400;600', v1: 'Noto+Serif+Gurmukhi:400,600' },
    { id: 'noto-sans',   name: 'Noto Sans Gurmukhi',   family: 'Noto Sans Gurmukhi',
      v2: 'Noto+Sans+Gurmukhi:wght@400;600', v1: 'Noto+Sans+Gurmukhi:400,600' },
    { id: 'anek',        name: 'Anek Gurmukhi',        family: 'Anek Gurmukhi',
      v2: 'Anek+Gurmukhi:wght@400;600', v1: 'Anek+Gurmukhi:400,600' },
    { id: 'mukta',       name: 'Mukta Mahee',          family: 'Mukta Mahee',
      v2: 'Mukta+Mahee:wght@400;600', v1: 'Mukta+Mahee:400,600' },
    { id: 'baloo',       name: 'Baloo Paaji 2',        family: 'Baloo Paaji 2',
      v2: 'Baloo+Paaji+2:wght@400;600', v1: 'Baloo+Paaji+2:400,600' }
  ].concat(window.SIKHLIT_FONTS || []);

  var loaded = {};

  function loadFont(f) {
    if (loaded[f.id]) return;
    if (f.faces) {                       /* a font file hosted on this site */
      loaded[f.id] = true;
      var css = '';
      f.faces.forEach(function (x) {
        css += '@font-face{font-family:"' + f.family + '";src:url("' + x.url + '");' +
               'font-weight:' + x.weight + ';font-style:' + x.style + ';font-display:swap;}';
      });
      var st = document.createElement('style');
      st.textContent = css;
      document.head.appendChild(st);
      return;
    }
    if (!f.v2) return;
    loaded[f.id] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.v2 + '&display=swap';
    /* Google's v2 endpoint is strict about axis names. If it refuses the
       request, fall back to the older, laxer endpoint before giving up. */
    link.onerror = function () {
      if (!f.v1) return;
      var alt = document.createElement('link');
      alt.rel = 'stylesheet';
      alt.href = 'https://fonts.googleapis.com/css?family=' + f.v1 + '&display=swap';
      document.head.appendChild(alt);
    };
    document.head.appendChild(link);
  }

  function stack(f, g) {
    var gm = '"' + g.family + '", "Noto Serif Gurmukhi"';
    var tail = f.sans
      ? gm + ', system-ui, -apple-system, "Segoe UI", sans-serif'
      : gm + ', Georgia, serif';
    return (f.bare ? f.family : '"' + f.family + '"') + ', ' + tail;
  }

  function fontById(id) {
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i];
    return FONTS[0];
  }

  function gmFontById(id) {
    for (var i = 0; i < GM_FONTS.length; i++) if (GM_FONTS[i].id === id) return GM_FONTS[i];
    return GM_FONTS[0];
  }

  /* -------------------------------------------------------------- settings */

  var DEFAULTS = {
    font: 'lora',
    gmfont: 'noto-serif',
    gurmukhi: true,  // show the Gurmukhi text
    layout: 'split', // split | lines   -- how a verse is laid out
    perslide: 'verse', // verse | line  -- slideshow, line-by-line layout only
    scale: 100,      // per cent
    measure: 42,     // rem
    leading: 185,    // hundredths
    align: 'left',
    theme: 'auto',   // auto | day | sepia | night
    nav: true,
    toc: true,
    para: false
  };

  var S = load();

  function load() {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (k in DEFAULTS) if (raw[k] !== undefined && raw[k] !== null) out[k] = raw[k];
    } catch (e) { /* private mode, blocked storage — defaults are fine */ }
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  function applyTheme() {
    var b = document.body;
    if (S.theme === 'auto') { b.removeAttribute('data-reader-tint'); return; }
    if (S.theme === 'sepia') {
      b.setAttribute('data-md-color-scheme', 'default');
      b.setAttribute('data-reader-tint', 'sepia');
    } else {
      b.removeAttribute('data-reader-tint');
      b.setAttribute('data-md-color-scheme', S.theme === 'night' ? 'slate' : 'default');
    }
  }

  function apply() {
    var f = fontById(S.font), g = gmFontById(S.gmfont);
    loadFont(f);
    loadFont(g);
    root.style.setProperty('--reader-stack', stack(f, g));
    root.style.setProperty('--reader-gm', '"' + g.family + '", "Noto Serif Gurmukhi", serif');
    root.style.setProperty('--reader-scale', (S.scale / 100).toFixed(2));
    root.style.setProperty('--reader-measure', S.measure >= 99 ? '100%' : S.measure + 'rem');
    root.style.setProperty('--reader-grid', S.measure >= 99 ? '100%' : (S.measure + 26) + 'rem');
    root.style.setProperty('--reader-leading', (S.leading / 100).toFixed(2));
    root.style.setProperty('--reader-align', S.align === 'justify' ? 'justify' : 'left');
    document.body.setAttribute('data-reader-align', S.align);
    document.body.classList.toggle('reader-no-nav', !S.nav);
    document.body.classList.toggle('reader-no-toc', !S.toc);
    document.body.classList.toggle('reader-no-gm', !S.gurmukhi);
    document.body.classList.toggle('rdr-layout-lines', S.layout === 'lines');
    document.body.classList.toggle('rdr-one-line', S.layout === 'lines' && S.perslide === 'line');
    applyTheme();
  }

  /* Paint the stored settings before first paint, so nothing reflows. */
  apply();

  /* ------------------------------------------------------------ slideshow */

  var units = [], at = 0, para = false;
  var bar, count, prevBtn, nextBtn, progress;

  function article() { return document.querySelector('article.md-content__inner'); }

  /* --------------------------------------------------------------- verses
     Each verse is rebuilt into one block that holds two views of it:
       .rdr-v-split   every Gurmukhi line, then every English line
       .rdr-v-lines   a Gurmukhi line, its English, the next Gurmukhi line...
     The reader picks one with "Verse layout". The .md file may be written
     either way:
       split          a Gurmukhi paragraph, then an English paragraph
       interleaved    Gurmukhi and English lines alternating, in one
                      paragraph (backslash line breaks) or as alternating
                      one-line paragraphs
     Lines are paired when the counts allow. A Gurmukhi line that holds two
     padas (Chaupai) is halved at its middle । or ॥ if that makes the counts
     match its English. A verse that can't be paired is left exactly as
     written and shows the same in both layouts. */

  var END_GM = /\u0965\s*[\u0A66-\u0A6F]+\s*\u0965\s*$/;   /* ॥੩॥ */
  var END_EN = /\(\s*\d+\s*\)\s*$/;                         /* (3)  */

  function isGmText(t) { var s = gmShare(t); return s.g > 0 && s.g > s.l * 2; }
  function txt(nodes) { return nodes.map(function (n) { return n.textContent; }).join(''); }

  /* A paragraph's lines, as lists of nodes, split at each <br>. */
  function linesOf(p) {
    var out = [[]];
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeName === 'BR') out.push([]);
      else out[out.length - 1].push(n);
    });
    return out.filter(function (l) { return txt(l).trim(); });
  }

  /* Halve a Gurmukhi line at the । or ॥ nearest its middle. */
  function halve(line) {
    var t = txt(line).trim(), re = /[\u0964\u0965]\s+(?=[^\s\u0964\u0965\u0A66-\u0A6F])/g, m, best = -1;
    while ((m = re.exec(t))) {
      var cut = m.index + 1;
      if (best < 0 || Math.abs(cut - t.length / 2) < Math.abs(best - t.length / 2)) best = cut;
    }
    if (best < 0) return null;
    return [[document.createTextNode(t.slice(0, best).trim())],
            [document.createTextNode(t.slice(best).trim())]];
  }

  function pairUp(gm, en) {
    if (gm.length === en.length) return gm.map(function (g, i) { return [g, en[i]]; });
    var halves = [];
    for (var i = 0; i < gm.length; i++) {
      var h = halve(gm[i]);
      if (!h) return null;
      halves.push(h[0], h[1]);
    }
    if (halves.length !== en.length) return null;
    return halves.map(function (g, i) { return [g, en[i]]; });
  }

  function isPara(e) { return e && e.tagName === 'P'; }

  /* Starting at a Gurmukhi paragraph: the run of (Gurmukhi, English)
     paragraph pairs that make up one verse, ending at its verse number. */
  function verseRun(start) {
    var els = [], gm = [], en = [], pairs = [], e = start;
    while (isPara(e) && isGmText(e.textContent)) {
      var t = e.nextElementSibling;
      if (!isPara(t) || isGmText(t.textContent) || isLabel(t)) break;
      var gl = linesOf(e), tl = linesOf(t), pr = pairUp(gl, tl);
      if (!pr) break;
      els.push(e, t); gm = gm.concat(gl); en = en.concat(tl); pairs = pairs.concat(pr);
      if (END_GM.test(e.textContent) || END_EN.test(t.textContent)) break;
      e = t.nextElementSibling;
    }
    return els.length ? { els: els, gm: gm, en: en, pairs: pairs } : null;
  }

  /* One paragraph whose lines alternate Gurmukhi, English, Gurmukhi... */
  function mixedRun(p) {
    var lines = linesOf(p);
    if (lines.length < 2 || lines.length % 2) return null;
    var gm = [], en = [], pairs = [];
    for (var i = 0; i < lines.length; i += 2) {
      if (!isGmText(txt(lines[i])) || isGmText(txt(lines[i + 1]))) return null;
      gm.push(lines[i]); en.push(lines[i + 1]); pairs.push([lines[i], lines[i + 1]]);
    }
    return { els: [p], gm: gm, en: en, pairs: pairs };
  }

  function cloneLine(nodes) {
    var f = document.createDocumentFragment();
    nodes.forEach(function (n) {
      var c = n.cloneNode(true);
      if (c.nodeType === 1) {
        c.removeAttribute('id');
        c.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); });
      }
      f.appendChild(c);
    });
    return f;
  }

  function fill(p, lines) {
    lines.forEach(function (l, i) {
      if (i) p.appendChild(document.createElement('br'));
      l.forEach(function (n) { p.appendChild(n); });
    });
    return p;
  }

  function makeVerse(run) {
    var v = document.createElement('div');
    v.className = 'rdr-verse';
    /* line by line: copies */
    var lines = document.createElement('div');
    lines.className = 'rdr-v-lines';
    run.pairs.forEach(function (pr) {
      var d = document.createElement('div');
      d.className = 'rdr-pair';
      var g = document.createElement('p'); g.className = 'rdr-gm rdr-pg';
      var e = document.createElement('p'); e.className = 'rdr-pe';
      g.appendChild(cloneLine(pr[0])); e.appendChild(cloneLine(pr[1]));
      d.appendChild(g); d.appendChild(e);
      lines.appendChild(d);
    });
    /* split: the original nodes, moved, so footnote anchors keep their ids */
    var split = document.createElement('div');
    split.className = 'rdr-v-split';
    var gp = fill(document.createElement('p'), run.gm); gp.className = 'rdr-gm';
    split.appendChild(gp);
    split.appendChild(fill(document.createElement('p'), run.en));
    v.appendChild(split);
    v.appendChild(lines);
    return v;
  }

  function buildVerses() {
    var host = article();
    if (!host || host.dataset.versesBuilt) return;
    host.dataset.versesBuilt = '1';
    var e = host.firstElementChild;
    while (e) {
      var run = null;
      if (isPara(e) && !isLabel(e)) {
        run = isGmText(e.textContent) ? verseRun(e) : (gmShare(e.textContent).g ? mixedRun(e) : null);
      }
      if (!run) { e = e.nextElementSibling; continue; }
      var after = run.els[run.els.length - 1].nextElementSibling;
      var v = makeVerse(run);
      host.insertBefore(v, run.els[0]);
      run.els.forEach(function (x) { x.remove(); });
      e = after;
    }
  }

  /* ------------------------------------------------------------- gurmukhi
     Marks every piece of Gurmukhi on the page so it can be hidden:
       p.rdr-gm       a whole paragraph in Gurmukhi (a verse)
       span.rdr-gml   one Gurmukhi line inside a mixed block (Sri Mukhvaak),
                      together with the line break after it
       span.rdr-gmw   a Gurmukhi word inside an English line (*Dohra* ਦੋਹਰਾ) */

  var GM = /[\u0A00-\u0A7F]/g;
  var GM_RUN = /[\u0A00-\u0A7F\u0964\u0965][\u0A00-\u0A7F\u0964\u0965\s,.;:'"!?()\-]*[\u0A00-\u0A7F\u0964\u0965]|[\u0A00-\u0A7F]/g;

  function gmShare(t) {
    var g = (t.match(GM) || []).length;
    var l = (t.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;
    return { g: g, l: l };
  }

  function markGurmukhi() {
    var host = article();
    if (!host || host.dataset.gmMarked) return;
    host.dataset.gmMarked = '1';
    host.querySelectorAll('p').forEach(function (p) {
      if (p.closest('.footnote, .rdr-next')) return;
      var s = gmShare(p.textContent);
      if (!s.g) return;
      if (s.g > s.l * 2) { p.classList.add('rdr-gm'); return; }
      /* Split a mixed paragraph into its lines at each <br>. */
      var lines = [[]];
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        lines[lines.length - 1].push(n);
        if (n.nodeName === 'BR') lines.push([]);
      });
      lines.forEach(function (nodes) {
        var text = nodes.map(function (n) { return n.textContent; }).join('');
        var ls = gmShare(text);
        if (!ls.g) return;
        if (ls.g > ls.l * 2 && nodes.length) {
          var wrap = document.createElement('span');
          wrap.className = 'rdr-gml';
          p.insertBefore(wrap, nodes[0]);
          nodes.forEach(function (n) { wrap.appendChild(n); });
          return;
        }
        nodes.forEach(function (n) { wrapRuns(n); });
      });
    });
  }

  function wrapRuns(node) {
    if (node.nodeType === 1) {
      Array.prototype.slice.call(node.childNodes).forEach(wrapRuns);
      return;
    }
    if (node.nodeType !== 3 || !GM.test(node.nodeValue)) { GM.lastIndex = 0; return; }
    GM.lastIndex = 0;
    var t = node.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
    GM_RUN.lastIndex = 0;
    while ((m = GM_RUN.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var sp = document.createElement('span');
      sp.className = 'rdr-gmw';
      sp.textContent = m[0];
      frag.appendChild(sp);
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }


  function buildUnits() {
    units = [];
    var host = article();
    if (!host) return;
    var buf = [];
    var kids = host.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var tag = el.tagName.toLowerCase();
      if (tag === 'hr' || el.classList.contains('footnote') ||
          el.classList.contains('md-source-file') || el.classList.contains('rdr-unit-on')) {
        el.classList.remove('rdr-unit-on');
      }
      if (tag === 'hr' || el.classList.contains('footnote') || el.classList.contains('md-source-file')) continue;
      if (!el.textContent.trim()) continue;
      /* The "Notes" heading: its footnotes are not slides, so neither is it. */
      if (/^h[1-6]$/.test(tag) && /^notes?$/i.test(el.textContent.replace(/\W+$/, '').trim())) continue;
      if (el.classList.contains('rdr-verse')) {
        if (S.layout === 'lines' && S.perslide === 'line') {
          el.querySelectorAll('.rdr-pair').forEach(function (pr) { buf.push(pr); units.push(buf); buf = []; });
        } else { buf.push(el); units.push(buf); buf = []; }
        continue;
      }
      var gm = el.classList.contains('rdr-gm');
      if (gm && !S.gurmukhi) continue;       /* hidden: not a slide of its own */
      buf.push(el);
      /* Headings, metre labels and Gurmukhi verses lead into the block that
         follows them, so a verse and its translation share one slide. */
      if (!/^h[1-6]$/.test(tag) && !gm && !isLabel(el)) { units.push(buf); buf = []; }
    }
    if (buf.length) units.push(buf);
  }

  /* A short metre label: italics, optionally followed by the same word in
     Gurmukhi, e.g. *Dohra* or *Chaupai* ਚੌਪਈ. */
  function isLabel(el) {
    if (el.tagName.toLowerCase() !== 'p') return false;
    var c = el.firstElementChild;
    if (!c || c.tagName.toLowerCase() !== 'em') return false;
    var rest = el.textContent.replace(c.textContent, '');
    return !/[A-Za-z0-9]/.test(rest) && el.textContent.trim().length < 40;
  }

  function show(i) {
    if (!units.length) return;
    at = Math.max(0, Math.min(units.length - 1, i));
    var host = article();
    host.querySelectorAll('.rdr-unit-on').forEach(function (e) { e.classList.remove('rdr-unit-on', 'rdr-unit-first'); });
    units[at].forEach(function (e) {
      e.classList.add('rdr-unit-on');
      var v = e.classList.contains('rdr-pair') && e.closest('.rdr-verse');
      if (v) v.classList.add('rdr-unit-on');
    });
    units[at][0].classList.add('rdr-unit-first');
    count.textContent = (at + 1) + ' / ' + units.length;
    prevBtn.disabled = at === 0;
    var end = at === units.length - 1;
    var onward = end && document.querySelector('a.rdr-next');
    nextBtn.disabled = end && !onward;
    nextBtn.innerHTML = onward ? 'Next reading &#8594;' : '&#8594;';
    nextBtn.classList.toggle('rdr-onward', !!onward);
    progress.style.width = ((at + 1) / units.length * 100) + '%';
    window.scrollTo(0, 0);
    try { localStorage.setItem(POS + location.pathname, String(at)); } catch (e) {}
  }

  function forward() {
    if (at < units.length - 1) { show(at + 1); return; }
    var link = document.querySelector('a.rdr-next');
    if (link) {
      try { localStorage.setItem(POS + new URL(link.href).pathname, '0'); } catch (e) {}
      location.href = link.href;
    }
  }

  function paraAvailable() { buildUnits(); return units.length >= 3; }

  /* Rebuild the slides after a setting changes, staying on the same text. */
  function reslide() {
    if (!para) { buildUnits(); return; }
    var here = units.length ? units[at][units[at].length - 1] : null;
    var verse = here && here.closest ? here.closest('.rdr-verse') : null;
    buildUnits();
    var i = 0;
    for (var u = 0; u < units.length; u++) {
      var hit = units[u].some(function (x) {
        return x === here || (verse && (x === verse || (x.closest && x.closest('.rdr-verse') === verse)));
      });
      if (hit) { i = u; break; }
    }
    show(i);
  }

  function setPara(on) {
    if (on && !paraAvailable()) on = false;
    para = on;
    document.body.classList.toggle('rdr-para', on);
    bar.hidden = !on;
    if (on) {
      var start = 0;
      try { start = parseInt(localStorage.getItem(POS + location.pathname) || '0', 10) || 0; } catch (e) {}
      show(start);
    } else {
      var keep = units.length ? units[at][0] : null;
      article().querySelectorAll('.rdr-unit-on').forEach(function (e) { e.classList.remove('rdr-unit-on', 'rdr-unit-first'); });
      if (keep) keep.scrollIntoView({ block: 'center' });
    }
    return on;
  }

  /* ---------------------------------------------------------------- panel */

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function seg(name, opts, get, set) {
    var html = '<div class="rdr-seg">';
    opts.forEach(function (o) {
      html += '<button type="button" data-v="' + o[0] + '">' + o[1] + '</button>';
    });
    html += '</div>';
    var node = el(html);
    function paint() {
      node.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.v === String(get())));
      });
    }
    node.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      set(b.dataset.v);
      paint();
    });
    paint();
    node.repaint = paint;
    return node;
  }

  function row(label, value, control) {
    var r = el('<div class="rdr-row"><div class="rdr-label"><span>' + label +
              '</span><span class="rdr-val">' + (value || '') + '</span></div></div>');
    r.appendChild(control);
    return r;
  }

  function slider(min, max, step, get, set, fmt, valueNode) {
    var i = el('<input type="range" min="' + min + '" max="' + max + '" step="' + step + '">');
    i.value = get();
    i.addEventListener('input', function () {
      set(parseInt(i.value, 10));
      if (valueNode) valueNode.textContent = fmt(parseInt(i.value, 10));
    });
    i.sync = function () { i.value = get(); if (valueNode) valueNode.textContent = fmt(get()); };
    return i;
  }

  function build() {
    if (document.querySelector('.rdr-fab')) return;
    buildVerses();
    markGurmukhi();

    /* floating buttons */
    var fab = el('<div class="rdr-fab"></div>');
    var navBtn = el('<button type="button" class="rdr-navbtn" title="Sidebars" aria-label="Toggle sidebars">' +
      '<svg viewBox="0 0 24 24"><path d="M3 5h18v2H3V5m0 6h18v2H3v-2m0 6h18v2H3v-2Z"/></svg></button>');
    var aaBtn = el('<button type="button" title="Reader settings" aria-label="Reader settings">Aa</button>');
    fab.appendChild(navBtn);
    fab.appendChild(aaBtn);
    document.body.appendChild(fab);

    /* slideshow furniture */
    progress = el('<div class="rdr-progress"></div>');
    bar = el('<div class="rdr-bar" hidden></div>');
    bar.appendChild(progress);
    prevBtn = el('<button type="button" aria-label="Previous slide">&#8592;</button>');
    count = el('<span class="rdr-count"></span>');
    nextBtn = el('<button type="button" aria-label="Next slide">&#8594;</button>');
    var exit = el('<button type="button" class="rdr-exit">Exit</button>');
    bar.appendChild(prevBtn); bar.appendChild(count); bar.appendChild(nextBtn); bar.appendChild(exit);
    document.body.appendChild(bar);

    /* the panel */
    var panel = el('<div class="rdr-panel" hidden role="dialog" aria-label="Reader settings"></div>');

    panel.appendChild(row('Page', '', seg('theme', [
      ['auto', 'Auto'], ['day', 'Day'], ['sepia', 'Sepia'], ['night', 'Night']
    ], function () { return S.theme; }, function (v) { S.theme = v; apply(); save(); })));

    var sel = el('<select aria-label="Typeface"></select>');
    FONTS.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f.id; o.textContent = f.name;
      sel.appendChild(o);
    });
    sel.value = S.font;
    sel.addEventListener('change', function () { S.font = sel.value; apply(); save(); });
    panel.appendChild(row('Typeface', '', sel));

    var gsel = el('<select aria-label="Gurmukhi typeface"></select>');
    GM_FONTS.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f.id; o.textContent = f.name;
      gsel.appendChild(o);
    });
    gsel.value = gmFontById(S.gmfont).id;
    gsel.addEventListener('change', function () { S.gmfont = gsel.value; apply(); save(); });
    var gselRow = row('Gurmukhi typeface', '', gsel);
    panel.appendChild(gselRow);

    var sizeRow = row('Text size', S.scale + '%', document.createComment(''));
    var sizeVal = sizeRow.querySelector('.rdr-val');
    var sizeIn = slider(80, 300, 5, function () { return S.scale; },
      function (v) { S.scale = v; apply(); save(); }, function (v) { return v + '%'; }, sizeVal);
    sizeRow.appendChild(sizeIn);
    panel.appendChild(sizeRow);

    var widthRow = row('Page width', '', document.createComment(''));
    var widthVal = widthRow.querySelector('.rdr-val');
    var fmtW = function (v) { return v >= 99 ? 'full' : v + 'rem'; };
    var widthIn = slider(28, 99, 1, function () { return S.measure; },
      function (v) { S.measure = v; apply(); save(); }, fmtW, widthVal);
    widthVal.textContent = fmtW(S.measure);
    widthRow.appendChild(widthIn);
    panel.appendChild(widthRow);

    var leadRow = row('Line spacing', '', document.createComment(''));
    var leadVal = leadRow.querySelector('.rdr-val');
    var fmtL = function (v) { return (v / 100).toFixed(2); };
    var leadIn = slider(130, 260, 5, function () { return S.leading; },
      function (v) { S.leading = v; apply(); save(); }, fmtL, leadVal);
    leadVal.textContent = fmtL(S.leading);
    leadRow.appendChild(leadIn);
    panel.appendChild(leadRow);

    panel.appendChild(row('Alignment', '', seg('align', [['left', 'Ragged'], ['justify', 'Justified']],
      function () { return S.align; }, function (v) { S.align = v; apply(); save(); })));

    panel.appendChild(el('<hr class="rdr-hr rdr-desktop">'));

    function sw(label, get, set) {
      var l = el('<label class="rdr-switch"><span>' + label + '</span><input type="checkbox"></label>');
      var box = l.querySelector('input');
      box.checked = get();
      box.addEventListener('change', function () { set(box.checked); });
      l.sync = function () { box.checked = get(); };
      return l;
    }

    var gmSw = sw('Show Gurmukhi', function () { return S.gurmukhi; }, function (v) {
      S.gurmukhi = v; apply(); save();
      gselRow.style.display = v ? '' : 'none';
      reslide();
    });
    gselRow.style.display = S.gurmukhi ? '' : 'none';
    panel.appendChild(gmSw);

    var hasVerses = !!document.querySelector('.rdr-verse');
    var perRow;
    var layoutRow = row('Verse layout', '', seg('layout', [['split', 'Split view'], ['lines', 'Line by line']],
      function () { return S.layout; }, function (v) {
        S.layout = v; apply(); save();
        perRow.style.display = v === 'lines' ? '' : 'none';
        reslide();
      }));
    perRow = row('Slideshow', '', seg('perslide', [['verse', '1 verse per slide'], ['line', '1 line per slide']],
      function () { return S.perslide; }, function (v) { S.perslide = v; apply(); save(); reslide(); }));
    perRow.style.display = S.layout === 'lines' ? '' : 'none';
    layoutRow.style.marginTop = '.8rem';
    if (hasVerses) { panel.appendChild(layoutRow); panel.appendChild(perRow); }

    var navSw = sw('Navigation sidebar', function () { return S.nav; },
      function (v) { S.nav = v; apply(); save(); });
    var tocSw = sw('Contents sidebar', function () { return S.toc; },
      function (v) { S.toc = v; apply(); save(); });
    navSw.classList.add('rdr-desktop');
    tocSw.classList.add('rdr-desktop');
    panel.appendChild(navSw);
    panel.appendChild(tocSw);

    var paraSw = sw('Slideshow mode', function () { return para; }, function (v) {
      var on = setPara(v);
      S.para = on; save();
      paraSw.sync();
      if (v && !on) note.textContent = 'This page is too short for slideshow mode.';
      if (on) panel.hidden = true;
    });
    panel.appendChild(paraSw);
    var note = el('<p class="rdr-note">One slide at a time. Move with the arrow buttons, &#8592; &#8594;, space, or a swipe.</p>');
    panel.appendChild(note);

    var reset = el('<button type="button" class="rdr-reset">Reset to defaults</button>');
    reset.addEventListener('click', function () {
      for (var k in DEFAULTS) S[k] = DEFAULTS[k];
      apply(); save();
      setPara(false);
      sel.value = S.font;
      gsel.value = S.gmfont; gselRow.style.display = '';
      gmSw.sync();
      perRow.style.display = 'none';
      sizeIn.sync(); widthIn.sync(); leadIn.sync();
      navSw.sync(); tocSw.sync(); paraSw.sync();
      panel.querySelectorAll('.rdr-seg').forEach(function (n) { if (n.repaint) n.repaint(); });
    });
    panel.appendChild(reset);

    document.body.appendChild(panel);

    aaBtn.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      aaBtn.setAttribute('aria-pressed', String(!panel.hidden));
    });
    navBtn.addEventListener('click', function () {
      var on = !(S.nav && S.toc);
      S.nav = on; S.toc = on; apply(); save();
      navSw.sync(); tocSw.sync();
      navBtn.setAttribute('aria-pressed', String(!on));
    });
    navBtn.setAttribute('aria-pressed', String(!(S.nav && S.toc)));

    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (e.target.closest('.rdr-panel') || e.target.closest('.rdr-fab')) return;
      panel.hidden = true;
      aaBtn.setAttribute('aria-pressed', 'false');
    });

    /* slideshow wiring */
    prevBtn.addEventListener('click', function () { show(at - 1); });
    nextBtn.addEventListener('click', forward);
    exit.addEventListener('click', function () { setPara(false); S.para = false; save(); paraSw.sync(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; return; }
      if (!para) return;
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); forward();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); show(at - 1);
      } else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(units.length - 1); }
      else if (e.key === 'Escape') { setPara(false); S.para = false; save(); paraSw.sync(); }
    });

    var tx = 0, ty = 0;
    document.addEventListener('touchstart', function (e) {
      if (!para || e.touches.length !== 1) return;
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!para || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) forward(); else show(at - 1); }
    }, { passive: true });

    /* Only offer slideshow mode where there is something to page through. */
    if (!paraAvailable()) {
      paraSw.style.display = 'none';
      note.style.display = 'none';
    } else if (S.para) {
      setPara(true);
      paraSw.sync();
    }

    /* Keep our tint in step if the theme's own day/night toggle is used. */
    new MutationObserver(function () {
      if (S.theme === 'auto') return;
      var now = document.body.getAttribute('data-md-color-scheme');
      var want = S.theme === 'night' ? 'slate' : 'default';
      if (now !== want) {
        S.theme = now === 'slate' ? 'night' : 'day';
        applyTheme(); save();
        panel.querySelectorAll('.rdr-seg').forEach(function (n) { if (n.repaint) n.repaint(); });
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
