/* Paste this whole file into the browser console on any page of the site.
   It reports the four things that have actually broken here before.
   Zero failures is the only acceptable result.                              */
(() => {
  // Transitions freeze in a backgrounded tab, which makes getComputedStyle
  // return mid-flight values. Kill them before measuring or the numbers lie.
  if (!document.getElementById('__check_kt')) {
    const s = document.createElement('style');
    s.id = '__check_kt';
    s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(s);
  }

  const parse = (c) => {
    if (!c) return null;
    let m = c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255];
    m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  };
  const alpha = (c) => {
    const a = c && c.match(/\/\s*([\d.]+)\)/);
    if (a) return +a[1];
    const p = c && c.match(/rgba\([^)]*,\s*([\d.]+)\)/);
    return p ? +p[1] : 1;
  };
  const lum = (c) => {
    const f = c.map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => { const l = [lum(a), lum(b)].sort((x, y) => y - x); return (l[0] + 0.05) / (l[1] + 0.05); };
  const bgOf = (el) => {
    let e = el;
    while (e) {
      const b = getComputedStyle(e).backgroundColor;
      const p = parse(b);
      if (p && alpha(b) > 0.85) return p;
      e = e.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
  };

  function audit(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.getBoundingClientRect();

    const EMOJI = /\p{Extended_Pictographic}/u;
    const contrast = [];
    document.querySelectorAll('body *').forEach((el) => {
      const st = getComputedStyle(el);
      if (el.offsetParent === null && st.position !== 'fixed') return;
      if (parseFloat(st.opacity) < 0.5) return;
      const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join('');
      if (!text || EMOJI.test(text)) return;
      const fg = parse(st.color);
      if (!fg) return;
      const size = parseFloat(st.fontSize), weight = parseInt(st.fontWeight) || 400;
      const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
      const r = ratio(fg, bgOf(el));
      if (r < need) contrast.push({ text: text.slice(0, 30), ratio: +r.toFixed(2), need });
    });

    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent !== null);
    let prev = 0; const jumps = [];
    heads.forEach((h) => { const l = +h.tagName[1]; if (prev && l > prev + 1) jumps.push(`${prev}→${l} ${h.textContent.trim().slice(0, 24)}`); prev = l; });

    // A control narrower than its own label: the button stays inside the page
    // while its text escapes the button, so a viewport check never sees it.
    const squashed = [...document.querySelectorAll('.btn,button,a,code')]
      .filter((b) => b.offsetParent && b.scrollWidth > b.clientWidth + 1)
      .map((b) => b.textContent.trim().slice(0, 24));

    // Orphaned markup evicted out of <head> paints as visible text in <body>.
    const stray = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t && t.length <= 4 && /^[">']+$/.test(t)) stray.push(t); }

    return {
      contrastFailures: contrast,
      headingJumps: jumps,
      h1Count: heads.filter((h) => h.tagName === 'H1').length,
      controlsNarrowerThanTheirLabel: squashed,
      strayMarkup: stray,
      // Below 320px is narrower than any real phone; a preview pane squeezed
      // that small reports an overflow nobody will ever see. Flagging it there
      // just teaches you to ignore this script.
      pageOverflowsSideways: window.innerWidth >= 320
        && document.documentElement.scrollWidth > window.innerWidth
    };
  }

  const was = document.documentElement.getAttribute('data-theme');
  const out = { viewport: window.innerWidth, light: audit('light'), dark: audit('dark') };
  if (was) document.documentElement.setAttribute('data-theme', was);
  else document.documentElement.removeAttribute('data-theme');

  const bad = ['light', 'dark'].reduce((n, t) => n
    + out[t].contrastFailures.length + out[t].headingJumps.length
    + out[t].controlsNarrowerThanTheirLabel.length + out[t].strayMarkup.length
    + (out[t].pageOverflowsSideways ? 1 : 0) + (out[t].h1Count === 1 ? 0 : 1), 0);

  console.log(bad === 0 ? '%c PASS — nothing to fix ' : '%c FAIL — see below ',
    `background:${bad === 0 ? '#B7F34A' : '#E06E5A'};color:#111;font-weight:700;padding:2px 8px`);
  if (window.innerWidth < 320) {
    console.log('%cWindow is ' + window.innerWidth + 'px — narrower than any real phone. '
      + 'Widen it to about 390 before trusting the layout checks.', 'color:#8A8A88');
  }
  console.log(out);
  return out;
})();
