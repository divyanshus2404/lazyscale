import hashlib
import io
import os

def _css_version():
    here = os.path.dirname(os.path.abspath(__file__))
    try:
        raw = io.open(os.path.join(here, "_sys.css"), "rb").read()
    except OSError:
        return "0"
    return hashlib.sha256(raw).hexdigest()[:8]

CSS_V = _css_version()

# Shared head + nav + footer, so the three pages cannot drift apart.
MARK = ('<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
 '<rect x="2.5" y="2.5" width="43" height="43" rx="13" fill="#B7F34A" stroke="#111111" stroke-width="2.6"/>'
 '<g transform="translate(-1.6,0)" fill="none" stroke="#111111" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">'
 '<path d="M17 13.2 V29.6 a4.6 4.6 0 0 0 4.6 4.6 h1.2"/>'
 '<path d="M35.4 19.4 C35.4 16 32.9 13.9 29.9 13.9 C26.9 13.9 24.6 15.8 24.6 18.3 C24.6 23.9 35.8 22.2 35.8 28.6 C35.8 31.9 33.1 34.4 29.9 34.4 C26.7 34.4 24.2 32.4 24.2 29.3"/></g></svg>')

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect x='2.5' y='2.5' width='43' height='43' rx='13' fill='%23B7F34A' stroke='%23111111' stroke-width='2.6'/%3E%3Cg transform='translate(-1.6,0)' fill='none' stroke='%23111111' stroke-width='4.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 13.2 V29.6 a4.6 4.6 0 0 0 4.6 4.6 h1.2'/%3E%3Cpath d='M35.4 19.4 C35.4 16 32.9 13.9 29.9 13.9 C26.9 13.9 24.6 15.8 24.6 18.3 C24.6 23.9 35.8 22.2 35.8 28.6 C35.8 31.9 33.1 34.4 29.9 34.4 C26.7 34.4 24.2 32.4 24.2 29.3'/%3E%3C/g%3E%3C/svg%3E")

GET_STARTED = "https://cal.com/lazy_scale/15min"

def head(title, desc, canonical):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://lazyscale.vercel.app/og-image.png">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<meta property="og:image:alt" content="LazyScale. AI employees for repetitive work.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://lazyscale.vercel.app/og-image.png">
<link rel="icon" href="{FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/_sys.css?v={CSS_V}">
</head>
<body>
"""

def nav(active=""):
    def link(href, label):
        style = ' style="color:var(--text)"' if label.lower() == active else ''
        return f'<a href="{href}"{style}>{label}</a>'
    return f"""<a class="skip" href="#main">Skip to content</a>
<header id="hdr">
  <div class="wrap">
    <div class="nav">
      <a class="brand" href="/">{MARK} LazyScale</a>
      <nav class="nav-mid">
        {link('/#employees', 'Product')}
        {link('/automations.html', 'Solutions')}
        {link('/pricing.html', 'Pricing')}
        {link('/about.html', 'About')}
      </nav>
      <span class="sp"></span>
      <div class="nav-end">
        <button class="tog" id="tog" type="button" aria-label="Switch colour theme">◐</button>
        <a class="quiet" href="/app.html">Log in</a>
        <a class="btn" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
      </div>
    </div>
  </div>
</header>
"""

FOOTER = """<footer>
  <div class="wrap foot">
    <span>© 2026 LazyScale</span>
    <a href="/automations.html">What we automate</a>
    <a href="/pricing.html">Pricing</a>
    <a href="/faq.html">Questions</a>
    <a href="/about.html">About</a>
    <a href="https://github.com/divyanshus2404/lazyscale" target="_blank" rel="noopener">Source</a>
    <a href="/privacy.html">Privacy</a>
    <a href="/terms.html">Terms</a>
    <span class="sp"></span>
    <a href="mailto:divyanshus2404@gmail.com">divyanshus2404@gmail.com</a>
  </div>
</footer>

<script>
(function () {
  try {
    var t = localStorage.getItem('ls-theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
  var tog = document.getElementById('tog');
  if (tog) tog.addEventListener('click', function () {
    var r = document.documentElement;
    var dark = r.getAttribute('data-theme') === 'dark' ||
      (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    r.setAttribute('data-theme', next);
    try { localStorage.setItem('ls-theme', next); } catch (e) {}
  });

  // Subtle only: a border under the nav once you leave the top, and one fade
  // per section. Everything is visible without this running.
  var hdr = document.getElementById('hdr');
  if (hdr) addEventListener('scroll', function () {
    hdr.classList.toggle('stuck', scrollY > 8);
  }, { passive: true });

  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
    // Failsafe: nothing may stay hidden because an observer never fired.
    setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 2500);
  }
})();
</script>
</body>
</html>
"""
