/* ==========================================================================
   RX SUBZERO — app.js
   Namespaced vanilla-JS engine (no deps, no build). One IIFE exposes RXSZ.

   PUBLIC API  (window.RXSZ)
   -------------------------------------------------------------------------
   RXSZ.setLang(lang)        -> Promise  Switch language ('en'|'es'), apply &
                                         persist to localStorage 'rxsz-lang'.
   RXSZ.getLang()            -> string   Current language code.
   RXSZ.t(keyPath)           -> string|undefined  Resolve a dot/index key from
                                         the loaded dictionary (e.g. 'hero.title',
                                         'benefits.items.0.title').
   RXSZ.applyIcons(root?)    -> void     Hydrate [data-icon] from RXSZ_ICONS.
   RXSZ.applyI18n(root?)     -> void     Re-bind [data-i18n*] on a subtree with
                                         the current dictionary.
   RXSZ.observeReveals(root?)-> void     Register any new .rxsz-reveal for scroll
                                         reveal (use after injecting DOM).
   RXSZ.hydrate(root?)       -> void     Icons + i18n + reveals for a subtree.
   RXSZ.version              -> string
   Events dispatched on document:
     'rxsz:langchange'  detail:{ lang }   after a successful language apply.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var RXSZ = window.RXSZ || {};
  RXSZ.version = '1.0.0';

  var root = document.documentElement;
  var LANG_KEY = 'rxsz-lang';
  var DEFAULT_LANG = 'en';

  /* --- environment flags ------------------------------------------------- */
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* no matchMedia */ }

  var pointerFine = false;
  try {
    pointerFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  } catch (e) { /* ignore */ }

  /* internal state */
  var state = {
    page: (document.body && document.body.dataset && document.body.dataset.page) || '',
    lang: DEFAULT_LANG,
    dict: null
  };

  /* --- tiny helpers ------------------------------------------------------ */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }

  /* Resolve 'a.b.0.c' against a nested object/array. Numeric segments index
     arrays (or object keys). Returns undefined if any hop is missing. */
  function resolveKey(obj, path) {
    if (!obj || !path) return undefined;
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ======================================================================
     1. i18n ENGINE  (contract §10)
     ====================================================================== */

  /* Apply the current dictionary to a subtree (default: whole document). */
  function applyI18n(ctx) {
    var dict = state.dict;
    if (!dict) return;

    // textContent bindings
    qsa('[data-i18n]', ctx).forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = resolveKey(dict, key);
      if (val == null) { console.warn('[RXSZ i18n] missing key:', key); return; }
      el.textContent = val;
    });

    // innerHTML bindings (copy that needs <br>/<strong>)
    qsa('[data-i18n-html]', ctx).forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var val = resolveKey(dict, key);
      if (val == null) { console.warn('[RXSZ i18n] missing html key:', key); return; }
      el.innerHTML = val;
    });

    // attribute bindings: "alt:hero.img_alt; aria-label:nav.menu"
    qsa('[data-i18n-attr]', ctx).forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      spec.split(';').forEach(function (pair) {
        pair = pair.trim();
        if (!pair) return;
        var idx = pair.indexOf(':');
        if (idx < 0) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        if (!attr || !key) return;
        var val = resolveKey(dict, key);
        if (val == null) { console.warn('[RXSZ i18n] missing attr key:', key); return; }
        el.setAttribute(attr, val);
      });
    });
  }

  /* Reflect active language on the toggle controls. Supports both a single
     [data-lang-toggle] (flips to the other language) and discrete
     [data-lang="en"|"es"] option buttons. */
  function updateLangUI(lang) {
    var next = lang === 'en' ? 'es' : 'en';

    qsa('[data-lang]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', isActive);
      if (btn.hasAttribute('aria-pressed')) {
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    qsa('[data-lang-toggle]').forEach(function (t) {
      t.setAttribute('data-current-lang', lang);
      // If the toggle shows the *target* language as a label, update it.
      var label = t.querySelector('[data-lang-label]');
      if (label) label.textContent = next.toUpperCase();
      if (!t.querySelector('[data-i18n]')) {
        t.setAttribute('aria-label',
          'Language: ' + lang.toUpperCase() + ' — switch to ' + next.toUpperCase());
      }
    });
  }

  /* Load + apply a language dictionary. Returns a Promise (resolves even on
     failure so callers never break). Missing file -> keep authored fallback
     copy already in the HTML. */
  function loadLang(lang) {
    lang = (lang === 'es') ? 'es' : 'en';
    if (!state.page) {
      console.warn('[RXSZ i18n] body[data-page] not set — skipping i18n fetch.');
      state.lang = lang;
      root.setAttribute('lang', lang);
      updateLangUI(lang);
      return Promise.resolve(null);
    }

    var url = 'assets/i18n/' + state.page + '.' + lang + '.json';

    if (!window.fetch) {
      console.warn('[RXSZ i18n] fetch unavailable — keeping fallback copy.');
      state.lang = lang;
      root.setAttribute('lang', lang);
      updateLangUI(lang);
      return Promise.resolve(null);
    }

    return window.fetch(url, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (dict) {
        state.dict = dict;
        state.lang = lang;
        applyI18n();
        root.setAttribute('lang', lang);
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
        updateLangUI(lang);
        try {
          document.dispatchEvent(new CustomEvent('rxsz:langchange', { detail: { lang: lang } }));
        } catch (e) { /* IE-less env */ }
        return dict;
      })
      .catch(function (err) {
        console.warn('[RXSZ i18n] failed to load', url, '-', err.message);
        // Still record intent + reflect UI so a retry/other lang works.
        state.lang = lang;
        root.setAttribute('lang', lang);
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
        updateLangUI(lang);
        return null;
      });
  }

  /* Public: switch language. */
  function setLang(lang) { return loadLang(lang); }

  /* Wire toggle controls once (event delegation → robust to re-render). */
  function initLangToggle() {
    on(document, 'click', function (ev) {
      var opt = ev.target.closest ? ev.target.closest('[data-lang]') : null;
      if (opt) {
        ev.preventDefault();
        setLang(opt.getAttribute('data-lang'));
        return;
      }
      var toggle = ev.target.closest ? ev.target.closest('[data-lang-toggle]') : null;
      if (toggle) {
        ev.preventDefault();
        setLang(state.lang === 'en' ? 'es' : 'en');
      }
    });
  }

  /* Read saved language (default en). */
  function savedLang() {
    var stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) {}
    return stored === 'es' ? 'es' : DEFAULT_LANG;
  }

  /* ======================================================================
     2. ICON HYDRATION  (contract §12)
     Inject window.RXSZ_ICONS[name] into every [data-icon=name].
     ====================================================================== */
  function applyIcons(ctx) {
    var icons = window.RXSZ_ICONS || {};
    qsa('[data-icon]', ctx).forEach(function (el) {
      if (el.getAttribute('data-icon-loaded') === '1') return;
      var name = el.getAttribute('data-icon');
      var svg = icons[name];
      if (!svg) { console.warn('[RXSZ icons] missing icon:', name); return; }
      el.innerHTML = svg;
      el.setAttribute('data-icon-loaded', '1');
      if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
    });
  }

  /* ======================================================================
     3. SCROLL REVEALS  ( .rxsz-reveal -> .is-in )
     Children of a [data-stagger] container get an auto --i index.
     Hero reveals are excluded here — they animate on load (see initHeroLoad).
     ====================================================================== */
  var revealObserver = null;
  var observedReveals = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  function markObserved(el) { if (observedReveals) observedReveals.add(el); }
  function isObserved(el) { return observedReveals ? observedReveals.has(el) : false; }

  /* Assign incremental --i to reveal children inside [data-stagger] blocks. */
  function assignStagger(ctx) {
    qsa('[data-stagger]', ctx).forEach(function (group) {
      var base = parseInt(group.getAttribute('data-stagger'), 10);
      if (isNaN(base)) base = 0;
      var kids = qsa('.rxsz-reveal', group).filter(function (k) {
        return k.parentNode === group || k.closest('[data-stagger]') === group;
      });
      kids.forEach(function (k, i) {
        if (!k.style.getPropertyValue('--i')) k.style.setProperty('--i', base + i);
      });
    });
  }

  function revealNow(el) { el.classList.add('is-in'); }

  function observeReveals(ctx) {
    var els = qsa('.rxsz-reveal', ctx).filter(function (el) {
      // Skip hero reveals (handled on load) and already-observed nodes.
      return !el.closest('#hero') && !isObserved(el);
    });
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(revealNow);
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            revealNow(e.target);
            revealObserver.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }
    els.forEach(function (el) { markObserved(el); revealObserver.observe(el); });
  }

  function initReveals() {
    assignStagger(document);
    observeReveals(document);
  }

  /* Orchestrated hero entrance: reveal hero children immediately on load so
     they never wait for a scroll event. Stagger is expressed by --i in markup. */
  function initHeroLoad() {
    var hero = qs('#hero');
    if (!hero) return;
    var reveals = qsa('.rxsz-reveal', hero);
    if (!reveals.length) { root.classList.add('is-hero-in'); return; }
    // Two rAFs so the browser paints the hidden state first, then transitions.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        reveals.forEach(revealNow);
        root.classList.add('is-hero-in');
      });
    });
  }

  /* ======================================================================
     4. ANIMATED COUNTERS  ( [data-count="4.9"] )
     Optional: data-count-prefix, data-count-suffix, data-count-decimals,
     data-count-dur (ms). Respects reduced motion (sets final instantly).
     ====================================================================== */
  function formatCount(val, decimals) {
    return decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
  }

  function runCounter(el) {
    if (el.getAttribute('data-count-done') === '1') return;
    el.setAttribute('data-count-done', '1');

    var raw = el.getAttribute('data-count');
    var target = parseFloat(raw);
    if (isNaN(target)) return;

    var declared = el.getAttribute('data-count-decimals');
    var decimals = (declared != null)
      ? parseInt(declared, 10)
      : ((String(raw).split('.')[1] || '').length);
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    var dur = parseInt(el.getAttribute('data-count-dur'), 10) || 1600;

    if (reduceMotion || !window.requestAnimationFrame) {
      el.textContent = prefix + formatCount(target, decimals) + suffix;
      return;
    }

    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = prefix + formatCount(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    var els = qsa('[data-count]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(runCounter); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ======================================================================
     5. MAGNETIC BUTTONS  ( .rxsz-btn--magnetic, pointer:fine only )
     ====================================================================== */
  function initMagnetic() {
    if (reduceMotion || !pointerFine) return;
    qsa('.rxsz-btn--magnetic').forEach(function (btn) {
      var strength = parseFloat(btn.getAttribute('data-magnet'));
      if (isNaN(strength)) strength = 0.32;
      function move(e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform =
          'translate(' + (mx * strength).toFixed(1) + 'px,' + (my * strength).toFixed(1) + 'px)';
      }
      function reset() { btn.style.transform = ''; }
      on(btn, 'pointermove', move);
      on(btn, 'pointerleave', reset);
      on(btn, 'blur', reset);
    });
  }

  /* ======================================================================
     6. STICKY HEADER  ( .is-scrolled past 40px )
     ====================================================================== */
  function initHeader() {
    var header = qs('[data-header]') || qs('.rxsz-nav') ||
                 (document.querySelector('header'));
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', (window.pageYOffset || window.scrollY) > 40);
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ======================================================================
     7. FLOATING CTA  ( visible after hero, hidden near #offer / footer )
     ====================================================================== */
  function initFloatCta() {
    var cta = qs('.rxsz-floatcta');
    if (!cta) return;

    var hero = qs('#hero');
    var endEls = [qs('#offer'), qs('.rxsz-footer'), qs('footer')].filter(Boolean);

    var heroVisible = !!hero;   // assume hero in view at load
    var endVisible = false;

    function sync() { cta.classList.toggle('is-visible', !heroVisible && !endVisible); }

    if ('IntersectionObserver' in window) {
      if (hero) {
        new IntersectionObserver(function (entries) {
          heroVisible = entries[0].isIntersecting;
          sync();
        }, { threshold: 0 }).observe(hero);
      } else {
        heroVisible = false;
      }

      if (endEls.length) {
        var endMap = (typeof Map !== 'undefined') ? new Map() : null;
        var endObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (endMap) endMap.set(e.target, e.isIntersecting);
          });
          endVisible = endMap
            ? Array.from(endMap.values()).some(Boolean)
            : entries.some(function (e) { return e.isIntersecting; });
          sync();
        }, { threshold: 0 });
        endEls.forEach(function (el) { endObs.observe(el); });
      }
      sync();
    } else {
      // Fallback: simple scroll math.
      on(window, 'scroll', function () {
        var y = window.pageYOffset || window.scrollY;
        var past = hero ? y > (hero.offsetTop + hero.offsetHeight - 120) : y > 400;
        var nearEnd = false;
        endEls.forEach(function (el) {
          var top = el.getBoundingClientRect().top;
          if (top < window.innerHeight) nearEnd = true;
        });
        heroVisible = !past; endVisible = nearEnd; sync();
      }, { passive: true });
    }
  }

  /* ======================================================================
     8. FAQ ACCORDION  ( button[aria-expanded] + role="region" panel )
     Panel height animates 0 <-> scrollHeight <-> auto. Closed panels are
     [hidden] (not focusable). Add [data-accordion-single] on a container to
     make it exclusive (opening one closes its siblings).
     ====================================================================== */
  function panelFor(btn) {
    var id = btn.getAttribute('aria-controls');
    var panel = id ? document.getElementById(id) : null;
    if (!panel) {
      panel = btn.nextElementSibling;
      // walk up to a wrapping trigger (e.g. <h3><button></h3>)
      if (!panel && btn.parentNode) panel = btn.parentNode.nextElementSibling;
    }
    return (panel && panel.classList) ? panel : null;
  }

  function openPanel(btn, panel) {
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    panel.classList.add('is-open');
    if (reduceMotion) { panel.style.height = 'auto'; return; }
    var h = panel.scrollHeight;
    panel.style.height = '0px';
    // force reflow so the transition runs from 0
    /* eslint-disable-next-line no-unused-expressions */
    panel.offsetHeight;
    panel.style.height = h + 'px';
    var done = function (e) {
      if (e && e.propertyName && e.propertyName !== 'height') return;
      panel.style.height = 'auto';
      panel.removeEventListener('transitionend', done);
    };
    on(panel, 'transitionend', done);
  }

  function closePanel(btn, panel) {
    btn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    if (reduceMotion) { panel.style.height = ''; panel.hidden = true; return; }
    var h = panel.scrollHeight;
    panel.style.height = h + 'px';
    /* eslint-disable-next-line no-unused-expressions */
    panel.offsetHeight;
    panel.style.height = '0px';
    var done = function (e) {
      if (e && e.propertyName && e.propertyName !== 'height') return;
      panel.hidden = true;
      panel.removeEventListener('transitionend', done);
    };
    on(panel, 'transitionend', done);
  }

  function initFaq() {
    var triggers = qsa('.rxsz-faq__q, [data-accordion-trigger]');
    triggers.forEach(function (btn) {
      var panel = panelFor(btn);
      if (!panel) return;

      // Ensure the panel is a labelled region.
      if (!panel.getAttribute('role')) panel.setAttribute('role', 'region');
      if (btn.id && !panel.getAttribute('aria-labelledby')) {
        panel.setAttribute('aria-labelledby', btn.id);
      }
      if (!btn.hasAttribute('aria-controls') && panel.id) {
        btn.setAttribute('aria-controls', panel.id);
      }

      // Initial state from authored aria-expanded (default closed).
      var startOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', startOpen ? 'true' : 'false');
      if (startOpen) { panel.hidden = false; panel.classList.add('is-open'); panel.style.height = 'auto'; }
      else { panel.hidden = true; panel.style.height = '0px'; }

      on(btn, 'click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (isOpen) { closePanel(btn, panel); return; }

        // Exclusive mode: close siblings within the same [data-accordion-single].
        var group = btn.closest('[data-accordion-single]');
        if (group) {
          qsa('.rxsz-faq__q, [data-accordion-trigger]', group).forEach(function (other) {
            if (other !== btn && other.getAttribute('aria-expanded') === 'true') {
              var op = panelFor(other);
              if (op) closePanel(other, op);
            }
          });
        }
        openPanel(btn, panel);
      });
    });
  }

  /* ======================================================================
     9. LIQUID METABALL CANVAS  (optional, guarded)
     Additive drifting glow blobs behind the hero. Skipped on reduced-motion,
     small screens, or low core counts — the CSS .rxsz-liquid-bg is the
     always-on fallback. Pauses when the tab is hidden.
     ====================================================================== */
  function hexToRgba(hex, a) {
    if (!hex) return 'rgba(108,140,192,' + a + ')';
    hex = hex.trim().replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n) || hex.length !== 6) return 'rgba(108,140,192,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function cssVar(name, fallback) {
    var v = '';
    try { v = getComputedStyle(document.body).getPropertyValue(name); } catch (e) {}
    v = (v || '').trim();
    return v || fallback;
  }

  function initLiquid() {
    if (reduceMotion) return;
    if (window.innerWidth < 768) return;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return;

    var hero = qs('#hero');
    if (!hero) return;
    var host = hero.querySelector('.rxsz-hero__bg') || hero;

    var canvas = document.createElement('canvas');
    canvas.className = 'rxsz-liquid';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;

    // Ensure the host can position an absolute child.
    try {
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    } catch (e) {}
    host.insertBefore(canvas, host.firstChild);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], raf = 0, running = true, seeded = false;

    var palette = [
      hexToRgba(cssVar('--rxsz-steel-lit', '#6C8CC0'), 0.55),
      hexToRgba(cssVar('--rxsz-steel', '#3A5888'), 0.5),
      hexToRgba(cssVar('--rxsz-glow', '#8FD3E6'), 0.42),
      hexToRgba(cssVar('--rxsz-ice', '#C9DAE0'), 0.3)
    ];

    function seed() {
      parts = [];
      var count = 5;
      for (var i = 0; i < count; i++) {
        var r = (Math.min(w, h) * (0.28 + Math.random() * 0.22));
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: r,
          dx: (Math.random() - 0.5) * 0.18,
          dy: (Math.random() - 0.5) * 0.14,
          color: palette[i % palette.length]
        });
      }
      seeded = true;
    }

    function resize() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!seeded) seed();
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.dx; p.y += p.dy;
        if (p.x < -p.r) p.x = w + p.r; else if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r; else if (p.y > h + p.r) p.y = -p.r;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    var rt;
    on(window, 'resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 200);
    }, { passive: true });

    on(document, 'visibilitychange', function () {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; raf = requestAnimationFrame(frame); }
    });

    raf = requestAnimationFrame(frame);
  }

  /* ======================================================================
     10. MOBILE NAV DRAWER  ( [data-nav-toggle] ⇄ .rxsz-nav__drawer )
     The CSS opens the drawer on either `.rxsz-nav.is-open` OR
     `:has([aria-expanded="true"])`; we flip both so browsers without :has()
     still work. Keyboard: opens focus first drawer link, Escape / outside
     click / anchor click close and restore focus to the toggle.
     ====================================================================== */
  function initNav() {
    var toggle = qs('[data-nav-toggle]');
    var nav = qs('[data-nav]') || qs('.rxsz-nav');
    if (!toggle || !nav) return;
    var drawer = qs('[data-nav-drawer]', nav) || qs('.rxsz-nav__drawer', nav);

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
      // Move focus to the first actionable item in the drawer.
      var first = drawer && qs('a, button', drawer);
      if (first) { try { first.focus(); } catch (e) {} }
    }

    function close(restoreFocus) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      if (restoreFocus) { try { toggle.focus(); } catch (e) {} }
    }

    on(toggle, 'click', function (ev) {
      ev.preventDefault();
      if (isOpen()) close(false); else open();
    });

    // Close after choosing a destination in the drawer.
    if (drawer) {
      on(drawer, 'click', function (ev) {
        var link = ev.target.closest ? ev.target.closest('a') : null;
        if (link) close(false);
      });
    }

    // Escape closes and returns focus to the toggle.
    on(document, 'keydown', function (ev) {
      if ((ev.key === 'Escape' || ev.keyCode === 27) && isOpen()) close(true);
    });

    // Outside click closes (ignore clicks inside the nav itself).
    on(document, 'click', function (ev) {
      if (!isOpen()) return;
      if (nav.contains(ev.target)) return;
      close(false);
    });
  }

  /* ======================================================================
     11. ANNOUNCEMENT BAR DISMISS  ( [data-announce-dismiss] )
     Hides the [data-announce] bar and remembers the choice for the session.
     ====================================================================== */
  var ANNOUNCE_KEY = 'rxsz-announce-dismissed';

  function initAnnounce() {
    var bar = qs('[data-announce]');
    if (!bar) return;

    // Restore a previous dismissal.
    var dismissed = null;
    try { dismissed = localStorage.getItem(ANNOUNCE_KEY); } catch (e) {}
    if (dismissed === '1') { bar.classList.add('is-dismissed'); return; }

    var btn = qs('[data-announce-dismiss]', bar);
    if (!btn) return;
    on(btn, 'click', function () {
      bar.classList.add('is-dismissed');
      try { localStorage.setItem(ANNOUNCE_KEY, '1'); } catch (e) {}
    });
  }

  /* ======================================================================
     PUBLIC HYDRATE HELPERS (for dynamically injected DOM)
     ====================================================================== */
  function hydrate(ctx) {
    applyIcons(ctx);
    applyI18n(ctx);
    assignStagger(ctx);
    observeReveals(ctx);
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    // Flip no-js -> js as early as possible so CSS states apply.
    root.classList.remove('no-js');
    root.classList.add('js');

    // Safety net: if anything below throws, make all content visible.
    try {
      applyIcons(document);
      initHeroLoad();
      initReveals();
      initCounters();
      initMagnetic();
      initHeader();
      initFloatCta();
      initFaq();
      initNav();
      initAnnounce();
      initLangToggle();
      initLiquid();

      // i18n last: fetch is async and must not block interaction setup.
      state.lang = savedLang();
      loadLang(state.lang);
    } catch (err) {
      console.error('[RXSZ] init error:', err);
      qsa('.rxsz-reveal').forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* --- expose public API ------------------------------------------------- */
  RXSZ.setLang = setLang;
  RXSZ.getLang = function () { return state.lang; };
  RXSZ.t = function (key) { return resolveKey(state.dict, key); };
  RXSZ.applyIcons = applyIcons;
  RXSZ.applyI18n = applyI18n;
  RXSZ.observeReveals = observeReveals;
  RXSZ.hydrate = hydrate;
  window.RXSZ = RXSZ;

  /* --- run --------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

})(window, document);
