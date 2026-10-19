/* ═══════════════════════════════════════════════════════════════
   moosazafar.com — shared behaviour for every page

   Two rules this file is built around:

   1. Nothing here is required in order to read the site. Every
      effect is additive, each feature is isolated in safe(), and the
      reveal path runs before anything that could throw. If this file
      404s or errors, the inline bootstrap in each page forces the
      final visible state.

   2. Animation loops stop when the tab is hidden or the pointer has
      settled, and never start under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Set to true only once the page has actually been revealed. The
     inline bootstrap in each page watches this exact flag — a flag
     set at the top of the file would wrongly suppress the failsafe if
     anything below it threw. */
  window.__siteReady = false;

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Runs a feature in isolation. One broken effect must not take the
     rest of the page down with it. */
  function safe(label, fn) {
    try { fn(); }
    catch (e) {
      if (window.console && console.warn) console.warn('[site.js] ' + label + ' failed:', e);
    }
  }

  /* ── REVEAL ───────────────────────────────────────────────────
     Clears the preloader on genuine readiness (fonts + window load)
     rather than a faked randomised counter, with a hard cap so it can
     never be the reason someone sees nothing.
     ──────────────────────────────────────────────────────────── */
  var bar = $('#pbar');

  function reveal() {
    if (window.__siteReady) return;
    window.__siteReady = true;

    if (bar) bar.style.width = '100%';
    root.classList.add('done');
    window.setTimeout(function () {
      root.classList.remove('loading', 'done');
    }, reduced ? 0 : 450);

    safe('intro', startIntro);
  }

  safe('preloader', function () {
    if (bar) bar.style.width = '35%';

    var ready = [];
    if (document.fonts && document.fonts.ready) ready.push(document.fonts.ready);
    ready.push(new Promise(function (res) {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    }));
    Promise.all(ready).then(reveal).catch(reveal);
  });

  /* Hard cap — the page is never held longer than this, whatever
     happens above. */
  window.setTimeout(reveal, 900);

  /* ── INTRO ANIMATIONS ─────────────────────────────────────── */
  function startIntro() {
    $$('.hrow, .pht-row').forEach(function (el) { el.classList.add('vis'); });
    var line = $('#hline') || $('#phline');
    if (line) line.classList.add('vis');

    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      if (reduced) { el.textContent = target; return; }
      countUp(el, target, 1000);
    });
  }

  /* Counts up to a target that is already the correct value in the HTML.
     requestAnimationFrame is paused in background tabs, so an unguarded
     version can freeze partway and leave a factual claim wrong on screen
     ("0 years at AECOM"). A timer independent of rAF always lands it. */
  function countUp(el, target, dur) {
    if (document.hidden) { el.textContent = target; return; }
    var start = performance.now();
    var settled = false;
    function land() {
      if (settled) return;
      settled = true;
      el.textContent = target;
    }
    (function frame(now) {
      if (settled) return;
      var p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(p * target);
      if (p < 1) requestAnimationFrame(frame);
      else land();
    })(start);
    window.setTimeout(land, dur + 400);
  }

  /* ── CLOCK ────────────────────────────────────────────────────
     aria-hidden in the markup: it is decoration, and a screen reader
     announcing a new time every second is pure noise. Ticks every
     30s instead of every second — the old build did 86,400 DOM
     writes a day to show seconds nobody reads.
     ──────────────────────────────────────────────────────────── */
  safe('clock', function () {
    var clk = $('#clk');
    var dstr = $('#dstr');
    if (!clk && !dstr) return;

    function tick() {
      var n = new Date();
      try {
        if (clk) clk.textContent = n.toLocaleTimeString('en-CA', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Edmonton'
        });
        if (dstr) dstr.textContent = n.toLocaleDateString('en-CA', {
          weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Edmonton'
        }).toUpperCase();
      } catch (e) { /* timezone unsupported — keep the fallback text */ }
    }
    tick();
    window.setInterval(tick, 30000);
  });

  /* ── TICKER ───────────────────────────────────────────────── */
  safe('ticker', function () {
    var tkri = $('#tkri');
    if (!tkri) return;
    var items = (tkri.getAttribute('data-items') || '').split('|').filter(Boolean);
    if (!items.length) return;

    var frag = document.createDocumentFragment();
    // Two passes: the -50% keyframe needs exactly double the content.
    for (var pass = 0; pass < 2; pass++) {
      items.forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'ti';
        s.textContent = t;
        frag.appendChild(s);
        var g = document.createElement('span');
        g.className = 'tg';
        g.textContent = '✦';
        frag.appendChild(g);
      });
    }
    tkri.appendChild(frag);
  });

  /* The tools/credentials grid is plain static markup in index.html.
     It used to be generated from a JS array, which meant the whole
     section rendered empty whenever this file failed to load, and the
     same list had to be maintained twice (once in the array, once in
     a <noscript> copy). Static HTML has neither problem. */

  /* ── SCROLL REVEAL ────────────────────────────────────────── */
  safe('scroll-reveal', function () {
    var targets = $$('.exp-item, .proj, .tool-cat');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (el) { el.classList.add('vis'); });
      $$('.chip').forEach(function (c) { c.classList.add('vis'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('tool-cat')) {
          $$('.chip', el).forEach(function (chip, i) {
            window.setTimeout(function () { chip.classList.add('vis'); }, i * 45);
          });
        } else {
          el.classList.add('vis');
        }
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  });

  /* Safety net: content must never remain invisible because a reveal
     mechanism misfired. */
  window.setTimeout(function () {
    $$('.exp-item, .proj, .chip').forEach(function (el) { el.classList.add('vis'); });
  }, 3000);

  /* ── GRAIN ────────────────────────────────────────────────── */
  safe('grain', function () {
    var grain = $('#grain');
    if (!grain || reduced) return;
    var ns = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' " +
      "numOctaves='4' stitchTiles='stitch'/></filter>" +
      "<rect width='300' height='300' filter='url(#n)'/></svg>";
    grain.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(ns) + '")';
    grain.style.backgroundSize = '300px 300px';
    grain.style.opacity = dark ? '.03' : '.018';
  });

  /* ── CUSTOM CURSOR ───────────────────────────────────────────
     Only on a real pointer, never under reduced motion. The old
     build set `cursor:none` on <body> unconditionally, so touch
     users and anyone whose JS failed lost all pointer feedback.
     ──────────────────────────────────────────────────────────── */
  var mx = 0, my = 0;

  safe('cursor', function () {
    if (!finePointer || reduced) return;
    var dot = $('#cdot'), ring = $('#cring');
    if (!dot || !ring) return;

    root.classList.add('cursor-on');
    var rx = 0, ry = 0, raf = null;

    function followRing() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      // Stops once it has caught up rather than spinning forever.
      if (Math.abs(mx - rx) > 0.4 || Math.abs(my - ry) > 0.4) {
        raf = requestAnimationFrame(followRing);
      } else {
        raf = null;
      }
    }

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      if (raf === null) raf = requestAnimationFrame(followRing);
    }, { passive: true });

    $$('a, button, .int, .chip, .photo-frame').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('big'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('big'); });
    });
  });

  /* ── BACKGROUND CANVAS ───────────────────────────────────────
     Was 704 dots redrawn every frame, forever, even on a hidden tab.
     Now: skipped entirely under reduced motion, density scales with
     the viewport, and the loop pauses when the tab is backgrounded.
     ──────────────────────────────────────────────────────────── */
  safe('canvas', function () {
    var canvas = $('#bg-canvas');
    if (!canvas || reduced || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var dots = [];
    var raf = null;

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var cols = Math.max(10, Math.min(32, Math.round(window.innerWidth / 46)));
      var rows = Math.max(8, Math.min(22, Math.round(window.innerHeight / 40)));
      dots = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          dots.push({
            x: (c + 0.5) / cols,
            y: (r + 0.5) / rows,
            p: Math.random() * Math.PI * 2,
            s: 0.3 + Math.random() * 0.7
          });
        }
      }
    }

    function draw(ts) {
      var t = ts / 1000;
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var x = d.x * w, y = d.y * h;
        var boost = 0;
        if (finePointer) {
          var dx = x - mx, dy = y - my;
          var dist = Math.sqrt(dx * dx + dy * dy);
          boost = Math.max(0, 1 - dist / 200) * 0.15;
        }
        var a = (dark ? 0.05 : 0.08) + 0.025 * Math.sin(t * d.s + d.p) + boost;
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? 'rgba(201,169,110,' + a + ')'
          : 'rgba(90,70,34,' + a + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    function play() { if (raf === null) raf = requestAnimationFrame(draw); }
    function pause() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

    build();
    play();

    var rsz;
    window.addEventListener('resize', function () {
      window.clearTimeout(rsz);
      rsz = window.setTimeout(build, 150);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else play();
    });
  });

  /* ── PHONE: FADE THE PINNED PORTRAIT AS THE PAGE SCROLLS ─────
     The frame is fixed by CSS; this only drives its opacity. The
     .photo-fade class is set by the inline bootstrap before paint, so
     nothing here affects layout — if this block never runs, the
     bootstrap's failsafe drops the class and the photo returns to
     normal flow.
     ──────────────────────────────────────────────────────────── */
  safe('photo-fade', function () {
    var frame = $('.photo-frame');
    if (!frame) return;

    var mq = window.matchMedia('(max-width:768px)');
    var raf = null;

    var LEAD = 48;      // keep the dissolve this far ahead of the type
    var RATE = 1.25;    // wipe travels faster than the scroll, so the edge
                        // visibly sweeps instead of riding with the text
    var DRIFT = 0.16;   // how far the photo creeps up per pixel scrolled
    var EASE = 0.16;    // follow factor; lower trails more softly

    var shown = 0;      // eased wipe fraction actually rendered
    var baseTop = 0, baseH = 1;

    // Measured with the drift removed. The frame is position:fixed, so
    // these do not change while scrolling — only on resize.
    function measure() {
      root.style.setProperty('--photo-shift', '0px');
      var b = frame.getBoundingClientRect();
      baseTop = b.top;
      baseH = b.height || 1;
    }

    function update() {
      raf = null;
      if (!root.classList.contains('photo-fade')) return;

      var y = window.scrollY;

      // Two drivers. The scroll one gives the dissolve its own pace so it
      // reads as happening, rather than sitting at a fixed offset from the
      // text. The text one is a floor: the photo must always be gone where
      // type lands, whatever the pacing does.
      var riser = $('.hmeta') || $('.hbio');
      var floor = riser
        ? ((baseTop + baseH) - riser.getBoundingClientRect().top + LEAD) / baseH
        : 0;
      var target = Math.min(1, Math.max(0, Math.max(y * RATE / baseH, floor)));

      // Ease toward the target so the edge glides instead of stepping with
      // each scroll event, but never let the easing fall behind the floor.
      shown += (target - shown) * EASE;
      if (shown < floor) shown = floor;
      if (Math.abs(target - shown) < 0.002) shown = target;

      root.style.setProperty('--photo-wipe', (shown * 100).toFixed(2) + '%');
      root.style.setProperty('--photo-shift', (-y * DRIFT).toFixed(1) + 'px');
      // Only used where mask-image is unsupported.
      root.style.setProperty('--photo-fade', String(1 - shown));

      // Keep stepping while the eased value is still catching up.
      if (shown !== target && raf === null) raf = requestAnimationFrame(update);
    }

    function onScroll() {
      if (raf === null) raf = requestAnimationFrame(update);
    }

    function sync() {
      if (mq.matches && !reduced) {
        root.classList.add('photo-fade');
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', measure);
        update();
      } else {
        // Rotating to landscape or widening past the breakpoint must put
        // the photo back in flow, or it stays pinned on desktop.
        root.classList.remove('photo-fade');
        root.style.removeProperty('--photo-wipe');
        root.style.removeProperty('--photo-shift');
        root.style.removeProperty('--photo-fade');
        shown = 0;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', measure);
        if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      }
    }

    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
  });

  /* ── LINK LABEL SCRAMBLE ──────────────────────────────────── */
  safe('scramble', function () {
    if (reduced) return;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $$('.int').forEach(function (el) {
      var target = $('.it', el);
      if (!target) return;
      var original = target.textContent;
      var raf = null;

      el.addEventListener('mouseenter', function () {
        var upper = original.toUpperCase();
        var start = performance.now();
        if (raf !== null) cancelAnimationFrame(raf);
        (function frame(now) {
          var p = Math.min((now - start) / 420, 1);
          target.textContent = upper.split('').map(function (c, i) {
            if (c === ' ' || c === '&') return c;
            return i / upper.length < p ? c : chars[Math.floor(Math.random() * chars.length)];
          }).join('');
          if (p < 1) raf = requestAnimationFrame(frame);
          else { target.textContent = upper; raf = null; }
        })(start);
      });

      el.addEventListener('mouseleave', function () {
        if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
        target.textContent = original;
      });
    });
  });
})();
