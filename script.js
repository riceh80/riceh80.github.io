(() => {
  'use strict';

  /* All content comes from data.js (window.SITE). This file only draws it. */
  const SITE = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const isHome = body.classList.contains('page-home');
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const params = new URLSearchParams(location.search);

  const photoOf = (id) => `assets/people/${id}/photo.jpg`;
  const imageOf = (id, key) => `assets/people/${id}/work/${key}.jpg`;

  let pid = null;      // current person id
  let P = null;        // current person
  let side = null;     // current side key

  // Load each image once; resolves to the URL if it exists, or null.
  const probes = new Map();
  function probe(src) {
    if (!probes.has(src)) {
      probes.set(src, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => resolve(null);
        img.src = src;
      }));
    }
    return probes.get(src);
  }

  /* ============================ DOODLES ============================
     Hand-drawn sketches on each card until a real picture is added.
     The outlines "boil" (wobble frame to frame) like hand animation,
     using an SVG noise filter, and small parts move in held frames.   */

  // Shared SVG filter + hatch pattern, added once per page.
  (function addDefs() {
    const anim = reduced ? '' :
      '<animate attributeName="seed" values="2;9;14;5" dur="0.5s" calcMode="discrete" repeatCount="indefinite"/>';
    document.body.insertAdjacentHTML('afterbegin',
      `<svg class="fx-defs" aria-hidden="true" width="0" height="0" focusable="false">
        <filter id="boil" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="2" result="n">${anim}</feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#f4ecdc" stroke-width="1.6"/>
        </pattern>
      </svg>`);
  })();

  const arrow = (d, head) => `<path class="ink thin draw" d="${d}"/><path class="ink thin draw" d="${head}"/>`;
  const note = (text, x, y, size = 24, extra = '', cls = '') => (!text ? '' :
    `<text class="hand ${cls}" x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(text)}</text>`);

  const DOODLES = {
    crate(it) {
      return `
        <g class="jig-slow">
          <path class="ink draw" d="M118 130 H272 V254 H118 Z"/>
          <path class="ink draw" d="M118 130 L156 98 H310 L272 130"/>
          <path class="ink draw" d="M272 254 L310 222 V98"/>
          <path class="ink thin draw" d="M118 171 H272 M118 212 H272 M291 114 V238 M175 98 L137 130"/>
          <g transform="rotate(-9 196 194)">
            <rect x="138" y="163" width="116" height="62" rx="5" style="fill:var(--c)"/>
            <rect class="ink red draw" x="138" y="163" width="116" height="62" rx="5"/>
            ${note('TOTALLY', 196, 191, 26, 'text-anchor="middle"', 'red-fill')}
            ${note('LEGAL', 196, 216, 26, 'text-anchor="middle"', 'red-fill')}
          </g>
        </g>
        <g class="fa"><path class="ink thin" d="M98 150 q-10 12 0 24 M86 142 q-15 20 0 40"/><path class="ink thin" d="M326 118 q10 12 0 24 M338 110 q15 20 0 40"/></g>
        ${note(it.note || '', 10, 52)}
        ${arrow('M112 62 C140 66 160 80 170 100', 'M160 96 L170 101 L171 89')}`;
    },
    dungeon(it) {
      return `
        <path d="M160 262 V160 A40 40 0 0 1 240 160 V262 Z" fill="rgba(0,0,0,.35)"/>
        <path class="ink draw" d="M50 262 H350"/>
        <path class="ink draw" d="M128 262 V152 A72 72 0 0 1 272 152 V262"/>
        <path class="ink draw" d="M160 262 V160 A40 40 0 0 1 240 160 V262"/>
        <path class="ink thin draw" d="M128 192 H160 M128 228 H160 M240 192 H272 M240 228 H272 M142 118 L163 136 M258 118 L237 136 M200 80 V108"/>
        <g class="blink"><ellipse cx="187" cy="216" rx="6" ry="4" fill="#ff5a5f"/><ellipse cx="213" cy="216" rx="6" ry="4" fill="#ff5a5f"/></g>
        <path class="ink draw" d="M314 240 L320 200"/><path class="ink thin draw" d="M306 200 H332"/>
        <path class="ink flame fa" fill="#ffb347" d="M319 196 C304 184 309 168 318 156 C322 170 336 178 319 196 Z"/>
        <path class="ink flame fb" fill="#ffb347" d="M319 196 C306 186 306 172 312 160 C324 170 332 182 319 196 Z"/>
        ${note(it.note || '', 14, 50)}
        ${arrow('M90 60 C130 70 168 110 182 150', 'M172 146 L182 151 L184 139')}`;
    },
    d20(it) {
      // front view of a twenty-sided die: hexagon outline, centre face, edges to the rim
      const H = { t: [200, 52], tr: [284, 101], br: [284, 199], b: [200, 248], bl: [116, 199], tl: [116, 101] };
      const A = [200, 90]; const B = [256, 186]; const C = [144, 186];
      const P = (p) => p.join(' ');
      return `
        <g class="d20-die">
          <path class="ink" fill="url(#hatch)" fill-opacity=".45" d="M${P(B)} L${P(H.br)} L${P(H.b)} Z"/>
          <path class="ink" fill="url(#hatch)" fill-opacity=".45" d="M${P(B)} L${P(H.tr)} L${P(H.br)} Z"/>
          <path class="ink draw" d="M${P(H.t)} L${P(H.tr)} L${P(H.br)} L${P(H.b)} L${P(H.bl)} L${P(H.tl)} Z"/>
          <path class="ink draw" d="M${P(A)} L${P(B)} L${P(C)} Z"/>
          <path class="ink thin draw" d="M${P(A)} L${P(H.t)} M${P(A)} L${P(H.tl)} M${P(A)} L${P(H.tr)} M${P(B)} L${P(H.tr)} M${P(B)} L${P(H.br)} M${P(B)} L${P(H.b)} M${P(C)} L${P(H.bl)} M${P(C)} L${P(H.tl)} M${P(C)} L${P(H.b)}"/>
          <rect x="110" y="48" width="180" height="204" fill="transparent"/>
          ${note('20', 194.5, 167, 46, 'text-anchor="middle"', 'd20-num')}
        </g>
        ${note(it.note || '', 10, 50)}
        ${arrow('M64 60 C84 70 98 84 108 104', 'M98 100 L108 105 L110 94')}
        ${note('rolled a 20', 322, 286, 30, 'text-anchor="middle"', 'red-fill d20-result')}`;
    },
    browser(it) {
      return `
        <rect class="ink draw" x="96" y="64" width="232" height="180" rx="10"/>
        <path class="ink thin draw" d="M96 92 H328"/>
        <circle class="ink thin" cx="112" cy="78" r="4"/><circle class="ink thin" cx="126" cy="78" r="4"/><circle class="ink thin" cx="140" cy="78" r="4"/>
        <g class="beat"><path class="ink" fill="#ff5a5f" d="M212 192 C160 160 158 124 184 118 C200 114 208 126 212 134 C216 126 224 114 240 118 C266 124 264 160 212 192 Z"/></g>
        <rect class="ink thin draw" x="160" y="206" width="44" height="22" rx="11" fill="url(#hatch)"/>
        <rect class="ink thin draw" x="220" y="206" width="44" height="22" rx="11"/>
        <g class="hop"><path class="ink thin" fill="#f4ecdc" d="M0 0 L0 22 L6 16 L11 27 L16 25 L11 14 L19 14 Z"/></g>
        ${note(it.note || '', 18, 46)}
        ${arrow('M70 54 C84 58 92 66 96 80', 'M88 74 L96 81 L99 71')}`;
    },
    cards(it) {
      return `
        <g transform="rotate(-15 200 300)"><rect class="ink draw" x="150" y="78" width="100" height="142" rx="10" style="fill:var(--c)"/>${note('ATK 6', 160, 104, 20)}</g>
        <g transform="rotate(15 200 300)"><rect class="ink draw" x="150" y="78" width="100" height="142" rx="10" style="fill:var(--c)"/>${note('DEF 3', 192, 104, 20)}</g>
        <g class="bob">
          <rect class="ink draw" x="146" y="60" width="108" height="152" rx="10" style="fill:var(--c)"/>
          ${note('HP 12', 158, 86, 20)}
          <path class="ink" fill="#7fe0c4" d="M170 182 C170 152 186 134 200 134 C214 134 230 152 230 182 Z"/>
          <g class="blink"><circle cx="192" cy="162" r="3.5" fill="#111"/><circle cx="208" cy="162" r="3.5" fill="#111"/></g>
          ${note('enemy_01', 200, 202, 17, 'text-anchor="middle"')}
        </g>
        ${note(it.note || '', 4, 40)}
        ${arrow('M86 52 C112 60 130 74 142 94', 'M132 90 L142 95 L143 83')}`;
    },
    wireframe(it) {
      return `
        <rect class="ink draw" x="78" y="58" width="256" height="184" rx="10"/>
        <path class="ink thin draw" d="M78 84 H334"/>
        <circle class="ink thin" cx="94" cy="71" r="4"/><circle class="ink thin" cx="108" cy="71" r="4"/><circle class="ink thin" cx="122" cy="71" r="4"/>
        <g class="fa slow">
          <rect class="ink thin" x="96" y="100" width="220" height="56" rx="4" fill="url(#hatch)"/>
          <rect class="ink thin" x="96" y="168" width="66" height="56" rx="4"/><rect class="ink thin" x="173" y="168" width="66" height="56" rx="4"/><rect class="ink thin" x="250" y="168" width="66" height="56" rx="4"/>
        </g>
        <g class="fb slow">
          <rect class="ink thin" x="96" y="100" width="72" height="124" rx="4" fill="url(#hatch)"/>
          <rect class="ink thin" x="180" y="100" width="136" height="36" rx="4"/><rect class="ink thin" x="180" y="144" width="136" height="36" rx="4"/><rect class="ink thin" x="180" y="188" width="136" height="36" rx="4"/>
        </g>
        <g class="hop2"><path class="ink thin" fill="#f4ecdc" d="M0 0 L0 22 L6 16 L11 27 L16 25 L11 14 L19 14 Z"/></g>
        ${note(it.note || '', 10, 42)}
        ${arrow('M60 50 C70 56 76 64 80 74', 'M72 70 L80 75 L82 65')}`;
    },
    checklist(it) {
      const words = (it.words || []).slice(0, 8);
      const two = words.length > 4;
      const rows = words.map((w, i) => {
        const col = two ? Math.floor(i / 4) : 0;
        const row = two ? i % 4 : i;
        const x = (two ? 40 : 110) + col * 180;
        const y = 92 + row * 50;
        return `<rect class="ink thin" x="${x}" y="${y - 20}" width="24" height="24" rx="3"/>` +
          `<path class="ink check" style="--k:${i}" d="M${x + 4} ${y - 8} l7 8 l15 -20"/>` +
          note(w, x + 36, y, 28);
      }).join('');
      return `<g style="--n:${words.length}">${rows}</g>${note(it.note || '', 200, 290, 22, 'text-anchor="middle"')}`;
    },
    lobby(it) {
      const head = (x, y, i) => `<circle class="ink thin" cx="${x}" cy="${y}" r="16"/><circle class="ready" style="--i:${i}" cx="${x}" cy="${y}" r="16" fill="url(#hatch)"/>`;
      const top = Array.from({ length: 5 }, (_, i) => head(112 + i * 44, 112, i)).join('');
      const bot = Array.from({ length: 5 }, (_, i) => head(112 + i * 44, 206, i + 5)).join('');
      return `${top}${note('vs', 200, 168, 30, 'text-anchor="middle"')}${bot}
        <g class="gg">${note('GG!', 330, 170, 40, '', 'red-fill')}</g>
        ${note(it.note || '', 14, 52)}`;
    },
    bracket(it) {
      const ys = Array.from({ length: 8 }, (_, i) => 44 + i * 30);
      let d = '';
      let col = ys;
      let x = 70;
      while (col.length > 1) {
        const next = [];
        for (let i = 0; i < col.length; i += 2) {
          const a = col[i]; const b = col[i + 1]; const m = (a + b) / 2;
          if (x === 70) d += `M${x} ${a}H${x + 50}M${x} ${b}H${x + 50}`;
          d += `M${x + 50} ${a}V${b}M${x + 50} ${m}H${x + 100}`;
          next.push(m);
        }
        col = next;
        x += 50;
      }
      return `<path class="ink thin bracket-line" d="${d}" pathLength="1"/>
        <g class="trophy"><path class="ink" fill="url(#hatch)" d="M302 130 H342 V146 C342 166 332 174 322 174 C312 174 302 166 302 146 Z"/>
        <path class="ink thin" d="M302 138 C290 138 290 156 304 158 M342 138 C354 138 354 156 340 158 M322 174 V190 M308 196 H336"/></g>
        ${note(it.note || '', 220, 44)}`;
    },
    chat(it) {
      const bubble = (x, y, w, i, flip) => {
        const tail = flip ? `M${x + w - 30} ${y + 46} l14 14 v-14` : `M${x + 30} ${y + 46} l-14 14 v-14`;
        return `<g class="pop" style="--i:${i}"><rect class="ink" x="${x}" y="${y}" width="${w}" height="46" rx="14" style="fill:var(--c)"/>` +
          `<path class="ink" d="${tail}"/><path class="ink thin" d="M${x + 16} ${y + 18} h${w * 0.5} M${x + 16} ${y + 31} h${w * 0.72}"/></g>`;
      };
      return `${bubble(100, 60, 170, 0, false)}${bubble(150, 132, 160, 1, true)}${bubble(90, 204, 140, 2, false)}
        ${note(it.note || '', 14, 40)}`;
    },
  };

  function doodleSVG(it) {
    const fn = DOODLES[it.doodle];
    if (!fn) return '';
    return `<svg class="doodle doodle-${it.doodle}" viewBox="0 0 400 300" aria-hidden="true"><g filter="url(#boil)">${fn(it)}</g></svg>`;
  }

  // Fit a sketch inside its box: measure everything drawn (notes included), then
  // set the viewBox to that area plus a margin. The CSS box keeps it clear of the
  // card's edges, label and title, so nothing touches or runs off the card.
  function fitDoodle(svg) {
    if (!svg.isConnected || !svg.getClientRects().length) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    let x1 = Infinity; let y1 = Infinity; let x2 = -Infinity; let y2 = -Infinity;
    svg.querySelectorAll('path, rect, circle, ellipse, polygon, line, text').forEach((el) => {
      if (el.closest('.hop, .hop2') || el.getAttribute('fill') === 'transparent') return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      [[r.left, r.top], [r.right, r.bottom]].forEach(([x, y]) => {
        const pt = new DOMPoint(x, y).matrixTransform(inv);
        x1 = Math.min(x1, pt.x); y1 = Math.min(y1, pt.y); x2 = Math.max(x2, pt.x); y2 = Math.max(y2, pt.y);
      });
    });
    if (!isFinite(x1)) return;
    const pad = 12;
    svg.setAttribute('viewBox', `${(x1 - pad).toFixed(1)} ${(y1 - pad).toFixed(1)} ${(x2 - x1 + pad * 2).toFixed(1)} ${(y2 - y1 + pad * 2).toFixed(1)}`);
    svg.dataset.fitted = '1';
  }
  function fitDoodles(root = document) {
    $$('svg.doodle', root).forEach((svg) => {
      svg.setAttribute('viewBox', '0 0 400 300');   // measure from the original drawing space
      fitDoodle(svg);
    });
  }

  // draw the lines on when a card scrolls into view
  const drawer = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('drawn'); drawer.unobserve(en.target); }
  }), { threshold: 0.25 });

  function mediaEl(key, { video = false } = {}) {
    const it = P.items[key];
    const el = document.createElement('div');
    el.className = 'media';
    el.style.setProperty('--c', it.color || '#222');
    el.innerHTML = `${doodleSVG(it)}<div class="media-card"><p class="mc-meta">${esc(it.meta)}</p><p class="mc-title">${esc(it.title)}</p></div>`;
    $$('.draw, .check', el).forEach((p, i) => {
      p.setAttribute('pathLength', '1');
      if (p.classList.contains('draw')) p.style.transitionDelay = `${(i * 0.08).toFixed(2)}s`;
    });
    if (reduced) el.classList.add('drawn'); else drawer.observe(el);
    if (it.doodle === 'd20') {
      const die = $('.d20-die', el);
      die.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); rollD20(el); });
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') rollD20(el); });
    }
    probe(imageOf(pid, key)).then((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
      img.alt = '';
      img.className = 'media-img';
      el.insertBefore(img, $('.media-card', el));
      el.classList.add('has-image');
    });
    const vsrc = P.videos && P.videos[key];
    if (video && vsrc) {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
      v.src = vsrc;
      el.insertBefore(v, $('.media-card', el));
    }
    return el;
  }

  // roll the d20: spins in held frames while the number flickers, then lands on a real random roll
  function rollD20(media) {
    const die = $('.d20-die', media);
    if (!die || die.dataset.rolling) return;
    const num = $('.d20-num', die);
    const res = $('.d20-result', media);
    const final = 1 + Math.floor(Math.random() * 20);
    const land = () => {
      num.textContent = final;
      res.textContent = final === 20 ? 'NAT 20!' : final === 1 ? 'crit fail…' : `rolled a ${final}`;
      res.classList.add('show');
    };
    res.classList.remove('show');
    if (reduced) { land(); return; }
    die.dataset.rolling = '1';
    die.classList.remove('rolling');
    void die.getBoundingClientRect();
    die.classList.add('rolling');
    let frame = 0;
    const iv = setInterval(() => {
      num.textContent = 1 + Math.floor(Math.random() * 20);
      if (++frame >= 9) {
        clearInterval(iv);
        die.classList.remove('rolling');
        delete die.dataset.rolling;
        land();
      }
    }, 80);
  }

  function playMedia(el, on) {
    const v = el && el.querySelector('video');
    if (!v) return;
    if (on) v.play().then(() => el.classList.add('playing')).catch(() => {});
    else { v.pause(); el.classList.remove('playing'); }
  }

  // Apple TV–style tilt on hover
  function makeTilt(wrapper, strength = 7) {
    wrapper.classList.add('tilt');
    if (!finePointer || reduced) return;
    wrapper.addEventListener('pointermove', (e) => {
      const r = wrapper.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      wrapper.classList.add('hovering');
      wrapper.style.setProperty('--ry', `${((x - 0.5) * strength).toFixed(2)}deg`);
      wrapper.style.setProperty('--rx', `${((0.5 - y) * strength).toFixed(2)}deg`);
    });
    wrapper.addEventListener('pointerleave', () => {
      wrapper.classList.remove('hovering');
      wrapper.style.setProperty('--rx', '0deg');
      wrapper.style.setProperty('--ry', '0deg');
    });
  }

  // A project's repo link. Public repos go to GitHub; private ones become an
  // "ask me" email instead (visitors would only get a 404 on GitHub).
  function repoLink(key) {
    const url = P.repos && P.repos[key];
    if (!url) return null;
    if ((P.privateRepos || []).includes(key)) {
      if (!P.email) return null;
      const title = P.items[key].title;
      const slug = url.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
      const subject = `Repo access request: ${title}`;
      const body = [
        `Hi ${P.name},`,
        '',
        `I'd like access to the private GitHub repo for ${title} (${slug}).`,
        '',
        'My GitHub username: ',
        'Why I would like access: ',
        '',
        'Thanks,',
        '[Your name]',
      ].join('\n');
      return {
        href: `mailto:${P.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        short: 'Private repo · ask me', long: 'Private repo · ask for access', external: false,
      };
    }
    return { href: url, short: 'GitHub', long: 'View on GitHub', external: true };
  }

  // a "Play it / Visit" pill pinned to the corner of a card, for things people can open and try
  function tryPill(url, label) {
    return `<a class="try-pill" href="${esc(url)}" target="_blank" rel="noopener">${esc(label || 'Try it')}<span aria-hidden="true"> ↗</span></a>`;
  }

  /* ============================ AVATARS ============================ */
  function fillAvatar(el, id) {
    if (!el) return;
    const person = SITE.people[id];
    el.style.setProperty('--side', person.color || '#e50914');
    el.innerHTML = `<span class="mono" aria-hidden="true">${esc(person.initials || person.name.slice(0, 1))}</span>`;
    probe(photoOf(id)).then((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
      img.alt = '';
      el.appendChild(img);
    });
  }

  // The same link block under every card (highlights and All projects):
  // "Learn more", then the repo link (GitHub, or "Private repo · ask me").
  // Live sites ("Play it" / "Visit …") live in the pill on the card itself.
  function itemLinks(key) {
    const r = repoLink(key);
    const repo = r
      ? `<a class="link${r.external ? '' : ' link-private'}" href="${esc(r.href)}"${r.external ? ' target="_blank" rel="noopener"' : ''}>${esc(r.short)}</a>`
      : '';
    return `<p class="item-links"><button type="button" class="link item-more">Learn more</button>${repo}</p>`;
  }

  // Line the gallery up with the page's text edge (100vw would count the scrollbar).
  function setGutter() {
    const w = document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--gutter', `${Math.max(22, (w - 1080) / 2)}px`);
  }

  function setupHeroPhoto() {
    const fig = $('#heroPhoto');
    if (!fig) return;
    fig.hidden = true;
    $('#heroGrid').classList.remove('with-photo');
    probe(photoOf(pid)).then((src) => {
      if (!src) return;
      fig.innerHTML = `<img src="${src}" alt="${esc(P.fullName)}">`;
      fig.hidden = false;
      $('#heroGrid').classList.add('with-photo');
    });
  }

  /* ======================== PERSON (shared) ======================== */
  function usePerson(id, remember = true) {
    pid = SITE.people[id] ? id : SITE.order[0];
    P = SITE.people[pid];
    if (remember) store.set('person', pid);
    if (!isHome) document.title = `About — ${P.fullName}`;
    $$('[data-name]').forEach((el) => { el.textContent = P.fullName; });
    fillAvatar($('#chipAvatar'), pid);
    $('#chipLabel').textContent = P.name;
    $$('[data-about-link]').forEach((a) => { a.href = `about.html?p=${pid}`; });
    $$('[data-home-link]').forEach((a) => { a.href = `index.html?p=${pid}${a.dataset.homeLink && a.dataset.homeLink.startsWith('#') ? a.dataset.homeLink : ''}`; });
    $('#copyright').textContent = `Copyright © ${new Date().getFullYear()} ${P.fullName}. All rights reserved.`;
    renderContact();
    setupHeroPhoto();
  }

  function renderContact() {
    const email = $('#contactEmail');
    email.textContent = P.email || '';
    email.href = P.email ? `mailto:${P.email}` : '#';
    email.hidden = !P.email;
    const links = [];
    if (P.linkedin) links.push(`<a class="btn btn-light" href="${esc(P.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
    if (P.github) links.push(`<a class="btn btn-ghost-dark" href="${esc(P.github)}" target="_blank" rel="noopener">GitHub</a>`);
    if (P.resume) links.push(`<a class="btn btn-ghost-dark" href="${esc(P.resume)}" download>Download résumé</a>`);
    $('#contactLinks').innerHTML = links.join('');
  }

  /* ============================== HOME ============================== */
  const intro = $('#intro');
  const picker = $('#picker');
  const skipBtn = $('#skipIntro');
  const timers = {};
  const seq = [];
  const clearTimers = () => { Object.values(timers).forEach(clearTimeout); seq.forEach(clearTimeout); seq.length = 0; };

  function buildPicker() {
    const list = $('#people');
    list.innerHTML = SITE.order.map((id, i) =>
      `<li style="--i:${i}"><button class="person-btn" type="button" data-person="${esc(id)}"><span class="avatar"></span><span class="person-name">${esc(SITE.people[id].name)}</span></button></li>`
    ).join('');
    $$('.person-btn', list).forEach((b) => {
      fillAvatar($('.avatar', b), b.dataset.person);
      b.addEventListener('click', () => choosePerson(b));
    });
  }

  function playIntro() {
    clearTimers();
    store.set('stage', 'picking');
    document.title = SITE_TITLE;
    body.classList.add('intro-active');
    picker.hidden = true;
    picker.className = 'picker';
    intro.hidden = false;
    intro.classList.remove('done');
    skipBtn.classList.remove('show');
    const rig = $('#rig');
    const screen = $('#screenText');
    const word = 'Welcome';
    const type = (n) => { screen.innerHTML = `${esc(word.slice(0, n))}<tspan class="cursor">_</tspan>`; };
    rig.className = 'rig';
    rig.dataset.frame = '0';
    screen.textContent = '';
    void rig.offsetWidth;
    if (reduced) {
      rig.className = 'rig in';
      rig.dataset.frame = '3';
      type(word.length);
      timers.intro = setTimeout(() => endIntro(true), 700);
      return;
    }
    const at = (ms, fn) => seq.push(setTimeout(fn, ms));
    at(60, () => rig.classList.add('in'));
    at(500, () => skipBtn.classList.add('show'));
    // the lid opens in drawn frames: closed → tilted → nearly up → open (then a little settle)
    at(760, () => { rig.dataset.frame = '1'; });
    at(940, () => { rig.dataset.frame = '2'; });
    at(1120, () => { rig.dataset.frame = '3'; rig.classList.add('settle'); });
    // power on: light comes on, the screen flickers up like an old monitor
    at(1650, () => rig.classList.add('power'));
    at(2380, () => type(0));
    for (let i = 1; i <= word.length; i++) at(2600 + i * 115, () => type(i));
    // dive into the screen: the laptop falls away, "Welcome" keeps growing,
    // then hands over to the picker's "Welcome" at the same size and spot
    at(3550, () => { screen.textContent = word; });
    at(3750, () => {
      const tw = screen.getBoundingClientRect().width || 1;
      const z = Math.min(9, Math.max(2, (window.innerWidth * 0.6) / tw));
      rig.style.setProperty('--zoom', z.toFixed(2));
      rig.classList.add('zoom');
    });
    at(4900, () => endIntro(true));
  }

  function endIntro(withWelcome) {
    const st = $('#screenText');
    const match = withWelcome && $('#rig').classList.contains('zoom') && st.textContent ? st.getBoundingClientRect() : null;
    clearTimers();
    intro.classList.add('done');
    timers.hide = setTimeout(() => { intro.hidden = true; intro.classList.remove('play', 'done'); }, 520);
    openPicker(withWelcome, match);
  }

  function openPicker(withWelcome, match = null) {
    clearTimeout(timers.stage);
    store.set('stage', 'picking');
    document.title = SITE_TITLE;
    body.classList.add('intro-active');
    picker.hidden = false;
    picker.className = 'picker instant';
    $$('.person-btn', picker).forEach((b) => b.classList.remove('picked'));
    const w = $('#welcome');
    if (withWelcome && !reduced) {
      w.style.setProperty('--dy', '0px');
      w.style.setProperty('--ws', '1');
      const r = w.getBoundingClientRect();
      if (match && match.width) {
        // start exactly where the laptop's "Welcome" ended up
        w.style.setProperty('--ws', (match.width / r.width).toFixed(3));
        w.style.setProperty('--dy', `${Math.round((match.top + match.height / 2) - (r.top + r.height / 2))}px`);
        picker.classList.add('matched');
      } else {
        w.style.setProperty('--ws', '2');
        w.style.setProperty('--dy', `${Math.round(window.innerHeight / 2 - (r.top + r.height / 2))}px`);
      }
      void picker.offsetWidth;
      picker.classList.remove('instant');
      requestAnimationFrame(() => picker.classList.add('show'));
      timers.stage = setTimeout(() => picker.classList.add('stage2'), match ? 650 : 1600);
    } else {
      picker.classList.add('stage2');
      void picker.offsetWidth;
      requestAnimationFrame(() => {
        picker.classList.add('show');
        timers.stage = setTimeout(() => picker.classList.remove('instant'), 60);
      });
    }
  }

  function choosePerson(btn) {
    btn.classList.add('picked');
    picker.classList.add('leaving');
    renderPerson(btn.dataset.person);
    timers.leave = setTimeout(() => {
      picker.hidden = true;
      picker.className = 'picker';
      window.scrollTo({ top: 0, behavior: 'instant' });
      enterSite();
    }, 650);
  }

  // The tab says "Portsite" until someone picks a profile, then that person's name.
  const SITE_TITLE = 'Portsite';

  function enterSite() {
    store.set('stage', 'viewing');
    store.set('person', pid);
    document.title = P.fullName;
    body.classList.remove('intro-active');
    body.classList.add('site-ready');
    update();
    syncGalleryMedia();
  }

  function renderPerson(id, remember = true) {
    usePerson(id, remember);
    $('#heroResume').href = P.resume || '#';
    $('#heroResume').hidden = !P.resume;
    $('#teaserTitle').textContent = `More about ${P.name}.`;
    const order = (P.sideOrder || Object.keys(P.sides || {})).filter((k) => P.sides[k]);
    const tabs = order.map((k) => `<button type="button" data-side="${esc(k)}" aria-pressed="false">${esc(P.sides[k].label)}</button>`).join('');
    ['#heroTabs', '#hlTabs'].forEach((sel) => {
      const host = $(sel);
      host.innerHTML = tabs;
      host.hidden = order.length < 2;
      $$('button', host).forEach((b) => b.addEventListener('click', () => { if (b.dataset.side !== side) setSide(b.dataset.side); }));
    });
    buildLineup();
    const saved = store.get(`side:${pid}`);
    setSide(P.sides[saved] ? saved : order[0], { animate: false });
  }

  function setSide(key, { animate = true } = {}) {
    side = key;
    store.set(`side:${pid}`, key);
    const s = P.sides[key];
    $('#heroTitle').textContent = s.title;
    $('#heroSub').textContent = s.sub;
    if (animate) {
      const hc = $('#heroCopy');
      hc.classList.remove('swap');
      void hc.offsetWidth;
      hc.classList.add('swap');
    }
    $$('#heroTabs button, #hlTabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.side === key)));
    buildGallery(s.items);
  }

  /* ---------------------------- gallery ---------------------------- */
  const gal = { idx: 0, elapsed: 0, last: 0, playing: !reduced, inView: false, dur: 6500 };
  const slides = () => $$('#gallery .slide');

  function buildGallery(keys) {
    const track = $('#gallery');
    track.innerHTML = '';
    keys.filter((k) => P.items[k]).forEach((k) => {
      const it = P.items[k];
      const li = document.createElement('li');
      li.className = 'slide';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slide-media';
      btn.setAttribute('aria-label', `More about ${it.title}`);
      btn.appendChild(mediaEl(k, { video: true }));
      makeTilt(btn, 4);
      btn.addEventListener('click', () => openDetail(k));
      const cap = document.createElement('p');
      cap.className = 'slide-caption';
      cap.innerHTML = `<strong>${esc(it.title)}.</strong> ${esc(it.caption)}`;
      li.append(btn, cap);
      li.insertAdjacentHTML('beforeend', itemLinks(k));
      $('.item-more', li).addEventListener('click', () => openDetail(k));
      const live = P.links && P.links[k];
      if (live) li.insertAdjacentHTML('beforeend', tryPill(live, it.linkLabel));
      track.appendChild(li);
      fitDoodles(li);
    });
    const n = slides().length;
    $('#dots').innerHTML = Array.from({ length: n }, (_, i) =>
      `<button class="dot" type="button" aria-label="Show item ${i + 1}"></button>`).join('');
    $$('#dots .dot').forEach((d, i) => d.addEventListener('click', () => goTo(i, true)));
    $('.gallery-controls').hidden = n < 2;
    track.scrollLeft = 0;
    gal.target = null;
    gal.elapsed = 0;
    setActive(0);
  }

  function goTo(i, byUser) {
    const all = slides();
    if (!all.length) return;
    const n = (i + all.length) % all.length;
    const track = $('#gallery');
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    gal.target = all[n].offsetLeft - pad;      // where we're gliding to; scroll tracking waits for it
    track.scrollTo({ left: gal.target, behavior: reduced ? 'auto' : 'smooth' });
    setActive(n);
    if (byUser) gal.elapsed = 0;
  }

  function setActive(n) {
    gal.idx = n;
    $$('#dots .dot').forEach((d, i) => {
      d.classList.toggle('active', i === n);
      d.style.setProperty('--prog', gal.playing ? '0' : '1');
    });
    syncGalleryMedia();
  }

  function syncGalleryMedia() {
    if (!isHome) return;
    const on = gal.inView && body.classList.contains('site-ready') && !body.classList.contains('modal-open');
    slides().forEach((s, i) => playMedia($('.media', s), on && i === gal.idx));
  }

  function onTrackScroll() {
    const track = $('#gallery');
    if (gal.target != null) {
      // still gliding after an arrow / dot / drag: don't let the dots jump back mid-way
      if (Math.abs(track.scrollLeft - gal.target) > 4) return;
      gal.target = null;
    }
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    let best = 0;
    let bestD = Infinity;
    slides().forEach((s, i) => {
      const d = Math.abs(s.offsetLeft - pad - track.scrollLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best !== gal.idx) setActive(best);
  }

  function setPlaying(on) {
    gal.playing = on;
    const btn = $('#playPause');
    btn.classList.toggle('paused', !on);
    btn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    const dot = $('#dots .dot.active');
    if (dot && !on) dot.style.setProperty('--prog', '1');
  }

  function galleryLoop(now) {
    requestAnimationFrame(galleryLoop);
    const dt = gal.last ? now - gal.last : 0;
    gal.last = now;
    if (!gal.playing || !gal.inView || document.hidden || slides().length < 2 ||
        !body.classList.contains('site-ready') || body.classList.contains('modal-open') ||
        body.classList.contains('intro-active')) return;
    gal.elapsed += dt;
    const p = clamp(gal.elapsed / gal.dur);
    const dot = $('#dots .dot.active');
    if (dot) dot.style.setProperty('--prog', p.toFixed(3));
    if (p >= 1) { gal.elapsed = 0; goTo(gal.idx + 1, false); }
  }

  /* ---------------------------- lineup ----------------------------- */
  function buildLineup() {
    const list = $('#lineup');
    list.innerHTML = '';
    const keys = (P.projects || []).filter((k) => P.items[k]);
    $('#projects').hidden = !keys.length;
    $('#navProjects').parentElement.hidden = !keys.length;
    keys.forEach((key, i) => {
      const it = P.items[key];
      const li = document.createElement('li');
      li.className = 'lu-item reveal';
      li.style.setProperty('--d', `${i * 0.06}s`);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lu-media';
      btn.setAttribute('aria-label', `More about ${it.title}`);
      const media = mediaEl(key, { video: true });
      btn.appendChild(media);
      makeTilt(btn, 9);
      btn.addEventListener('click', () => openDetail(key));
      btn.addEventListener('mouseenter', () => playMedia(media, true));
      btn.addEventListener('mouseleave', () => playMedia(media, false));
      li.appendChild(btn);
      if (P.links && P.links[key]) li.insertAdjacentHTML('beforeend', tryPill(P.links[key], it.linkLabel));
      li.insertAdjacentHTML('beforeend',
        `<p class="lu-status">${esc(it.status)}</p>` +
        `<h3 class="lu-title">${esc(it.title)}</h3>` +
        `<p class="lu-meta">${esc(it.meta)} · ${esc(it.date)}</p>` +
        `<p class="lu-line">${esc(it.line || it.caption)}</p>` +
        itemLinks(key));
      $('.item-more', li).addEventListener('click', () => openDetail(key));
      list.appendChild(li);
      fitDoodles(li);
      revealer && revealer.observe(li);
    });
  }

  /* ----------------------------- modal ----------------------------- */
  const modal = $('#modal');
  let lastFocus = null;

  function openDetail(key) {
    const it = P.items[key];
    lastFocus = document.activeElement;
    const holder = $('#modalMedia');
    holder.innerHTML = '';
    const media = mediaEl(key, { video: true });
    holder.appendChild(media);
    fitDoodles(holder);
    $('#modalTitle').textContent = it.title;
    $('#modalStatus').textContent = it.status;
    $('#modalDate').textContent = it.date;
    $('#modalSummary').textContent = it.summary;
    $('#modalPoints').innerHTML = (it.points || []).map((p) => `<li>${esc(p)}</li>`).join('');
    $('#modalFacts').innerHTML = (it.facts || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const link = $('#modalLink');
    const url = P.links && P.links[key];
    link.hidden = !url;
    if (url) { link.href = url; link.textContent = it.linkLabel || 'Open'; }
    const repo = $('#modalRepo');
    const r = repoLink(key);
    repo.hidden = !r;
    if (r) {
      repo.href = r.href;
      repo.textContent = r.long;
      if (r.external) { repo.target = '_blank'; repo.rel = 'noopener'; } else { repo.removeAttribute('target'); repo.removeAttribute('rel'); }
    }
    modal.hidden = false;
    modal.classList.remove('closing');
    modal.scrollTop = 0;
    body.classList.add('modal-open');
    syncGalleryMedia();
    playMedia(media, true);
    $('.modal-close', modal).focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal || modal.hidden || modal.classList.contains('closing')) return;
    modal.classList.add('closing');
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('closing');
      $('#modalMedia').innerHTML = '';
      body.classList.remove('modal-open');
      syncGalleryMedia();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 220);
  }

  /* ============================= ABOUT ============================= */
  function renderAbout() {
    const a = P.about || {};
    $('#aboutName').textContent = `${P.fullName}.`;
    // the story, with [[marked]] words highlighted
    $('#aboutStory').innerHTML = (a.story || '').split(/(\[\[.+?\]\])/).map((chunk) => {
      const m = chunk.match(/^\[\[(.+)\]\]$/);
      return m ? `<strong>${esc(m[1])}</strong>` : esc(chunk);
    }).join('');
    $('#aboutStory').hidden = !a.story;
    // handwritten notes with hand-drawn arrows pointing at the name
    const ARROWS = {
      tl: ['M8 6C34 8 58 22 80 50', 'M67 48L80 51L79 37'],
      tr: ['M82 6C56 8 32 22 10 50', 'M23 48L10 51L11 37'],
      bl: ['M8 54C34 52 58 38 80 10', 'M67 12L80 9L79 23'],
      br: ['M82 54C56 52 32 38 10 10', 'M23 12L10 9L11 23'],
    };
    const sketch = $('#aboutSketch');
    $$('.note', sketch).forEach((n) => n.remove());
    (a.notes || []).slice(0, 4).forEach(([line, sub], i) => {
      const pos = ['tl', 'tr', 'bl', 'br'][i];
      const [shaft, head] = ARROWS[pos];
      sketch.insertAdjacentHTML('beforeend',
        `<div class="note note-${pos}">` +
          `<p class="note-text">${esc(line)}${sub ? `<span>${esc(sub)}</span>` : ''}</p>` +
          `<svg class="note-arrow" viewBox="0 0 90 60" aria-hidden="true"><g filter="url(#boil)">` +
            `<path class="draw" d="${shaft}" pathLength="1"/><path class="draw" d="${head}" pathLength="1"/>` +
          `</g></svg>` +
        `</div>`);
    });
    requestAnimationFrame(() => setTimeout(() => sketch.classList.add('drawn'), reduced ? 0 : 250));
    $('#statsSection').hidden = !(a.stats && a.stats.length);
    $('#stats').innerHTML = (a.stats || []).map(([n, c], i) =>
      `<div class="stat reveal" style="--d:${i * 0.06}s"><p class="stat-num">${esc(n)}</p><p class="stat-cap">${esc(c)}</p></div>`).join('');
    $('#experience').hidden = !(a.experience && a.experience.length);
    $('#exp').innerHTML = (a.experience || []).map((e) =>
      `<li class="exp-item reveal"><div class="exp-when"><p class="exp-org">${esc(e.org)}</p><p>${esc(e.when)}</p></div>` +
      `<div><h3 class="exp-role">${esc(e.role)}</h3><ul class="exp-points">${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></li>`).join('');
    $('#specs').hidden = !(a.specs && a.specs.length);
    $('#specTable').innerHTML = (a.specs || []).map(([label, lines]) =>
      `<div class="spec-row reveal"><dt>${esc(label)}</dt><dd>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</dd></div>`).join('');
  }

  /* ============================ SHARED ============================ */
  const nav = $('#nav');
  let words = [];
  let litCount = -1;
  let revealer = null;

  function buildScrub(text) {
    const scrub = $('#scrubText');
    const frag = document.createDocumentFragment();
    const add = (t, hl) => t.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const s = document.createElement('span');
      s.className = hl ? 'w hl' : 'w';
      s.textContent = part;
      frag.appendChild(s);
    });
    text.split(/(\[\[.+?\]\])/).forEach((chunk) => {
      const m = chunk.match(/^\[\[(.+)\]\]$/);
      add(m ? m[1] : chunk, !!m);
    });
    scrub.textContent = '';
    scrub.appendChild(frag);
    words = $$('.w', scrub);
    litCount = -1;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }

  function update() {
    const vh = window.innerHeight;
    const scrub = $('#scrubText');
    if (scrub && words.length) {
      const r = scrub.getBoundingClientRect();
      const start = vh * 0.85;
      const end = vh * 0.4;
      const p = reduced ? 1 : clamp((start - r.top) / (r.height + start - end));
      const n = Math.round(p * words.length);
      if (n !== litCount) {
        words.forEach((w, i) => w.classList.toggle('on', i < n));
        litCount = n;
      }
    }
    const y = nav.offsetHeight / 2;
    let theme = 'light';
    for (const s of $$('main [data-theme]')) {
      if (s.hidden) continue;
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { theme = s.dataset.theme; break; }
    }
    nav.classList.toggle('dark', theme === 'dark');
  }

  function setupReveals() {
    revealer = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); revealer.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => revealer.observe(el));
  }

  function wireShared() {
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      ev.preventDefault();
      nav.classList.remove('open');
      $('#navToggle').setAttribute('aria-expanded', 'false');
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
    const toggle = $('#navToggle');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { setGutter(); onScroll(); });
  }

  function wireHome() {
    skipBtn.addEventListener('click', () => endIntro(false));
    $('#personChip').addEventListener('click', () => openPicker(false));
    $('#switchPerson').addEventListener('click', () => openPicker(false));
    $('#replayIntro').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'instant' }); playIntro(); });
    $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeModal));
    $('#playPause').addEventListener('click', () => setPlaying(!gal.playing));

    const track = $('#gallery');
    let st = 0;
    track.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(onTrackScroll, 80); }, { passive: true });
    ['pointerdown', 'wheel', 'touchstart'].forEach((t) => track.addEventListener(t, () => { gal.elapsed = 0; gal.target = null; }, { passive: true }));

    // arrows
    $('#galPrev').addEventListener('click', () => goTo(gal.idx - 1, true));
    $('#galNext').addEventListener('click', () => goTo(gal.idx + 1, true));

    // click-and-drag with a mouse to swipe (touch and trackpads already swipe natively)
    let drag = null;
    let swallowClick = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      e.preventDefault();                       // no text selection / image dragging
      drag = { x: e.clientX, left: track.scrollLeft, idx: gal.idx, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; track.classList.add('dragging'); }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const { moved, idx, x } = drag;
      drag = null;
      if (!moved) return;
      track.classList.remove('dragging');
      swallowClick = true;                      // a drag shouldn't open the card underneath
      const dx = e.clientX - x;
      const step = dx < -50 ? 1 : dx > 50 ? -1 : 0;
      goTo(Math.max(0, Math.min(slides().length - 1, idx + step)), true);
    });
    track.addEventListener('click', (e) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    new IntersectionObserver(([en]) => { gal.inView = en.isIntersecting; syncGalleryMedia(); },
      { threshold: 0.3 }).observe($('#highlights'));

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (!modal.hidden) closeModal();
        else if (!intro.hidden && intro.classList.contains('play')) endIntro(false);
      }
      if (ev.key === 'Tab' && !modal.hidden) {
        const f = $$('button, a[href]', modal).filter((el) => !el.hidden && el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
    requestAnimationFrame(galleryLoop);
    setPlaying(gal.playing);
  }

  /* ========================= EMAIL CHOOSER =========================
     Plain mailto: links often do nothing for people who use webmail, so any
     email link opens a small menu: Gmail, Outlook, Yahoo, the device's mail
     app, or copy the address. Whatever the link carries (to / subject / body)
     is filled into the draft; the visitor still has to press send.           */
  const enc = encodeURIComponent;
  const MAIL_APPS = [
    { id: 'gmail', label: 'Gmail', web: true,
      url: (m) => `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(m.to)}${m.subject ? `&su=${enc(m.subject)}` : ''}${m.body ? `&body=${enc(m.body)}` : ''}` },
    { id: 'outlook', label: 'Outlook', web: true,
      url: (m) => `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(m.to)}${m.subject ? `&subject=${enc(m.subject)}` : ''}${m.body ? `&body=${enc(m.body)}` : ''}` },
    { id: 'yahoo', label: 'Yahoo Mail', web: true,
      url: (m) => `https://compose.mail.yahoo.com/?to=${enc(m.to)}${m.subject ? `&subject=${enc(m.subject)}` : ''}${m.body ? `&body=${enc(m.body)}` : ''}` },
    { id: 'app', label: 'Mail app on this device', web: false,
      url: (m) => `mailto:${m.to}${m.subject || m.body ? '?' : ''}${[m.subject ? `subject=${enc(m.subject)}` : '', m.body ? `body=${enc(m.body)}` : ''].filter(Boolean).join('&')}` },
  ];
  let mailMsg = null;
  let mailOpener = null;

  function parseMailto(href) {
    const u = new URL(href);
    return { to: decodeURIComponent(u.pathname), subject: u.searchParams.get('subject') || '', body: u.searchParams.get('body') || '' };
  }

  function buildMailSheet() {
    document.body.insertAdjacentHTML('beforeend',
      `<div class="mail-sheet" id="mailSheet" hidden>
        <div class="mail-backdrop" data-mail-close></div>
        <div class="mail-panel" role="dialog" aria-modal="true" aria-labelledby="mailTitle">
          <p class="mail-title" id="mailTitle">Write with…</p>
          <p class="mail-sub" id="mailSub"></p>
          <div class="mail-options" id="mailOptions"></div>
          <button class="mail-cancel" type="button" data-mail-close>Cancel</button>
        </div>
      </div>`);
    $$('#mailSheet [data-mail-close]').forEach((el) => el.addEventListener('click', closeMail));
  }

  function openMail(href) {
    mailMsg = parseMailto(href);
    mailOpener = document.activeElement;
    let last = null;
    try { last = localStorage.getItem('mail-app'); } catch (e) { /* private mode */ }
    const apps = [...MAIL_APPS].sort((a, b) => (b.id === last) - (a.id === last));
    $('#mailSub').innerHTML = mailMsg.subject
      ? `Opens a draft to <b>${esc(mailMsg.to)}</b> with the subject and message filled in. Add your details, then hit send.`
      : `Opens a new email to <b>${esc(mailMsg.to)}</b>. You write the rest.`;
    $('#mailOptions').innerHTML = apps.map((a) =>
      `<button type="button" class="mail-opt" data-app="${a.id}"><span>${esc(a.label)}</span>${a.id === last ? '<small>last used</small>' : ''}</button>`
    ).join('') + '<button type="button" class="mail-opt mail-copy" data-app="copy"><span>Copy email address</span></button>';
    $$('#mailOptions .mail-opt').forEach((b) => b.addEventListener('click', () => pickMail(b)));
    $('#mailSheet').hidden = false;
    body.classList.add('sheet-open');
    $('#mailOptions .mail-opt').focus({ preventScroll: true });
  }

  function pickMail(btn) {
    const id = btn.dataset.app;
    if (id === 'copy') {
      const done = () => { btn.querySelector('span').textContent = 'Copied ✓'; setTimeout(closeMail, 900); };
      if (navigator.clipboard) navigator.clipboard.writeText(mailMsg.to).then(done, () => window.prompt('Copy this email address:', mailMsg.to));
      else window.prompt('Copy this email address:', mailMsg.to);
      return;
    }
    const app = MAIL_APPS.find((a) => a.id === id);
    try { localStorage.setItem('mail-app', id); } catch (e) { /* private mode */ }
    const url = app.url(mailMsg);
    if (app.web) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
    closeMail();
  }

  function closeMail() {
    const sheet = $('#mailSheet');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    body.classList.remove('sheet-open');
    if (mailOpener && mailOpener.focus) mailOpener.focus({ preventScroll: true });
  }

  function wireMail() {
    buildMailSheet();
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[href^="mailto:"]');
      if (!a) return;
      ev.preventDefault();
      ev.stopPropagation();
      openMail(a.getAttribute('href'));
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !$('#mailSheet').hidden) { ev.stopImmediatePropagation(); closeMail(); }
    }, true);
  }

  /* ============================== BOOT ============================== */
  setGutter();
  // re-measure when the page width changes, e.g. when the scrollbar appears after the intro
  if (window.ResizeObserver) new ResizeObserver(setGutter).observe(document.documentElement);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitDoodles());
  let refit = 0;
  window.addEventListener('resize', () => { clearTimeout(refit); refit = setTimeout(() => fitDoodles(), 150); });
  wireShared();
  wireMail();
  setupReveals();

  if (isHome) {
    buildPicker();
    wireHome();

    const stored = store.get('person');
    const stage = store.get('stage');
    const fromUrl = params.get('p');
    const target = location.hash && document.getElementById(location.hash.slice(1));
    // draw a page behind the picker, but don't count it as a choice yet
    renderPerson(SITE.people[fromUrl] ? fromUrl : (SITE.people[stored] ? stored : SITE.order[0]), false);

    if (params.has('intro')) {
      history.replaceState(null, '', location.pathname);
      playIntro();
    } else if (params.has('pick')) {
      history.replaceState(null, '', location.pathname);
      openPicker(false);
    } else if (SITE.people[fromUrl]) {                         // a shared link straight to someone
      history.replaceState(null, '', location.pathname + location.hash);
      enterSite();
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    } else if (stage === 'viewing' && SITE.people[stored]) {   // refreshed while viewing a profile
      enterSite();
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    } else if (stage === 'picking') {                          // refreshed during the intro or selection
      openPicker(false);
    } else {
      playIntro();
    }
  } else {
    const fromUrl = params.get('p');
    const stored = store.get('person');
    usePerson(SITE.people[fromUrl] ? fromUrl : (SITE.people[stored] ? stored : SITE.order[0]));
    renderAbout();
    $$('.reveal').forEach((el) => revealer.observe(el));
    update();
  }
})();
