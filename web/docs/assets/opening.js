/* Opening slides for class.
   Shows the Manglacharan, the Rahao, the verse of the day and the closing
   Chaupai full screen,
   over whatever reading page is open, then returns to it untouched.

   Only appears on a computer that has been switched into classroom mode:
     turn on:  any page with ?classroom=on   (e.g. .../sikhliterature/?classroom=on)
     turn off: any page with ?classroom=off
   Everyone else sees the site exactly as before.

   Controls (classroom mode only)
     M or the Manglacharan button ... open at slide 1
     Right arrow, Space, PageDown, Enter, or click anywhere ... next slide
       (Next on the last slide closes)
     Left arrow, PageUp ... previous slide
     Esc ... close and go back to the reading

   The verse of the day moves on by one the first time the slides are opened
   on a new date, so every class that day sees the same verse and a day with
   no class uses nothing up. The small arrows beside "Verse n of 8" (on the
   verse-of-the-day slide) correct it.
   Text lives in opening-text.js. */
(function () {
  'use strict';

  var MODE = 'sikhlit.classroom';
  var DAY = 'sikhlit.opening.day.v1';

  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---- classroom switch (?classroom=on / off), then tidy the address bar */
  var q = new URLSearchParams(location.search);
  if (q.has('classroom')) {
    var v = (q.get('classroom') || '').toLowerCase();
    store(MODE, v === 'off' ? null : '1');
    q.delete('classroom');
    var rest = q.toString();
    try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
  }
  if (read(MODE) !== '1') return;

  var T = window.SIKHLIT_OPENING;
  if (!T) return;
  var N = T.rotating.verses.length;

  /* ---- verse of the day */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadDay() {
    try { return JSON.parse(read(DAY) || 'null'); } catch (e) { return null; }
  }
  function verseForToday() {
    var s = loadDay(), t = today();
    if (!s || typeof s.i !== 'number') s = { d: t, i: 0 };
    else if (s.d !== t) s = { d: t, i: (s.i + 1) % N };
    store(DAY, JSON.stringify(s));
    return s.i;
  }
  function setVerse(i) {
    store(DAY, JSON.stringify({ d: today(), i: ((i % N) + N) % N }));
  }

  /* ---- building slides */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function english(s) {
    return esc(s)
      .replace(/\[([^\]]+)\]/g, '<span class="op-gloss">[$1]</span>')
      .replace(/(\S*\([^()]*\))\s*$/, '<span class="op-nb">$1</span>');   /* keep "(1, Rahao)" together */
  }
  function slideHtml(slide, cite, extra) {
    var h = '<div class="op-text">';
    if (slide.head) {
      h += '<p class="op-head"><span lang="pa">' + esc(slide.head.g) + '</span>' +
        (slide.head.t ? ' <span class="op-head-t">' + esc(slide.head.t) + '</span>' : '') + '</p>';
    }
    if (slide.layout === 'blocks') {
      /* All the Gurmukhi, then all the transliteration, then all the English. */
      h += '<div class="op-block">' + slide.lines.map(function (l) { return '<p class="op-g" lang="pa">' + esc(l.g) + '</p>'; }).join('') + '</div>';
      h += '<div class="op-block">' + slide.lines.map(function (l) { return '<p class="op-t">' + esc(l.t) + '</p>'; }).join('') + '</div>';
      h += '<div class="op-block">' + slide.lines.map(function (l) { return '<p class="op-e">' + english(l.e) + '</p>'; }).join('') + '</div>';
    } else {
      slide.lines.forEach(function (l) {
        h += '<div class="op-line">' +
          '<p class="op-g" lang="pa">' + esc(l.g) + '</p>' +
          '<p class="op-t">' + esc(l.t) + '</p>' +
          '<p class="op-e">' + english(l.e) + '</p></div>';
      });
    }
    h += '</div><div class="op-cite"><span lang="pa">' + esc(cite.g) + '</span><span>' + esc(cite.e) + '</span></div>';
    return h + (extra || '');
  }

  var slides = [];   // functions returning html, so the daily verse is read fresh
  T.fixed.forEach(function (s) { slides.push(function () { return slideHtml(s, s.cite); }); });
  slides.push(function () {
    var i = verseIndex;
    var tune = '<div class="op-tune">' +
      '<button type="button" data-op="vprev" aria-label="Previous verse">&#8249;</button>' +
      '<span>Verse ' + (i + 1) + ' of ' + N + '</span>' +
      '<button type="button" data-op="vnext" aria-label="Next verse">&#8250;</button></div>';
    return slideHtml(T.rotating.verses[i], T.rotating.cite, tune);
  });
  (T.closing || []).forEach(function (s) { slides.push(function () { return slideHtml(s, s.cite); }); });

  /* ---- overlay */
  var ov, stage, count, at = 0, open = false, verseIndex = 0;

  function build() {
    ov = document.createElement('div');
    ov.className = 'op-overlay';
    ov.hidden = true;
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Opening');
    ov.innerHTML =
      '<div class="op-stage"></div>' +
      '<div class="op-nav">' +
        '<button type="button" data-op="prev" aria-label="Previous">&#8592;</button>' +
        '<span class="op-count"></span>' +
        '<button type="button" data-op="next" aria-label="Next">&#8594;</button>' +
        '<button type="button" data-op="close" class="op-close">Close</button>' +
      '</div>';
    document.body.appendChild(ov);
    stage = ov.querySelector('.op-stage');
    count = ov.querySelector('.op-count');

    ov.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('[data-op]');
      if (!b) { next(); return; }
      var a = b.getAttribute('data-op');
      if (a === 'next') next();
      else if (a === 'prev') prev();
      else if (a === 'close') close();
      else if (a === 'vnext' || a === 'vprev') {
        verseIndex = (verseIndex + (a === 'vnext' ? 1 : -1) + N) % N;
        setVerse(verseIndex);
        show(at);
      }
    });
    /* Keep the reading page's own wheel and swipe handling out of it. */
    ['wheel', 'touchstart', 'touchend', 'touchmove'].forEach(function (t) {
      ov.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'op-open';
    btn.innerHTML = 'Manglacharan <kbd>M</kbd>';
    btn.addEventListener('click', function (e) { e.stopPropagation(); start(); btn.blur(); });
    document.body.appendChild(btn);

    window.addEventListener('resize', function () { if (open) fit(); });
  }

  function fit() {
    /* Largest size that fits the screen: start big and step down. */
    var s = 1.4;
    stage.style.setProperty('--op-scale', s);
    function over() {
      if (stage.scrollHeight > stage.clientHeight + 1) return true;
      var ps = stage.querySelectorAll('.op-g, .op-t');   /* these never wrap */
      for (var k = 0; k < ps.length; k++) if (ps[k].scrollWidth > ps[k].clientWidth + 1) return true;
      return false;
    }
    while (s > 0.4 && over()) {
      s -= 0.04;
      stage.style.setProperty('--op-scale', s.toFixed(2));
    }
  }

  function show(i) {
    at = Math.max(0, Math.min(slides.length - 1, i));
    stage.innerHTML = slides[at]();
    count.textContent = (at + 1) + ' / ' + slides.length;
    ov.querySelector('[data-op="prev"]').disabled = at === 0;
    fit();
  }

  function start() {
    verseIndex = verseForToday();
    open = true;
    ov.hidden = false;
    document.documentElement.classList.add('op-on');
    show(0);
  }
  function close() {
    open = false;
    ov.hidden = true;
    document.documentElement.classList.remove('op-on');
  }
  function next() { if (at >= slides.length - 1) close(); else show(at + 1); }
  function prev() { if (at > 0) show(at - 1); }

  /* Capture phase, so while the slides are up no other shortcut on the page
     (slideshow arrows, Esc leaving slideshow mode, G for Gurmukhi) fires. */
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!open) {
      if ((e.key === 'm' || e.key === 'M') && !e.target.matches('input, select, textarea, [contenteditable]')) {
        e.preventDefault(); e.stopImmediatePropagation(); start();
      }
      return;
    }
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Spacebar' || k === 'Enter') next();
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') prev();
    else if (k === 'Escape') close();
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'Tab') return;           /* let focus move */
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
