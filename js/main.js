/* Badrinath Nandaluri — portfolio v2. Vanilla JS, no build step. */
(function () {
  'use strict';

  var body = document.body, docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var skipIntro = reduced || new URLSearchParams(location.search).has('nointro');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var failsafe = setTimeout(function () { body.classList.add('loaded'); }, 7000);
  var vw = window.innerWidth, vh = window.innerHeight;
  var mouse = { x: 0.5, y: 0.5, cx: -9999, cy: -9999 }; // off-screen until the pointer actually moves
  window.addEventListener('pointermove', function (e) {
    mouse.cx = e.clientX; mouse.cy = e.clientY;
    mouse.x = e.clientX / vw; mouse.y = e.clientY / vh;
  }, { passive: true });

  /* ---------------- Smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    try { lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true }); } catch (e) { lenis = null; }
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.3 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      scrollToY(t.getBoundingClientRect().top + window.scrollY);
    });
  });

  /* ---------------- Text splitting ---------------- */
  function splitWords(el, outerClass, innerClass) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span');
            outer.className = outerClass;
            if (innerClass) {
              var inner = document.createElement('span');
              inner.className = innerClass; inner.style.setProperty('--i', i); inner.textContent = part;
              outer.appendChild(inner);
            } else outer.textContent = part;
            i++; frag.appendChild(outer);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
  }
  $$('[data-split]').forEach(function (el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    splitWords(el, 'w', 'wi');
  });
  var scrubWords = [];
  $$('[data-scrub]').forEach(function (el) { splitWords(el, 'sw', null); scrubWords = $$('.sw', el); });
  $$('.chars').forEach(function (el) {
    var text = el.textContent; el.textContent = '';
    text.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'c'; s.style.setProperty('--i', i); s.textContent = ch;
      el.appendChild(s);
    });
  });

  /* ---------------- Reveal + counters ---------------- */
  function fmt(v, d, sep) { var s = v.toFixed(d); return sep ? Number(s).toLocaleString('en-US') : s; }
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10), sep = el.hasAttribute('data-sep');
    if (reduced) { el.textContent = fmt(target, d, sep); return; }
    var start = performance.now();
    (function tick(now) {
      var p = clamp((now - start) / 1700, 0, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)), d, sep);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  var revealEls = $$('.reveal, [data-split], .contact__title');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        var c = en.target.querySelector('[data-count]');
        if (c) countUp(c);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add('in'); });

  /* ---------------- Loader (orbital dots) ---------------- */
  var loaded = false;
  function finish() { loaded = true; clearTimeout(failsafe); body.classList.add('loaded'); }
  (function loader() {
    // The web itself draws in CSS (loader__web); this just runs the counter and times the reveal.
    var countEl = $('#loaderCount');
    if (skipIntro || !countEl) { finish(); return; }
    var start = performance.now(), dur = 2100;
    (function tick(now) {
      var p = clamp((now - start) / dur, 0, 1);
      countEl.textContent = Math.round(ease(p) * 100);
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 220);
    })(start);
  })();

  /* ---------------- Frame callbacks ---------------- */
  var frames = [];
  function onFrame(fn) { frames.push(fn); }

  /* ---------------- Nav ---------------- */
  var nav = $('#nav'), navInd = $('#navInd'), navLinks = $$('.nav__pill a');
  var themed = $$('[data-theme]');
  var secIds = navLinks.map(function (a) { return document.getElementById(a.getAttribute('data-sec')); });
  var activeNav = -1, lastY = 0;
  function setNav(i) {
    if (i === activeNav) return;
    activeNav = i;
    navLinks.forEach(function (a, k) { a.classList.toggle('on', k === i); });
    var a = navLinks[i];
    if (a && a.offsetWidth) { navInd.style.width = a.offsetWidth + 'px'; navInd.style.transform = 'translateX(' + a.offsetLeft + 'px)'; }
  }
  function updateNav(y) {
    var dark = false;
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) { dark = themed[i].getAttribute('data-theme') === 'dark'; break; }
    }
    nav.classList.toggle('on-dark', dark);
    var idx = 0;
    for (var k = 0; k < secIds.length; k++) if (secIds[k] && secIds[k].getBoundingClientRect().top <= vh * 0.45) idx = k;
    setNav(idx);
    if (y > vh && y > lastY + 6) nav.classList.add('is-hidden');
    else if (y < lastY - 6 || y < vh) nav.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('load', function () { activeNav = -1; updateNav(window.scrollY); });

  /* ---------------- Hero parallax ---------------- */
  var hero = $('.hero');
  var depthEls = $$('[data-depth]').map(function (el) { return { el: el, d: parseFloat(el.getAttribute('data-depth')) }; });
  var pmx = 0, pmy = 0;
  function updateHero(y) {
    if (y > vh * 1.1) return;
    pmx = lerp(pmx, mouse.x - 0.5, 0.06); pmy = lerp(pmy, mouse.y - 0.5, 0.06);
    depthEls.forEach(function (o) {
      var k = o.d > 0 ? 0.34 : 0.12;
      o.el.style.setProperty('--tx', (pmx * o.d * 26).toFixed(2) + 'px');
      o.el.style.setProperty('--ty', (pmy * o.d * 16 + y * k).toFixed(2) + 'px');
    });
  }

  /* ---------------- About: expanding stage ---------------- */
  var expand = $('.expand'), expandStage = $('.expand__stage'), expandHint = $('#expandHint');
  function prog(el) {
    var r = el.getBoundingClientRect(), total = r.height - vh;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }
  function updateExpand() {
    var r = expand.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    var p = reduced ? 1 : prog(expand);
    var e = ease(clamp(p / 0.5, 0, 1));
    var w0 = Math.max(200, vw * 0.19), h0 = Math.min(vh * 0.46, w0 * 1.35);
    var s = expandStage.style;
    s.setProperty('--w0', w0 + 'px');
    s.setProperty('--w', lerp(w0, vw, e).toFixed(1) + 'px');
    s.setProperty('--h', lerp(h0, vh, e).toFixed(1) + 'px');
    s.setProperty('--r', lerp(22, 0, e).toFixed(1) + 'px');
    var shift = e * vw * 0.6;
    $('.expand__word--l').style.setProperty('--sx', (-shift).toFixed(1) + 'px');
    $('.expand__word--r').style.setProperty('--sx', shift.toFixed(1) + 'px');
    s.setProperty('--wo', (1 - clamp((p - 0.28) / 0.18, 0, 1)).toFixed(3));
    var co = clamp((p - 0.48) / 0.12, 0, 1);
    s.setProperty('--co', co.toFixed(3));
    s.setProperty('--so', (co * 0.62).toFixed(3));
    expandHint.style.opacity = (1 - clamp(p / 0.08, 0, 1)).toFixed(2);
    var n = Math.round(clamp((p - 0.56) / 0.36, 0, 1) * scrubWords.length);
    for (var i = 0; i < scrubWords.length; i++) scrubWords[i].classList.toggle('on', i < n);
  }

  /* ---------------- Experience: horizontal ---------------- */
  var hx = $('.hx'), hxTrack = $('#hxTrack'), hxBar = $('#hxBar'), hxNums = $$('.hx__num');
  var hxDist = 0;
  function layoutHx() {
    var stat = reduced || vw < 981 || vh < 560;
    hx.classList.toggle('is-static', stat);
    if (stat) { hx.style.height = ''; hxTrack.style.transform = ''; hxDist = 0; return; }
    hxDist = Math.max(0, hxTrack.scrollWidth - vw);
    hx.style.height = (hxDist + vh) + 'px';
  }
  function updateHx() {
    if (!hxDist) return;
    var p = prog(hx);
    hxTrack.style.transform = 'translate3d(' + (-p * hxDist).toFixed(1) + 'px,0,0)';
    hxBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    for (var i = 0; i < hxNums.length; i++) hxNums[i].style.setProperty('--nx', ((p - 0.5) * 220).toFixed(1) + 'px');
    if (hxCity) hxCity.style.setProperty('--cx', (-p * hxDist * 0.35).toFixed(1) + 'px'); // skyline drifts slower than the panels
  }
  var hxCity = $('.hx__city');

  /* ---------------- Works: 3D drum wheel ---------------- */
  var works = $('.works'), ring = $('#wheelRing'), items = $$('.wheel__item'), pds = $$('.pd'), workIdx = $('#workIdx');
  var N = items.length, STEP = 27, R = 250, rot = 0, activeWork = 0, worksStatic = false;
  function layoutWorks() {
    worksStatic = reduced || vw < 981 || vh < 640;
    works.classList.toggle('is-static', worksStatic);
    if (worksStatic) { works.style.height = ''; return; }
    var ih = items[0].offsetHeight || 80;
    R = (ih * 1.12) / (2 * Math.tan((STEP * Math.PI / 180) / 2));
    works.style.height = (vh + (N - 1) * vh * 0.62) + 'px';
    items.forEach(function (it, i) { it.dataset.base = 'rotateX(' + (-i * STEP) + 'deg) translateZ(' + R.toFixed(1) + 'px)'; });
  }
  function setWork(i) {
    if (i === activeWork) return;
    activeWork = i;
    pds.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    items.forEach(function (it, k) { it.classList.toggle('on', k === i); });
    workIdx.textContent = (i < 9 ? '0' : '') + (i + 1);
  }
  function workTo(i) {
    i = clamp(i, 0, N - 1);
    var top = works.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + (i / (N - 1)) * (works.offsetHeight - vh));
  }
  items.forEach(function (it, i) { it.addEventListener('click', function () { workTo(i); }); });
  $('#workPrev').addEventListener('click', function () { workTo(activeWork - 1); });
  $('#workNext').addEventListener('click', function () { workTo(activeWork + 1); });
  items[0].classList.add('on');
  function updateWorks() {
    if (worksStatic) return;
    var r = works.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    var target = prog(works) * (N - 1) * STEP;
    rot = lerp(rot, target, 0.12);
    if (Math.abs(rot - target) < 0.01) rot = target;
    ring.style.transform = 'translateZ(' + (-R).toFixed(1) + 'px) rotateX(' + rot.toFixed(2) + 'deg)';
    for (var i = 0; i < N; i++) {
      var delta = Math.abs(i * STEP - rot);
      var o = Math.pow(clamp(1 - delta / 82, 0, 1), 1.4);
      items[i].style.opacity = o.toFixed(3);
      items[i].style.transform = items[i].dataset.base + ' translateX(' + (delta < STEP ? (1 - delta / STEP) * 22 : 0).toFixed(1) + 'px)';
      items[i].style.pointerEvents = o < 0.15 ? 'none' : '';
    }
    setWork(clamp(Math.round(rot / STEP), 0, N - 1));
  }

  /* ---------------- Toolkit band ---------------- */
  var bandRows = $$('.band__row').map(function (row) {
    return { el: row.firstElementChild, dir: parseFloat(row.getAttribute('data-dir')), half: 1 };
  });
  var bandT = 0, vel = 0, prevY = window.scrollY;
  function layoutBand() { bandRows.forEach(function (b) { b.half = b.el.scrollWidth / 2 || 1; }); }
  function updateBand(y, dt) {
    vel = lerp(vel, y - prevY, 0.12); prevY = y;
    bandT += dt * 55 + Math.abs(vel) * 1.4;
    var skew = clamp(vel * 0.12, -9, 9);
    bandRows.forEach(function (b) {
      var pos = bandT % b.half;
      var x = b.dir < 0 ? -pos : -b.half + pos;
      b.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + (-skew * b.dir).toFixed(2) + 'deg)';
    });
  }

  /* ---------------- Main loop ---------------- */
  var progressBar = $('#progress');
  function layout() { vw = window.innerWidth; vh = window.innerHeight; layoutHx(); layoutWorks(); layoutBand(); activeNav = -1; }
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();

  var lastT = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (lenis) lenis.raf(now);
    var y = window.scrollY;
    progressBar.style.transform = 'scaleX(' + (y / Math.max(1, docEl.scrollHeight - vh)).toFixed(4) + ')';
    updateNav(y); updateHero(y); updateExpand(); updateHx(); updateWorks();
    if (!reduced) updateBand(y, dt);
    for (var i = 0; i < frames.length; i++) frames[i](now, dt, y);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------------- Roles ticker, clock ---------------- */
  var roles = $$('#roles li'), roleI = 0;
  if (roles.length && !reduced) setInterval(function () {
    roles[roleI].classList.remove('on'); roleI = (roleI + 1) % roles.length; roles[roleI].classList.add('on');
  }, 1900);
  var clock = $('#clock');
  function tickClock() {
    try { clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date()); } catch (e) {}
  }
  if (clock) { tickClock(); setInterval(tickClock, 20000); }
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* ---------------- Cursor, magnets, tilt ---------------- */
  if (fine && !reduced) {
    var cursor = $('.cursor'), clabel = $('.cursor__label'), cx = vw / 2, cy = vh / 2;
    window.addEventListener('pointermove', function () { cursor.classList.add('is-on'); }, { passive: true });
    onFrame(function () {
      cx = lerp(cx, mouse.cx, 0.22); cy = lerp(cy, mouse.cy, 0.22);
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('a, button') : null;
      var lab = t && t.getAttribute('data-cursor');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-link', !!t && !lab);
      if (lab) clabel.textContent = lab;
    });
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transition = 'transform .15s ease-out, background .3s, color .3s';
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), background .3s, color .3s';
        el.style.transform = '';
      });
    });
    $$('[data-tilt]').forEach(function (el) {
      var inner = el.firstElementChild;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        inner.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2) + 'deg');
        inner.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - 0.5) * 10).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { inner.style.setProperty('--ry', '0deg'); inner.style.setProperty('--rx', '0deg'); });
    });
  }

  /* ---------------- Hero: spider webs that stretch toward the cursor ---------------- */
  (function webs() {
    var cv = $('#web'); if (!cv) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, nets = [];
    function makeNet(cx, cy, R, a0, a1, spokes, rings) {
      var net = { cx: cx, cy: cy, spokes: spokes, rings: rings, nodes: [] };
      for (var s = 0; s < spokes; s++) {
        var a = a0 + (a1 - a0) * (s / (spokes - 1));
        for (var r = 1; r <= rings; r++) {
          var rr = R * Math.pow(r / rings, 1.15) * (0.94 + 0.12 * Math.sin(s * 3.7 + r));
          var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          net.nodes.push({ rx: x, ry: y, x: x, y: y, vx: 0, vy: 0 });
        }
      }
      return net;
    }
    function build() {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
      var D = Math.max(W, H);
      nets = [
        makeNet(W * 0.97, -H * 0.06, D * 0.98, Math.PI * 0.42, Math.PI * 1.08, 17, 15),
        makeNet(W * 0.01, -H * 0.02, Math.min(W, H) * 0.55, -Math.PI * 0.02, Math.PI * 0.55, 10, 9)
      ];
    }
    window.addEventListener('resize', build); build();
    var drawnStatic = false;
    onFrame(function (now, dt, y) {
      if (y > vh) return;
      if (reduced && drawnStatic) return;
      var rect = cv.getBoundingClientRect(), mx = mouse.cx - rect.left, my = mouse.cy - rect.top, PULL = 170;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      nets.forEach(function (net) {
        var n = net.nodes, k, i;
        if (!reduced) for (i = 0; i < n.length; i++) {
          var p = n[i], dx = mx - p.x, dy = my - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < PULL && d > 0.1) { var f = (1 - d / PULL) * 1.6; p.vx += dx / d * f; p.vy += dy / d * f; }
          p.vx += (p.rx - p.x) * 0.05; p.vy += (p.ry - p.y) * 0.05;
          p.vx *= 0.84; p.vy *= 0.84; p.x += p.vx; p.y += p.vy;
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.11)';
        ctx.beginPath();
        for (var s = 0; s < net.spokes; s++) {          // spokes
          ctx.moveTo(net.cx, net.cy);
          for (k = 0; k < net.rings; k++) { var q = n[s * net.rings + k]; ctx.lineTo(q.x, q.y); }
        }
        for (k = 0; k < net.rings; k++) {              // sagging capture rings
          for (s = 0; s < net.spokes - 1; s++) {
            var a = n[s * net.rings + k], b = n[(s + 1) * net.rings + k];
            var mxp = (a.x + b.x) / 2, myp = (a.y + b.y) / 2;
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(mxp + (net.cx - mxp) * 0.07, myp + (net.cy - myp) * 0.07, b.x, b.y);
          }
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,53,80,0.9)';          // stretched nodes glow red
        for (i = 0; i < n.length; i++) {
          var o = n[i], st = Math.abs(o.x - o.rx) + Math.abs(o.y - o.ry);
          if (st > 3) { ctx.globalAlpha = Math.min(1, st / 30); ctx.beginPath(); ctx.arc(o.x, o.y, 1.6, 0, 6.2832); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
      });
      drawnStatic = true;
    });
  })();

  /* ---------------- Thwip: click anywhere to shoot a web ---------------- */
  (function thwip() {
    var cv = $('#thwip'); if (!cv || reduced) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), shots = [], dirty = false;
    function size() { cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr; }
    window.addEventListener('resize', size); size();
    window.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest('a, button, input, textarea'))) return;
      var ax = clamp(e.clientX + (Math.random() - 0.5) * vw * 0.5, 0, vw);
      shots.push({ x: e.clientX, y: e.clientY, ax: ax, ay: -10, t0: performance.now() });
      if (shots.length > 6) shots.shift();
    });
    onFrame(function (now) {
      if (!shots.length) { if (dirty) { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; } return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      shots = shots.filter(function (s) { return now - s.t0 < 1100; });
      shots.forEach(function (s) {
        var t = now - s.t0, ext = clamp(t / 110, 0, 1), fade = 1 - clamp((t - 450) / 650, 0, 1);
        var ex = lerp(s.ax, s.x, ext), ey = lerp(s.ay, s.y, ext);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(ex, ey); ctx.stroke();
        if (ext >= 1) {                                // splat where it sticks
          var g = clamp((t - 110) / 140, 0, 1), L = 22 * g;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + 0.3; ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L); }
          [0.45, 0.8].forEach(function (f) {
            for (var j = 0; j <= 8; j++) { var b = j * Math.PI / 4 + 0.3, px = s.x + Math.cos(b) * L * f, py = s.y + Math.sin(b) * L * f; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          });
          ctx.stroke();
          ctx.fillStyle = '#e8132b'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6 * g, 0, 6.2832); ctx.fill();
        }
      });
      ctx.globalAlpha = 1; dirty = true;
    });
  })();

  /* ---------------- WebGL helpers ---------------- */
  var NOISE = [
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}'
  ].join('\n');
  function program(gl, fsrc) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}');
    var fs = sh(gl.FRAGMENT_SHADER, 'precision highp float;varying vec2 v;\n' + NOISE + '\n' + fsrc);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return pr;
  }
  function visible(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.width > 0; }

  /* ---------------- Swirl: monochrome brush-stroke field ---------------- */
  function swirl(canvas, seed) {
    if (!canvas) return;
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) return;
    var pr = program(gl, [
      'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uSeed;',
      'void main(){',
      ' vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
      ' p+=(uMouse-.5)*vec2(.18,-.18);',
      ' float t=uTime*.05+uSeed;',
      ' vec2 q=vec2(fbm(p*1.1+vec2(0.,t)),fbm(p*1.1+vec2(5.2,-t)));',
      ' vec2 r=vec2(fbm(p*1.1+3.4*q+vec2(1.7,9.2)+t*1.3),fbm(p*1.1+3.4*q+vec2(8.3,2.8)-t));',
      ' float f=fbm(p*1.1+3.8*r);',
      ' float strokes=.5+.5*sin(f*74.+r.x*34.+r.y*21.);',
      ' strokes=pow(strokes,2.6);',
      ' float body=smoothstep(.22,.82,f);',
      ' float lum=.04+strokes*mix(.13,.72,body)+body*.09;',
      ' lum+=pow(smoothstep(.62,1.,f*length(r)*1.5),2.)*.35;',
      ' lum*=1.-.5*dot(v-.5,v-.5)*2.;',
      ' lum+=(hash(gl_FragCoord.xy+fract(uTime)*71.)-.5)*.04;',
      ' vec3 col=mix(vec3(.02,.01,.015),vec3(.91,.07,.17),clamp(lum*1.45,0.,1.));',
      ' col+=vec3(1.,.86,.86)*pow(clamp((lum-.5)*2.,0.,1.),2.)*.55;',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n'));
    if (!pr) return;
    var uRes = gl.getUniformLocation(pr, 'uRes'), uTime = gl.getUniformLocation(pr, 'uTime'),
      uMouse = gl.getUniformLocation(pr, 'uMouse'), uSeed = gl.getUniformLocation(pr, 'uSeed');
    var mx = 0.5, my = 0.5, drawn = false;
    onFrame(function (now) {
      if (!visible(canvas)) return;
      if (reduced && drawn) return;
      var sc = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
      var w = Math.max(2, Math.floor(vw * sc)), h = Math.max(2, Math.floor(vh * sc));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      mx = lerp(mx, mouse.x, 0.04); my = lerp(my, mouse.y, 0.04);
      gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, now / 1000); gl.uniform2f(uMouse, mx, my); gl.uniform1f(uSeed, seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawn = true;
    });
  }
  swirl($('#swirlAbout'), 3.0);
  swirl($('#swirlContact'), 11.0);

  /* ---------------- Hero portrait: liquid ripple ---------------- */
  (function portrait() {
    var wrap = $('.hero__portrait'), img = $('#portraitImg'), canvas = $('#portraitGl');
    if (!wrap || !img || !canvas || reduced) return;
    function init() {
      var gl = null;
      try { gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true }); } catch (e) {}
      if (!gl) return;
      var pr = program(gl, [
        'uniform sampler2D uTex;uniform vec2 uMouse;uniform float uTime,uHover,uReveal,uCrop,uAsp;',
        'void main(){',
        ' vec2 uv=v;',
        ' vec2 a=vec2(1.,uAsp);',
        ' float d=distance(uv*a,uMouse*a);',
        // Spider-Verse glitch: slice offsets + red/cyan split, on hover and in short random bursts,
        // stepped at 12fps ("on twos"); halftone dots tint the shadows red.
        ' float ft=floor(uTime*12.)/12.;',
        ' float burst=step(.82,hash(vec2(floor(uTime*1.4),3.1)))*.7;',
        ' float g=max(smoothstep(.45,0.,d)*uHover,burst);',
        ' float band=floor(uv.y*30.);',
        ' float rn=hash(vec2(band,ft));',
        ' uv.x+=(rn-.5)*.07*g*step(.6,rn);',
        ' float edge=1.-uv.y+(noise(vec2(uv.x*9.,uTime*.4))-.5)*.25;',
        ' float show=1.-smoothstep(uReveal-.18,uReveal,edge);',
        ' uv.y+=(1.-show)*.03;',
        ' vec2 tc=vec2(uv.x,uv.y*uCrop);',
        ' vec2 off=vec2(.003+.016*g,0.);',
        ' vec4 c=texture2D(uTex,tc);',
        ' vec4 cr=texture2D(uTex,tc+off);',
        ' vec4 cc=texture2D(uTex,tc-off);',
        ' vec3 col=vec3(cr.r,c.g,c.b);',
        ' col=mix(col,vec3(cr.r,cc.g,cc.b),g);',
        ' float lum=dot(c.rgb,vec3(.333));',
        ' vec2 hp=fract(gl_FragCoord.xy/5.)-.5;',
        ' float ht=step(length(hp),(1.-lum)*.5);',
        ' col=mix(col,col*vec3(1.,.3,.35),ht*.35*(1.-lum));',
        ' float al=max(c.a,max(cr.a,cc.a)*g);',
        ' float inb=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);',
        ' gl_FragColor=vec4(col,al)*show*inb;', // texture is premultiplied already
        '}'
      ].join('\n'));
      if (!pr) return;
      try {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); // throws on file:// (cross-origin)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } catch (e) { return; } // plain <img> stays
      var U = {}; ['uMouse', 'uTime', 'uHover', 'uReveal', 'uCrop', 'uAsp'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
      gl.clearColor(0, 0, 0, 0);
      wrap.classList.add('gl');
      var mx = 0.5, my = 0.3, hover = 0, reveal = skipIntro ? 1.4 : 0, crop = 1;
      onFrame(function (now, dt, y) {
        if (y > vh) return;
        var r = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
        // show the top slice of the photo that fits the box (same as object-fit: cover, top-aligned)
        crop = clamp((r.height / r.width) / (img.naturalHeight / img.naturalWidth), 0.1, 1);
        var tx = (mouse.cx - r.left) / r.width, ty = (mouse.cy - r.top) / r.height;
        var inside = tx > -0.25 && tx < 1.25 && ty > -0.2 && ty < 1.1;
        mx = lerp(mx, tx, 0.14); my = lerp(my, ty, 0.14);
        hover = lerp(hover, inside ? 1 : 0, 0.07);
        if (loaded) reveal = Math.min(1.4, reveal + dt * 0.95);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.uMouse, mx, my); gl.uniform1f(U.uTime, now / 1000); gl.uniform1f(U.uHover, hover);
        gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uCrop, crop); gl.uniform1f(U.uAsp, r.height / r.width);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
    }
    if (img.complete && img.naturalWidth) init(); else img.addEventListener('load', init);
  })();
})();
