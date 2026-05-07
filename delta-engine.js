/* delta-engine.js — RDS Edition
 * Single IIFE, 25 sections per claudeRDS.md §10 + skillRDS.md.
 * Zero hardcode of GitHub repo or token. UTF-8-safe base64.
 * Brand name and all content flow exclusively from content.json.
 */
(function (global) {
  'use strict';

  // ─── 1. CONSTANTS ───────────────────────────────────────────────────────
  const ADMIN_PASSWORD = 'RDSIDE123';
  const IMG_PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><rect width="900" height="600" fill="#1e2940"/><text x="50%" y="50%" fill="#8a9ab5" font-family="sans-serif" font-size="22" text-anchor="middle" dominant-baseline="middle">Image</text></svg>'
    );

  const ANIMATION_OPTIONS = [
    'fade-up','fade-down','fade-left','fade-right',
    'zoom-in','zoom-out','flip-up','flip-down','flip-left','flip-right',
    'slide-up','slide-down',
    'scramble-reveal','parallax-scroll','stagger-fade','magnetic-pop'
  ];
  const GSAP_ANIM_KEYS = ['scramble-reveal','stagger-fade','magnetic-pop','parallax-scroll'];

  const THEME_TOKENS = ['bg','surface','surface-alt','surface-deep','surface-emphasis',
                        'text','text-muted','border','cta','cta-hover','accent','header-bg'];

  const DEFAULT_THEME = {
    dark: {
      bg:'#0a1628', surface:'#1a2235', 'surface-alt':'#121c2e',
      'surface-deep':'#080e1a', 'surface-emphasis':'#1e2940',
      text:'#f0eded', 'text-muted':'#8a9ab5', border:'#2a3650',
      cta:'#e10600', 'cta-hover':'#930300', accent:'#ecc300',
      'header-bg':'#041a3f'
    },
    light: {
      bg:'#fcf9f8', surface:'#ffffff', 'surface-alt':'#f6f3f2',
      'surface-deep':'#f0eded', 'surface-emphasis':'#eae7e7',
      text:'#1c1b1b', 'text-muted':'#5e3f3a', border:'#936e68',
      cta:'#b30400', 'cta-hover':'#e10600', accent:'#715c00',
      'header-bg':'#1a2235'
    },
    defaultMode: 'auto',
    showToggle: true
  };

  const DEFAULT_KEYWORD_BANK = {
    primary:[], longTail:[], geoCity:[], i40Exits:[],
    fleet:[], problemAware:[], lsi:[], entities:[]
  };

  const PLATFORM_COLORS = {
    google:   { color: '#4285f4', label: 'Google',   icon: 'g_mobiledata' },
    yelp:     { color: '#d32323', label: 'Yelp',     icon: 'restaurant' },
    facebook: { color: '#1877f2', label: 'Facebook', icon: 'thumb_up' },
    direct:   { color: '#2d9c3c', label: 'Verified', icon: 'verified' }
  };

  const STATE = { content: null, ready: false };

  // ─── 2. DOM UTILS ───────────────────────────────────────────────────────
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  // ─── 3. TOAST ───────────────────────────────────────────────────────────
  function toast(msg, kind) {
    let host = $('#delta-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'delta-toast-host';
      host.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem';
      document.body.appendChild(host);
    }
    const colors = { success:'#059669', error:'#dc2626', info:'#1e293b' };
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `background:${colors[kind]||colors.info};color:#fff;padding:0.6rem 1rem;border-radius:0.4rem;font:500 14px/1.4 system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateX(1.5rem);opacity:0;transition:all 0.25s ease`;
    host.appendChild(t);
    requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; t.style.opacity = '1'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(1.5rem)';
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  // ─── 4. IMAGE & URL UTILS ───────────────────────────────────────────────
  function normalizeImageUrl(url) {
    if (!url || !String(url).trim()) return IMG_PLACEHOLDER;
    const s = String(url).trim();
    if (/^(data:|blob:)/i.test(s)) return s;
    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    m = s.match(/[?&]id=([^&]+)/);
    if (m && /drive\.google\.com/.test(s)) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    if (/dropbox\.com/.test(s)) return s.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '') + (s.indexOf('?') > -1 ? '&raw=1' : '?raw=1');
    if (s.indexOf('//') === 0) return 'https:' + s;
    return s;
  }
  function imgTag(src, alt, classes, width, height, eager) {
    const normalized = normalizeImageUrl(src);
    const dims = (width && height) ? ` width="${width}" height="${height}"` : '';
    const loading = eager ? 'eager' : 'lazy';
    const cls = `w-full h-full object-cover object-center${classes ? ' ' + classes : ''}`;
    return `<img src="${normalized}" alt="${escHtml(alt || '')}" class="${cls}" loading="${loading}"${dims} onerror="this.onerror=null;this.src='${IMG_PLACEHOLDER}'">`;
  }
  function buildMapEmbedSrc(address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address || '')}&output=embed`;
  }

  // ─── 5. ENCODING (UTF-8 safe base64) ───────────────────────────────────
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }
  function base64ToUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ─── 6. CONTENT I/O ─────────────────────────────────────────────────────
  async function loadContent() {
    const ts = Date.now();
    try {
      const r = await fetch(`content.json?ts=${ts}`, { cache: 'no-store' });
      if (r.ok) { STATE.content = await r.json(); return STATE.content; }
    } catch (e) { /* fallthrough */ }
    const repo = localStorage.getItem('delta_repo_path') || '';
    if (!repo) throw new Error('No content.json available and no repo path configured');
    const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/content.json?ts=${ts}`, { cache: 'no-store' });
    STATE.content = await r.json();
    return STATE.content;
  }

  async function fetchShaWithToken(token, repoPath) {
    const r = await fetch(`https://api.github.com/repos/${repoPath}/contents/content.json`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' }
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub SHA fetch failed: ${r.status}`);
    const d = await r.json();
    return d.sha;
  }

  async function commitContent(token, repoPath, contentObj, message) {
    if (!token || !repoPath) throw new Error('Missing token or repo path');
    const sha = await fetchShaWithToken(token, repoPath);
    const body = {
      message: message || 'Update content.json',
      content: utf8ToBase64(JSON.stringify(contentObj, null, 2)),
      branch: 'main'
    };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${repoPath}/contents/content.json`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Commit failed (${r.status})`);
    }
    return r.json();
  }

  // ─── 7. THEME SYSTEM ────────────────────────────────────────────────────
  function bootstrapTheme() {
    let mode = localStorage.getItem('delta_theme_mode') || 'auto';
    if (mode === 'auto') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(mode === 'light' ? 'light' : 'dark');
  }
  function applyTheme(c) {
    const theme = (c && c.theme) || DEFAULT_THEME;
    const dark = theme.dark || DEFAULT_THEME.dark;
    const light = theme.light || DEFAULT_THEME.light;
    const css =
      ':root, html.dark {' + THEME_TOKENS.map(t => `--c-${t}:${dark[t]||DEFAULT_THEME.dark[t]}`).join(';') + ';}' +
      'html.light {' + THEME_TOKENS.map(t => `--c-${t}:${light[t]||DEFAULT_THEME.light[t]}`).join(';') + ';}';
    let tag = document.getElementById('delta-theme-vars');
    if (!tag) { tag = document.createElement('style'); tag.id = 'delta-theme-vars'; document.head.appendChild(tag); }
    tag.textContent = css;
  }
  function getThemeMode() {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  }
  function setThemeMode(m) {
    const mode = (m === 'light') ? 'light' : 'dark';
    document.documentElement.classList.remove('dark','light');
    document.documentElement.classList.add(mode);
    localStorage.setItem('delta_theme_mode', mode);
    $all('[data-delta-trigger="theme-toggle"]').forEach(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = mode === 'light' ? 'dark_mode' : 'light_mode';
    });
  }
  function bindThemeToggle() {
    $all('[data-delta-trigger="theme-toggle"]').forEach(btn => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = getThemeMode() === 'light' ? 'dark_mode' : 'light_mode';
      btn.addEventListener('click', () => setThemeMode(getThemeMode() === 'light' ? 'dark' : 'light'));
    });
  }

  // ─── 8. SEO INJECTION ───────────────────────────────────────────────────
  function setMeta(name, value) {
    if (!value) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }
  function setOG(prop, value) {
    if (!value) return;
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }
  function upsertJsonLd(id, data) {
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = id;
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(data, null, 2);
  }
  function injectMetaTags(c) {
    const s = c.seo || {};
    if (s.defaultTitle) document.title = s.defaultTitle;
    setMeta('description',   s.defaultDescription || c.tagline);
    setMeta('keywords',      s.defaultKeywords || '');
    setMeta('geo.region',    s.geoRegion || '');
    setMeta('geo.placename', s.geoPlacename || '');
    if (s.geoLat && s.geoLng) {
      setMeta('geo.position', `${s.geoLat};${s.geoLng}`);
      setMeta('ICBM',         `${s.geoLat}, ${s.geoLng}`);
    }
    setMeta('robots', 'index, follow, max-image-preview:large');
  }
  function injectOpenGraph(c) {
    const s = c.seo || {};
    setOG('og:type',        'website');
    setOG('og:title',       s.defaultTitle || c.brand);
    setOG('og:description', s.defaultDescription || c.tagline);
    setOG('og:url',         (s.canonicalBase || '') + '/');
    setOG('og:image',       (s.canonicalBase || '') + '/og-cover.jpg');
    setOG('og:locale',      'en_US');
    const alt = ((c.i18n && c.i18n.alternateLocales) || []);
    if (alt.indexOf('es') !== -1) setOG('og:locale:alternate', 'es_US');
  }
  function injectTwitterCard(c) {
    const s = c.seo || {};
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       s.defaultTitle || c.brand);
    setMeta('twitter:description', s.defaultDescription || c.tagline);
    setMeta('twitter:image',       (s.canonicalBase || '') + '/twitter-cover.jpg');
  }
  function injectCanonical(c) {
    const s = c.seo || {};
    if (!s.canonicalBase) return;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = s.canonicalBase + (location.pathname || '/');
  }
  function injectHreflang(c) {
    if (!c.i18n || !c.i18n.alternateLocales) return;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    const base = (c.seo || {}).canonicalBase || '';
    c.i18n.alternateLocales.forEach(loc => {
      const link = document.createElement('link');
      link.rel = 'alternate'; link.setAttribute('hreflang', loc);
      link.href = `${base}/?lang=${loc}`;
      document.head.appendChild(link);
    });
  }
  function injectSchema(c) {
    const s = c.seo || {};
    const radius = parseInt(s.serviceRadiusMeters, 10) || 160934;
    const schema = {
      '@context': 'https://schema.org',
      '@type': ['AutoRepair', 'EmergencyService', 'LocalBusiness', 'TowingService'],
      '@id':   (s.canonicalBase || '') + '/#org',
      'name':  c.brand,
      'image': (s.canonicalBase || '') + '/og-cover.jpg',
      'url':   (s.canonicalBase || '') + '/',
      'telephone': s.phone || c.phone,
      'email': c.email,
      'priceRange': '$$',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress':   c.address,
        'addressLocality': s.geoPlacename,
        'addressRegion':   (s.geoRegion || '').split('-').pop() || '',
        'addressCountry':  'US'
      },
      'geo': { '@type': 'GeoCoordinates', 'latitude': s.geoLat, 'longitude': s.geoLng },
      'openingHoursSpecification': {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
        'opens': '00:00',
        'closes': '23:59'
      },
      'areaServed': [
        { '@type': 'GeoCircle',
          'geoMidpoint': { '@type': 'GeoCoordinates', 'latitude': s.geoLat, 'longitude': s.geoLng },
          'geoRadius':   String(radius) },
        ...(c.serviceAreas || []).map(a => ({ '@type': 'City', 'name': a.city }))
      ],
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': 'Roadside & Mobile Mechanic Services',
        'itemListElement': (c.services || []).map(sv => ({
          '@type': 'Offer',
          'itemOffered': { '@type': 'Service', 'name': sv.title, 'description': sv.shortDesc }
        }))
      }
    };
    if (s.ratingValue && s.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': s.ratingValue,
        'reviewCount': s.reviewCount
      };
    }
    if (s.socialLinks && s.socialLinks.length) {
      schema.sameAs = s.socialLinks.map(l => l.url).filter(Boolean);
    }
    upsertJsonLd('delta-jsonld', schema);
  }
  function injectFAQSchema(c) {
    const allFaqs = (c.services || []).flatMap(sv => (sv.faq || []));
    if (!allFaqs.length) return;
    upsertJsonLd('delta-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type':    'FAQPage',
      'mainEntity': allFaqs.map(f => ({
        '@type': 'Question',
        'name':  f.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
      }))
    });
  }
  function injectBreadcrumbSchema(c, crumbs) {
    if (!crumbs || !crumbs.length) return;
    upsertJsonLd('delta-breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type':    'BreadcrumbList',
      'itemListElement': crumbs.map((cr, i) => ({
        '@type':    'ListItem',
        'position': i + 1,
        'name':     cr.name,
        'item':     cr.url
      }))
    });
  }
  function injectServiceSchema(c, service) {
    const s = c.seo || {};
    upsertJsonLd('delta-service-jsonld', {
      '@context': 'https://schema.org',
      '@type':    'Service',
      'name':     service.title,
      'description': service.longDesc || service.shortDesc,
      'provider': { '@id': (s.canonicalBase || '') + '/#org' },
      'areaServed': { '@type': 'City', 'name': s.geoPlacename },
      'offers': (service.pricing || []).map(p => ({
        '@type': 'Offer',
        'name':  p.label,
        'price': p.price,
        'priceCurrency': 'USD',
        'description':   p.note
      }))
    });
    if (service.faq && service.faq.length) {
      upsertJsonLd('delta-service-faq-jsonld', {
        '@context': 'https://schema.org',
        '@type':    'FAQPage',
        'mainEntity': service.faq.map(f => ({
          '@type': 'Question',
          'name':  f.q,
          'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
        }))
      });
    }
    const cat = (c.serviceCategories || []).find(cat => cat.id === service.parentCategory);
    const catLabel = cat ? cat.label : 'Services';
    const catHubId = cat ? cat.hubPageId : '';
    injectBreadcrumbSchema(c, [
      { name: 'Home',     url: (s.canonicalBase || '') + '/' },
      { name: catLabel,   url: (s.canonicalBase || '') + '/page.html?id=' + catHubId },
      { name: service.title, url: (s.canonicalBase || '') + '/service.html?id=' + service.id }
    ]);
  }
  function injectSEO(c) {
    injectMetaTags(c);
    injectOpenGraph(c);
    injectTwitterCard(c);
    injectCanonical(c);
    injectHreflang(c);
    injectSchema(c);
    injectFAQSchema(c);
  }

  // ─── 9. AOS / GSAP ROUTING ──────────────────────────────────────────────
  function isGSAPAnim(v) { return GSAP_ANIM_KEYS.indexOf(v) !== -1; }
  function aosAttr(val, fallback) {
    const v = val || fallback || 'fade-up';
    if (isGSAPAnim(v)) return '';
    return `data-aos="${v}"`;
  }

  // ─── 10. STATS BAR + TRUST BADGES ───────────────────────────────────────
  function renderStatsBar(c) {
    const stats = c.stats || {};
    const ui = (c.ui && c.ui.stats) || {};
    const items = [
      { icon:'speed',       uiKey:'ui.stats.responseLabel', label: ui.responseLabel || 'Avg Response',    value: stats.responseTime || '30 min' },
      { icon:'location_on', uiKey:'ui.stats.citiesLabel',   label: ui.citiesLabel   || 'Cities Served',   value: stats.citiesServed || '40+' },
      { icon:'task_alt',    uiKey:'ui.stats.jobsLabel',     label: ui.jobsLabel     || 'Jobs Completed',  value: stats.dispatches   || '2,000+' },
      { icon:'star',        uiKey:'ui.stats.ratingLabel',   label: ui.ratingLabel   || 'Customer Rating', value: stats.rating       || '4.9 ★' }
    ];
    return `
      <section data-section="stats" class="py-10 bg-surface-container-high">
        <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          ${items.map(it => `
            <div class="flex flex-col items-center text-center gap-1" data-stat>
              <span class="material-symbols-outlined text-cta text-4xl mb-1">${escHtml(it.icon)}</span>
              <span class="font-manrope font-black text-3xl md:text-4xl text-on-background tracking-tight" data-stat-value="${escHtml(it.value)}">${escHtml(it.value)}</span>
              <span data-delta="${it.uiKey}" class="text-on-surface-variant text-sm font-medium uppercase tracking-wide">${escHtml(it.label)}</span>
            </div>`).join('')}
        </div>
      </section>`;
  }
  function renderTrustBadges(c) {
    const badges = c.trustBadges || [];
    if (!badges.length) return '';
    return `
      <section class="py-6 bg-surface-container-low border-b border-outline/20">
        <div class="max-w-6xl mx-auto px-4">
          <div class="flex flex-wrap justify-center gap-4 md:gap-8">
            ${badges.map(b => `
              <div class="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <span class="material-symbols-outlined text-cta text-xl">${escHtml(b.icon)}</span>
                <div>
                  <div class="font-semibold text-on-background">${escHtml(b.label)}</div>
                  ${b.sublabel ? `<div class="text-xs text-on-surface-variant">${escHtml(b.sublabel)}</div>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </div>
      </section>`;
  }

  // ─── 11. SERVICE GRID ───────────────────────────────────────────────────
  function renderFlatServiceGrid(services, c) {
    return `
      <section data-section="services" class="py-16 bg-background">
        <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${services.map(sv => serviceCard(sv, c)).join('')}
        </div>
      </section>`;
  }
  function serviceCard(sv, c) {
    return `
      <a href="service.html?id=${escHtml(sv.id)}"
         class="group bg-surface-container hover:shadow-xl border border-outline/15 rounded-2xl p-6 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1"
         ${aosAttr(c.animations && c.animations.services)}>
        <span class="material-symbols-outlined text-cta text-5xl block group-hover:scale-110 transition-transform" style="font-variation-settings: 'FILL' 1, 'wght' 500;">${escHtml(sv.icon)}</span>
        <div>
          <div class="font-manrope font-extrabold text-on-background text-lg">${escHtml(sv.title)}</div>
          <div class="text-on-surface-variant text-sm mt-1 line-clamp-2">${escHtml(sv.shortDesc)}</div>
        </div>
        ${sv.badge ? `<span class="text-xs font-bold bg-cta/10 text-cta px-2 py-1 rounded w-fit">${escHtml(sv.badge)}</span>` : ''}
      </a>`;
  }
  function renderServiceGrid(c) {
    const categories = c.serviceCategories || [];
    const services = c.services || [];
    if (!categories.length) return renderFlatServiceGrid(services, c);
    const sg = (c.sections && c.sections.services) || {};
    const uiSvc = (c.ui && c.ui.services) || {};
    const viewAllPrefix = uiSvc.viewAllPrefix || 'View All';
    const viewAllSuffix = uiSvc.viewAllSuffix || '→';
    return `
      <section id="services" data-section="services" class="py-16 md:py-20 bg-surface-container-low">
        <div class="max-w-7xl mx-auto px-5">
          <div class="text-center mb-12">
            <h2 data-delta="sections.services.heading" class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-3">${escHtml(sg.heading || 'Our Roadside Services')}</h2>
            <p data-delta="sections.services.subheading" class="text-on-surface-variant text-lg max-w-2xl mx-auto">${escHtml(sg.subheading || 'From standard passenger vehicles to heavy-duty Class 8 commercial fleets — flat rates, no hidden fees.')}</p>
          </div>
          ${categories.map((cat, idx) => {
            const catServices = services.filter(s => s.parentCategory === cat.id);
            if (!catServices.length) return '';
            return `
              <div class="mb-14">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-cta text-3xl">${escHtml(cat.icon)}</span>
                    <h3 data-delta="serviceCategories.${idx}.label" class="font-manrope font-black text-2xl text-on-background">${escHtml(cat.label)}</h3>
                  </div>
                  ${cat.hubPageId ? `<a href="page.html?id=${escHtml(cat.hubPageId)}" class="text-sm text-cta hover:underline hidden md:block"><span data-delta="ui.services.viewAllPrefix">${escHtml(viewAllPrefix)}</span> <span>${escHtml(cat.label)}</span> <span data-delta="ui.services.viewAllSuffix">${escHtml(viewAllSuffix)}</span></a>` : ''}
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  ${catServices.map(sv => serviceCard(sv, c)).join('')}
                </div>
                ${cat.hubPageId ? `<a href="page.html?id=${escHtml(cat.hubPageId)}" class="mt-4 inline-block text-sm text-cta hover:underline md:hidden"><span data-delta="ui.services.viewAllPrefix">${escHtml(viewAllPrefix)}</span> <span>${escHtml(cat.label)}</span> <span data-delta="ui.services.viewAllSuffix">${escHtml(viewAllSuffix)}</span></a>` : ''}
              </div>`;
          }).join('')}
        </div>
      </section>`;
  }

  // ─── 12. REVIEWS ────────────────────────────────────────────────────────
  function renderStars(rating) {
    const full = Math.floor(rating || 5);
    const empty = 5 - full;
    return `<span class="text-tertiary text-lg">${'★'.repeat(full)}${'☆'.repeat(empty)}</span>`;
  }
  function renderReviews(c) {
    const reviews = c.reviews || [];
    const services = c.services || [];
    const s = c.seo || {};
    const uiR = (c.ui && c.ui.reviews) || {};
    const totalReviews = reviews.length;
    const avgRating = totalReviews ? (reviews.reduce((a, r) => a + (r.rating || 5), 0) / totalReviews).toFixed(1) : (s.ratingValue || '5.0');
    return `
      <section id="reviews" data-section="reviews" class="py-16 bg-background">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-10">
            <h2 data-delta="ui.reviews.heading" class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-2">${escHtml(uiR.heading || 'What Customers Say')}</h2>
            <p class="text-on-surface-variant"><span data-delta="ui.reviews.subtitlePrefix">${escHtml(uiR.subtitlePrefix || 'Based on')}</span> ${escHtml(s.reviewCount || (totalReviews + '+'))} <span data-delta="ui.reviews.subtitleSuffix">${escHtml(uiR.subtitleSuffix || 'verified reviews')}</span></p>
            <div class="flex items-center justify-center gap-2 mt-3">
              <span class="text-tertiary text-2xl">${'★'.repeat(5)}</span>
              <span class="font-black text-2xl text-on-background">${escHtml(avgRating)}</span>
              <span class="text-on-surface-variant text-sm">/ 5.0</span>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${reviews.map(r => {
              const platform = PLATFORM_COLORS[r.platform] || PLATFORM_COLORS.direct;
              const linkedSvc = r.serviceId ? services.find(s => s.id === r.serviceId) : null;
              return `
                <div class="bg-surface-container rounded-xl p-6 relative border border-outline/20 flex flex-col gap-3 hover:shadow-lg transition-shadow" ${aosAttr(c.animations && c.animations.reviews)}>
                  <div class="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold" style="color:${platform.color}">
                    <span class="material-symbols-outlined text-base">${platform.icon}</span>
                    ${escHtml(platform.label)}
                  </div>
                  ${renderStars(r.rating || 5)}
                  <p class="text-on-background text-sm leading-relaxed">"${escHtml(r.text)}"</p>
                  <div class="mt-auto pt-3 border-t border-outline/20">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-semibold text-sm text-on-background">${escHtml(r.author)}</div>
                        <div class="text-xs text-on-surface-variant">${escHtml(r.location || '')}</div>
                      </div>
                      ${r.responseTime ? `
                        <div class="text-right">
                          <div class="text-xs font-bold text-cta">⚡ ${escHtml(r.responseTime)}</div>
                          <div class="text-xs text-on-surface-variant" data-delta="ui.reviews.responseLabel">${escHtml(uiR.responseLabel || 'response')}</div>
                        </div>` : ''}
                    </div>
                    ${linkedSvc ? `
                      <a href="service.html?id=${escHtml(linkedSvc.id)}" class="mt-2 inline-block text-xs text-on-surface-variant hover:text-cta transition-colors">
                        for ${escHtml(linkedSvc.title)} →
                      </a>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </section>`;
  }
  function renderServiceReviews(c, serviceId) {
    let filtered = (c.reviews || []).filter(r => r.serviceId === serviceId);
    if (!filtered.length) filtered = (c.reviews || []).slice(0, 3);
    if (!filtered.length) return '';
    return `
      <div class="mt-12">
        <h3 class="font-manrope font-bold text-2xl text-on-background mb-6">What Customers Say</h3>
        <div class="grid gap-4">
          ${filtered.map(r => `
            <div class="bg-surface-container rounded-lg p-5 border border-outline/20 flex gap-4">
              <div class="flex-1">
                ${renderStars(r.rating || 5)}
                <p class="text-on-background text-sm mt-2">"${escHtml(r.text)}"</p>
                <div class="mt-2 text-xs text-on-surface-variant">${escHtml(r.author)} · ${escHtml(r.location || '')}</div>
              </div>
              ${r.responseTime ? `<div class="text-right flex-shrink-0"><div class="text-xs font-bold text-cta">⚡ ${escHtml(r.responseTime)}</div><div class="text-xs text-on-surface-variant">response</div></div>` : ''}
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ─── 13. PUBLIC RENDERER ────────────────────────────────────────────────
  function renderHero(c) {
    const h = c.hero || {};
    return `
      <section data-section="hero" class="relative min-h-[85vh] flex items-center bg-header-bg overflow-hidden pt-16">
        <div data-delta-anim="hero-bg" class="absolute inset-0 z-0">
          ${imgTag(h.image, 'Tow truck on I-40 at sunset', 'brightness-[0.4]', 1600, 900, true)}
        </div>
        <div class="relative z-10 max-w-7xl mx-auto px-5 py-20 w-full">
          <div data-delta-anim="hero-content" class="max-w-3xl">
            <div data-delta-anim="eta-badge" class="inline-flex items-center gap-2 bg-cta text-white px-4 py-1.5 rounded-full mb-8 text-xs font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(225,6,0,0.4)]">
              <span class="material-symbols-outlined text-base">schedule</span>
              24/7 Emergency Response
            </div>
            <h1 data-delta="hero.title" class="font-manrope font-black text-white text-5xl md:text-7xl leading-[1.05] mb-5 tracking-tight">${escHtml(h.title || '')}</h1>
            <p data-delta="hero.subtitle" class="text-white/85 text-lg md:text-xl mb-8 max-w-2xl leading-relaxed">${escHtml(h.subtitle || '')}</p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a data-delta-trigger="call" href="${escHtml(h.cta1Href || 'tel:' + (c.phone || ''))}" class="btn-magnetic h-16 px-8 inline-flex items-center justify-center gap-3 bg-cta hover:bg-cta-hover text-white font-manrope font-extrabold text-lg rounded-xl shadow-[0_10px_25px_-5px_rgba(225,6,0,0.5)] transition-all">
                <span class="material-symbols-outlined">phone_in_talk</span>${escHtml(h.cta1Label || 'CALL FOR RESCUE')}
              </a>
              <a href="#services" class="btn-magnetic h-16 px-8 inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-manrope font-extrabold text-lg rounded-xl transition-all">
                <span class="material-symbols-outlined">handyman</span>VIEW SERVICES
              </a>
            </div>
          </div>
        </div>
      </section>`;
  }
  function renderTrustStrip(c) {
    const s = c.seo || {};
    return `
      <div class="bg-surface-container border-b border-outline/15 py-4">
        <div class="max-w-7xl mx-auto px-5 flex flex-wrap justify-between gap-6 items-center text-on-background">
          <div class="flex items-center gap-2">
            <div class="text-tertiary text-lg leading-none" style="color:#f5b400">★★★★★</div>
            <span class="font-bold text-sm">${escHtml(s.ratingValue || '4.9')} on Google</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span class="material-symbols-outlined text-cta">verified</span>Licensed &amp; Fully Insured
          </div>
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span class="material-symbols-outlined text-cta">translate</span>Hablamos Español
          </div>
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span class="material-symbols-outlined text-cta">location_on</span>Amarillo &amp; Panhandle
          </div>
        </div>
      </div>`;
  }
  function renderLiveDispatch(c) {
    const services = c.services || [];
    const eta = (c.hero && c.hero.etaMinutes) || '22';
    return `
      <section data-section="dispatch" class="py-16 md:py-20 max-w-7xl mx-auto px-5">
        <div class="bg-surface-container rounded-3xl overflow-hidden shadow-2xl border border-outline/15 flex flex-col lg:flex-row">
          <div class="p-8 lg:p-12 flex-1">
            <div class="flex items-center gap-2 text-cta font-bold mb-3 text-sm uppercase tracking-wider">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cta opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-cta"></span>
              </span>
              Live Dispatch System
            </div>
            <h2 class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-3">Request Assistance Now</h2>
            <p class="text-on-surface-variant mb-6">Pick your emergency and we'll show the live ETA from our closest technician on the I-40 corridor.</p>
            <form data-delta-form="eta" class="space-y-4" onsubmit="return false;">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="block">
                  <span class="text-sm font-bold text-on-background block mb-1">Assistance Type</span>
                  <select name="serviceType" class="w-full h-14 bg-surface-container-low border-2 border-outline/30 rounded-xl px-4 text-on-background focus:border-cta outline-none">
                    ${services.map(sv => `<option value="${escHtml(sv.title)}">${escHtml(sv.title)}</option>`).join('')}
                  </select>
                </label>
                <label class="block">
                  <span class="text-sm font-bold text-on-background block mb-1">Vehicle Type</span>
                  <select name="vehicleType" class="w-full h-14 bg-surface-container-low border-2 border-outline/30 rounded-xl px-4 text-on-background focus:border-cta outline-none">
                    <option>Sedan / SUV</option><option>Light Truck</option><option>Box Truck</option><option>Semi-Truck (Class 8)</option><option>RV / Motorhome</option>
                  </select>
                </label>
              </div>
              <label class="block">
                <span class="text-sm font-bold text-on-background block mb-1">Current Location (e.g. Mile Marker on I-40)</span>
                <input name="location" type="text" placeholder="Enter landmark or highway location"
                  class="w-full h-14 bg-surface-container-low border-2 border-outline/30 rounded-xl px-4 text-on-background focus:border-cta outline-none">
              </label>
              <button type="button" data-delta-trigger="calc-eta" class="w-full h-16 bg-header-bg hover:opacity-90 text-white font-manrope font-extrabold rounded-xl transition-opacity">
                CALCULATE ARRIVAL TIME
              </button>
            </form>
          </div>
          <div class="bg-header-bg p-8 lg:p-12 lg:w-[400px] flex flex-col justify-center items-center text-center text-white">
            <div data-eta-circle class="w-36 h-36 rounded-full border-4 border-cta flex items-center justify-center mb-4 relative" style="box-shadow: 0 0 32px 4px rgba(225,6,0,0.4)">
              <span data-eta-num class="text-white text-5xl font-manrope font-black">${escHtml(eta)}</span>
            </div>
            <div class="font-manrope font-extrabold text-xl mb-1">MINUTES</div>
            <div class="text-cta text-xs font-bold uppercase tracking-[0.25em] mb-6">Estimated Arrival</div>
            <div class="text-white/60 text-sm">Closest technician at:<br><span class="text-white font-bold" data-eta-tech>I-40 &amp; Bell Street</span></div>
          </div>
        </div>
      </section>`;
  }
  function renderRadiusSection(c) {
    const cities = (c.serviceAreas || []).slice(0, 6).map(a => a.city).join(' • ');
    return `
      <section data-section="radius" class="py-16 md:py-20 bg-header-bg text-white">
        <div class="max-w-7xl mx-auto px-5 text-center mb-8">
          <h2 class="font-manrope font-black text-3xl md:text-4xl mb-3">Our Service Radius</h2>
          <p class="text-white/70 max-w-2xl mx-auto">Serving a 100-mile radius around Amarillo, TX — including ${escHtml(cities)} and the entire I-40 corridor from Adrian to Shamrock.</p>
        </div>
        <div class="relative h-[360px] md:h-[420px]">
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-cta/5 to-transparent"></div>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-72 h-72 md:w-80 md:h-80 border-2 border-cta/60 rounded-full flex items-center justify-center bg-cta/10 backdrop-blur-sm relative">
              <div class="absolute inset-0 rounded-full border border-cta/30 animate-ping" style="animation-duration:3s"></div>
              <div class="text-center">
                <span class="material-symbols-outlined text-5xl block mb-2 text-cta">my_location</span>
                <div class="font-manrope font-black text-3xl">100 MILE</div>
                <div class="text-xs uppercase font-bold text-cta tracking-[0.2em]">Coverage</div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }
  function renderHowItWorks(c) {
    const steps = c.howItWorks || [];
    if (!steps.length) return '';
    return `
      <section data-section="howItWorks" class="py-16 bg-surface-container-low">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-10">
            <h2 class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-2">How It Works</h2>
            <p class="text-on-surface-variant">${escHtml((c.sections && c.sections.howItWorks && c.sections.howItWorks.subheading) || 'Three steps. Average 22 minutes door to dispatch.')}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${steps.map(s => `
              <div class="bg-surface-container border border-outline/20 rounded-xl p-6 text-center" ${aosAttr(c.animations && c.animations.howItWorks)}>
                <span class="material-symbols-outlined text-cta text-5xl mb-4">${escHtml(s.icon)}</span>
                <div class="font-manrope font-bold text-xl text-on-background mb-2">${escHtml(s.title)}</div>
                <p class="text-on-surface-variant text-sm">${escHtml(s.desc)}</p>
              </div>`).join('')}
          </div>
        </div>
      </section>`;
  }
  function renderAbout(c) {
    const a = c.about || {};
    return `
      <section data-section="about" class="py-16 bg-background">
        <div class="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div ${aosAttr(c.animations && c.animations.about)}>
            <div class="aspect-[4/3] rounded-xl overflow-hidden">${imgTag(a.image, a.title, '', 800, 600)}</div>
          </div>
          <div ${aosAttr(c.animations && c.animations.about)}>
            <h2 class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-4" data-delta="about.title">${escHtml(a.title || '')}</h2>
            <p class="text-on-surface-variant mb-4 leading-relaxed" data-delta="about.p1">${escHtml(a.p1 || '')}</p>
            <p class="text-on-surface-variant leading-relaxed" data-delta="about.p2">${escHtml(a.p2 || '')}</p>
          </div>
        </div>
      </section>`;
  }
  function renderFleet(c) {
    const f = c.fleet || {};
    return `
      <section data-section="fleet" class="py-16 bg-header-bg text-white relative overflow-hidden">
        <div class="absolute inset-0 opacity-30">${imgTag(f.image, 'Heavy wrecker fleet', '', 1200, 700)}</div>
        <div class="relative max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center" ${aosAttr(c.animations && c.animations.fleet)}>
          <div>
            <h2 class="font-manrope font-black text-3xl md:text-4xl mb-2">${escHtml(f.title || 'Fleet & Commercial Accounts')}</h2>
            <p class="text-tertiary font-bold mb-4">${escHtml(f.subtitle || '')}</p>
            <p class="text-white/80 leading-relaxed mb-6">${escHtml(f.body || '')}</p>
            <a href="page.html?id=fleet" class="btn-magnetic inline-flex items-center gap-2 bg-cta hover:bg-cta-hover text-white font-bold px-6 py-3 rounded transition-colors">
              <span class="material-symbols-outlined">business_center</span>Open a Fleet Account
            </a>
          </div>
        </div>
      </section>`;
  }
  function renderSafetyCompliance(c) {
    const sc = c.safetyCompliance;
    if (!sc || !sc.enabled || !sc.items || !sc.items.length) return '';
    return `
      <section data-section="safetyCompliance" class="py-16 bg-surface-container-low">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-10">
            <span class="material-symbols-outlined text-cta text-4xl mb-3 block">verified_user</span>
            <h2 class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-2" data-delta="safetyCompliance.title">${escHtml(sc.title || 'Safety & Compliance Standards')}</h2>
            <p class="text-on-surface-variant max-w-xl mx-auto" data-delta="safetyCompliance.subtitle">${escHtml(sc.subtitle || '')}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${sc.items.map(item => `
              <div class="bg-surface-container border border-outline/20 rounded-xl p-6 text-center" ${aosAttr(c.animations && c.animations.services)}>
                <span class="material-symbols-outlined text-cta text-4xl mb-3 block">${escHtml(item.icon)}</span>
                <div class="font-manrope font-bold text-lg text-on-background mb-2">${escHtml(item.title)}</div>
                <p class="text-on-surface-variant text-sm">${escHtml(item.desc)}</p>
              </div>`).join('')}
          </div>
        </div>
      </section>`;
  }
  function renderContact(c) {
    const services = c.services || [];
    return `
      <section id="contact" data-section="contact" class="py-16 bg-surface-container-low">
        <div class="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10">
          <div>
            <h2 class="font-manrope font-black text-3xl md:text-4xl text-on-background mb-4">Dispatch Request</h2>
            <p class="text-on-surface-variant mb-6">Stranded? Calling is fastest. Use this form to schedule ahead or ask a question.</p>
            <form data-delta-form="dispatch" data-email="${escHtml(c.email || '')}" class="grid gap-3">
              <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
              <input type="hidden" name="_subject" value="New Dispatch Request — ${escHtml(c.brand || '')}">
              <label class="grid gap-1"><span class="text-sm font-medium text-on-background">Name</span><input required name="name" class="h-12 bg-surface-container border border-outline/40 rounded px-3 text-on-background"></label>
              <label class="grid gap-1"><span class="text-sm font-medium text-on-background">Phone</span><input required name="phone" type="tel" class="h-12 bg-surface-container border border-outline/40 rounded px-3 text-on-background"></label>
              <label class="grid gap-1"><span class="text-sm font-medium text-on-background">Vehicle Type</span><input name="vehicleType" placeholder="e.g. 2022 F-150 / Class 8 Freightliner" class="h-12 bg-surface-container border border-outline/40 rounded px-3 text-on-background"></label>
              <label class="grid gap-1"><span class="text-sm font-medium text-on-background">Service Needed</span>
                <select required name="serviceNeeded" class="h-12 bg-surface-container border border-outline/40 rounded px-3 text-on-background">
                  <option value="">Select…</option>
                  ${services.map(sv => `<option value="${escHtml(sv.title)}">${escHtml(sv.title)}</option>`).join('')}
                </select>
              </label>
              <label class="grid gap-1">
                <span class="text-sm font-medium text-on-background">Location / Exit #</span>
                <div class="flex gap-2">
                  <input required name="location" id="dispatch-location" placeholder="e.g. I-40 Exit 75 westbound" class="h-12 bg-surface-container border border-outline/40 rounded px-3 text-on-background flex-1">
                  <button type="button" id="geo-btn" title="Use my current location" class="h-12 px-3 bg-surface-container border border-outline/40 rounded text-cta hover:bg-surface-container-high transition-colors" aria-label="Use my location">
                    <span class="material-symbols-outlined">my_location</span>
                  </button>
                </div>
              </label>
              <label class="grid gap-1"><span class="text-sm font-medium text-on-background">Notes</span><textarea name="notes" rows="3" class="bg-surface-container border border-outline/40 rounded px-3 py-2 text-on-background"></textarea></label>
              <button type="submit" class="btn-magnetic h-12 bg-cta hover:bg-cta-hover text-white font-bold rounded transition-colors">Send Dispatch Request</button>
            </form>
          </div>
          <div class="grid gap-6 content-start">
            <div class="bg-surface-container border border-outline/20 rounded-xl p-6">
              <div class="font-manrope font-black text-xl text-on-background mb-2">Dispatch HQ</div>
              <div class="text-on-surface-variant text-sm" data-delta="address">${escHtml(c.address || '')}</div>
              <div class="mt-4 text-3xl md:text-4xl font-manrope font-black text-cta" data-delta="phoneDisplay">${escHtml(c.phoneDisplay || '')}</div>
              <div class="text-on-surface-variant text-sm mt-1">${escHtml(c.hoursWeekday || '24/7')}  •  ${escHtml(c.dispatchNote || '')}</div>
            </div>
            <div class="aspect-[16/10] rounded-xl overflow-hidden border border-outline/20">
              <iframe data-delta="contact.map" src="${buildMapEmbedSrc(c.address || '')}" class="w-full h-full border-0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" title="Service area map"></iframe>
            </div>
          </div>
        </div>
      </section>`;
  }
  function renderAnnouncement(c) {
    if (!c.announcement) return '';
    return `<div class="bg-cta text-white text-center py-2 text-sm font-medium" data-delta="announcement">${escHtml(c.announcement)}</div>`;
  }
  function renderFooter(c) {
    return `
      <footer data-section="footer" class="bg-header-bg text-white py-12">
        <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div class="col-span-2">
            <div class="font-manrope font-black text-2xl mb-2" data-delta="brand">${escHtml(c.brand || '')}</div>
            <div class="text-white/70 text-sm mb-4" data-delta="tagline">${escHtml(c.tagline || '')}</div>
            <a data-delta-trigger="call" href="tel:${escHtml(c.phone || '')}" class="text-3xl md:text-4xl font-manrope font-black text-tertiary hover:underline">${escHtml(c.phoneDisplay || '')}</a>
            <div class="text-white/60 text-xs mt-2" data-delta="address">${escHtml(c.address || '')}</div>
          </div>
          <div>
            <div class="font-bold uppercase tracking-wide text-sm mb-3 text-tertiary">${escHtml((c.footer && c.footer.servicesLabel) || (c.labels && c.labels.servicesFooterLabel) || 'Services')}</div>
            <ul class="text-white/70 text-sm space-y-1">
              ${(c.services || []).slice(0, 6).map(sv => `<li><a href="service.html?id=${escHtml(sv.id)}" class="hover:text-tertiary">${escHtml(sv.title)}</a></li>`).join('')}
            </ul>
          </div>
          <div>
            <div class="font-bold uppercase tracking-wide text-sm mb-3 text-tertiary">${escHtml((c.footer && c.footer.companyLabel) || (c.labels && c.labels.companyFooterLabel) || 'Company')}</div>
            <ul class="text-white/70 text-sm space-y-1">
              <li><a href="page.html?id=our-story" class="hover:text-tertiary">About</a></li>
              <li><a href="page.html?id=service-area" class="hover:text-tertiary">Service Area</a></li>
              <li><a href="page.html?id=pricing" class="hover:text-tertiary">Pricing</a></li>
              <li><a href="page.html?id=fleet" class="hover:text-tertiary">Fleet</a></li>
              <li><a href="page.html?id=contact" class="hover:text-tertiary">Contact</a></li>
            </ul>
          </div>
          <div>
            <div class="font-bold uppercase tracking-wide text-sm mb-3 text-tertiary">Service Area</div>
            <ul class="text-white/70 text-sm space-y-1">
              ${(c.serviceAreas || []).slice(0,6).map(a => `<li><a href="page.html?id=${escHtml(a.slug)}" class="hover:text-tertiary">${escHtml(a.city)}, ${escHtml(a.state)}</a></li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-white/10 text-center text-white/50 text-xs">
          © <span data-delta="brand">${escHtml(c.brand || '')}</span> · USDOT ${escHtml((c.seo && c.seo.dotNumber) || '')} · Hablamos Español
        </div>
      </footer>`;
  }
  function renderPublic(c) {
    const root = $('#delta-root');
    if (!root) return;
    root.innerHTML =
      renderAnnouncement(c) +
      renderHero(c) +
      renderTrustStrip(c) +
      renderLiveDispatch(c) +
      renderStatsBar(c) +
      renderTrustBadges(c) +
      renderServiceGrid(c) +
      renderHowItWorks(c) +
      renderAbout(c) +
      renderReviews(c) +
      renderFleet(c) +
      renderSafetyCompliance(c) +
      renderRadiusSection(c) +
      renderContact(c) +
      renderFooter(c);
    applyElementStyles(c);
    bindLiveDispatch(c);
    injectPopup(c);
  }
  function bindLiveDispatch(c) {
    const btn = $('[data-delta-trigger="calc-eta"]');
    if (!btn || btn.dataset.etaBound) return;
    btn.dataset.etaBound = '1';
    btn.addEventListener('click', () => {
      const form = $('[data-delta-form="eta"]');
      const loc = (form && form.querySelector('[name=location]').value || '').trim();
      const veh = form && form.querySelector('[name=vehicleType]').value;
      const baseEta = parseInt((c.hero && c.hero.etaMinutes) || '22', 10);
      const heavy = /Semi|Class 8|RV|Box/i.test(veh) ? 8 : 0;
      const far = /shamrock|tucumcari|spearman|exit 152|exit 22|adrian/i.test(loc) ? 18 : (loc ? 0 : 0);
      const computed = baseEta + heavy + far;
      const numEl = $('[data-eta-num]');
      const techEl = $('[data-eta-tech]');
      if (numEl) {
        numEl.textContent = computed;
        const circle = $('[data-eta-circle]');
        if (circle) {
          circle.animate(
            [{ boxShadow: '0 0 8px 0 rgba(225,6,0,0.4)' }, { boxShadow: '0 0 48px 12px rgba(225,6,0,0.6)' }, { boxShadow: '0 0 32px 4px rgba(225,6,0,0.4)' }],
            { duration: 1200, easing: 'ease-out' }
          );
        }
      }
      if (techEl && loc) techEl.textContent = loc;
      toast('ETA calculated — call now to dispatch', 'success');
    });
  }

  // ─── 14. MOBILE NAV ─────────────────────────────────────────────────────
  function bindMobileNav() {
    const trigger = $('[data-delta-trigger="mobile-nav"]');
    const target = $('[data-delta-target="mobile-nav"]');
    if (!trigger || !target || trigger.dataset.navBound) return;
    trigger.dataset.navBound = '1';
    trigger.addEventListener('click', () => {
      const open = target.classList.toggle('translate-x-0');
      target.classList.toggle('translate-x-full', !open);
    });
    target.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      target.classList.remove('translate-x-0');
      target.classList.add('translate-x-full');
    }));
  }

  // ─── 15. CONTACT FORM ───────────────────────────────────────────────────
  function bindContactForm() {
    const form = $('[data-delta-form="dispatch"]');
    if (!form || form.dataset.formBound) return;
    form.dataset.formBound = '1';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = form.getAttribute('data-email') || '';
      if (!email) { toast('No dispatch email configured', 'error'); return; }
      const fd = new FormData(form);
      if (fd.get('_honey')) return;
      const submit = form.querySelector('button[type="submit"]');
      const orig = submit.textContent;
      submit.disabled = true; submit.textContent = 'Sending…';
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(Object.fromEntries(fd))
        });
        if (!r.ok) throw new Error('Network error');
        toast("Dispatch request sent! We'll call you within 2 minutes.", 'success');
        form.reset();
      } catch (err) {
        toast('Could not send — please call ' + ((STATE.content && STATE.content.phoneDisplay) || ''), 'error');
      } finally {
        submit.disabled = false; submit.textContent = orig;
      }
    });
    const geoBtn = document.getElementById('geo-btn');
    const locInput = document.getElementById('dispatch-location');
    if (geoBtn && locInput && navigator.geolocation) {
      geoBtn.addEventListener('click', () => {
        geoBtn.disabled = true;
        geoBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
              const data = await res.json();
              const road = data.address && (data.address.road || data.address.highway || '');
              const city = data.address && (data.address.city || data.address.town || data.address.county || '');
              locInput.value = [road, city].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            } catch {
              locInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            }
            geoBtn.disabled = false;
            geoBtn.innerHTML = '<span class="material-symbols-outlined">my_location</span>';
          },
          () => {
            geoBtn.disabled = false;
            geoBtn.innerHTML = '<span class="material-symbols-outlined">my_location</span>';
            toast('Location access denied — please type your location', 'error');
          },
          { timeout: 8000 }
        );
      });
    }
  }

  // ─── 16. STICKY MOBILE CTA BAR ──────────────────────────────────────────
  function bindMobileCTABar(c) {
    if (!c) return;
    const callBtns = $all('[data-delta-trigger="call"]');
    const textBtn = $('[data-delta-trigger="text"]');
    const locBtn  = $('[data-delta-trigger="location"]');
    callBtns.forEach(btn => { if (btn.tagName === 'A' || btn.href !== undefined) btn.href = `tel:${c.phone || ''}`; });
    if (textBtn) {
      const wa = c.whatsapp ? `https://wa.me/${String(c.whatsapp).replace(/\D/g, '')}` : `sms:${c.phone || ''}`;
      textBtn.href = wa;
    }
    if (locBtn && !locBtn.dataset.locBound) {
      locBtn.dataset.locBound = '1';
      locBtn.addEventListener('click', () => {
        const fallback = () => window.open(`https://maps.google.com/?q=${encodeURIComponent(c.address || '')}`, '_blank');
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => window.open(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`, '_blank'),
            fallback, { timeout: 4000 }
          );
        } else fallback();
      });
    }
  }

  // ─── 17. GSAP ANIMATIONS + STATS COUNT-UP ───────────────────────────────
  function bindStatsCountUp() {
    const statEls = $all('[data-stat-value]');
    if (!statEls.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el = entry.target;
        const raw = el.getAttribute('data-stat-value') || '';
        const numMatch = raw.match(/[\d,\.]+/);
        if (!numMatch) return;
        const numStr = numMatch[0].replace(/,/g, '');
        const num = parseFloat(numStr);
        const suffix = raw.replace(numMatch[0], '');
        const dur = 1500;
        const start = performance.now();
        const step = ts => {
          const elapsed = ts - start;
          const progress = Math.min(elapsed / dur, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(eased * num);
          el.textContent = (num >= 1000 ? current.toLocaleString() : current) + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = (num >= 1000 ? num.toLocaleString() : num) + suffix;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    statEls.forEach(el => observer.observe(el));
  }
  function bindGSAPAnimations(c) {
    if (!window.gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    const heroBg = $('[data-delta-anim="hero-bg"]');
    const heroContent = $('[data-delta-anim="hero-content"]');
    const etaBadge = $('[data-delta-anim="eta-badge"]');
    if (heroContent) {
      gsap.from(heroContent.children, { opacity: 0, y: 40, duration: 0.8, stagger: 0.12, ease: 'power3.out' });
    }
    if (heroBg && window.ScrollTrigger) {
      gsap.to(heroBg, { yPercent: 20, ease: 'none', scrollTrigger: { trigger: heroBg, start: 'top top', end: 'bottom top', scrub: 1.5 } });
    }
    if (etaBadge) {
      gsap.to(etaBadge, { scale: 1.04, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
    bindStatsCountUp();
    if (window.AOS) AOS.init({ duration: 700, once: true, offset: 60, easing: 'ease-out-cubic' });
  }

  // ─── 18. MAGNETIC BUTTONS ───────────────────────────────────────────────
  function applyMagnetic(btn) {
    if (!window.gsap || !btn || btn.dataset.magneticBound) return;
    btn.dataset.magneticBound = '1';
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      gsap.to(btn, { x, y, duration: 0.3, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    });
  }
  function bindMagneticButtons() {
    $all('.btn-magnetic').forEach(applyMagnetic);
  }

  // ─── 19. POPUP ──────────────────────────────────────────────────────────
  function injectPopup(c) {
    const p = c.popup || {};
    if (!p.enabled) return;
    if (sessionStorage.getItem('delta_popup_seen')) return;
    setTimeout(() => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:1rem';
      wrap.innerHTML = `
        <div class="bg-surface-container border border-outline/30 rounded-xl p-6 max-w-md text-center relative">
          <button class="absolute top-2 right-2 text-on-surface-variant text-2xl" aria-label="Close">×</button>
          ${p.image ? `<div class="aspect-video mb-4 rounded overflow-hidden">${imgTag(p.image, p.altText || 'Promo', '', 600, 340)}</div>` : ''}
          <p class="text-on-background mb-4">${escHtml(p.altText || '')}</p>
          ${p.link ? `<a href="${escHtml(p.link)}" class="inline-block bg-cta hover:bg-cta-hover text-white font-bold px-6 py-3 rounded">Call Now</a>` : ''}
        </div>`;
      wrap.querySelector('button').addEventListener('click', () => {
        sessionStorage.setItem('delta_popup_seen', '1');
        wrap.remove();
      });
      document.body.appendChild(wrap);
    }, p.delay || 8000);
  }

  // ─── 20. PAGE SYSTEM ────────────────────────────────────────────────────
  function escBlock(s) { return escHtml(s); }
  function renderBlock(b) {
    if (!b) return '';
    switch (b.type) {
      case 'heading': {
        const lvl = b.level || 'h2';
        const align = b.align ? `text-${b.align}` : '';
        const sizes = { h1: 'text-4xl md:text-5xl', h2: 'text-3xl md:text-4xl', h3: 'text-2xl', h4: 'text-xl' };
        return `<${lvl} class="font-manrope font-black ${sizes[lvl]||sizes.h2} text-on-background mb-4 ${align}">${escBlock(b.content || '')}</${lvl}>`;
      }
      case 'paragraph':
        return `<p class="text-on-surface-variant text-base leading-relaxed mb-4">${escBlock(b.content || '')}</p>`;
      case 'image':
        return `<div class="my-6 rounded-xl overflow-hidden aspect-[16/9]">${imgTag(b.src, b.alt, '', 1200, 675)}</div>`;
      case 'link': {
        const newTab = b.newTab ? ' target="_blank" rel="noopener"' : '';
        if (b.style === 'button')
          return `<a class="btn-magnetic inline-flex items-center gap-2 bg-cta hover:bg-cta-hover text-white font-bold px-5 py-3 rounded transition-colors my-2" href="${escHtml(b.href || '#')}"${newTab}>${escBlock(b.label || '')}</a>`;
        return `<a class="text-cta hover:underline block my-1" href="${escHtml(b.href || '#')}"${newTab}>${escBlock(b.label || '')}</a>`;
      }
      case 'spacer': {
        const sizes = { small: 'h-4', medium: 'h-8', large: 'h-16' };
        return `<div class="${sizes[b.size]||sizes.medium}"></div>`;
      }
      case 'divider':
        return `<hr class="my-6 border-outline/30">`;
      default: return '';
    }
  }
  function renderPage(c) {
    const id = new URLSearchParams(location.search).get('id');
    const page = (c.pages || []).find(p => p.id === id);
    const root = $('#page-root');
    const notFound = $('#page-not-found');
    if (!page) {
      if (notFound) notFound.style.display = '';
      if (root) root.style.display = 'none';
      return;
    }
    if (notFound) notFound.style.display = 'none';
    if (root) {
      root.innerHTML = `<article class="max-w-3xl mx-auto px-4 py-12">${(page.blocks||[]).map(renderBlock).join('')}</article>`;
    }
    document.title = page.title + ' | ' + (c.brand || '');
    if (page.metaDescription) setMeta('description', page.metaDescription);
    const s = c.seo || {};
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = (s.canonicalBase || '') + '/page.html?id=' + page.id;
    injectBreadcrumbSchema(c, [
      { name: 'Home',     url: (s.canonicalBase || '') + '/' },
      { name: page.title, url: (s.canonicalBase || '') + '/page.html?id=' + page.id }
    ]);
  }

  // ─── 21. SERVICE DETAIL ─────────────────────────────────────────────────
  function renderSiloBreadcrumb(c, service) {
    const cat = (c.serviceCategories || []).find(cat => cat.id === service.parentCategory);
    const s = c.seo || {};
    const base = s.canonicalBase || '';
    const crumbs = [
      { label: 'Home',                href: '/' },
      { label: cat ? cat.label : 'Services', href: cat ? `page.html?id=${cat.hubPageId}` : '/' },
      { label: service.title,         href: null }
    ];
    return `
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-on-surface-variant mb-4 flex-wrap">
        ${crumbs.map((crumb, i) => `
          ${i > 0 ? '<span class="text-outline">›</span>' : ''}
          ${crumb.href
            ? `<a href="${escHtml(crumb.href)}" class="hover:text-cta transition-colors">${escHtml(crumb.label)}</a>`
            : `<span class="text-on-background font-medium">${escHtml(crumb.label)}</span>`}
        `).join('')}
      </nav>`;
  }
  function renderRelatedServices(c, currentService) {
    const relatedIds = currentService.relatedServices || [];
    const services = c.services || [];
    let related;
    if (relatedIds.length) {
      related = relatedIds.map(id => services.find(s => s.id === id)).filter(Boolean).slice(0, 3);
    } else {
      related = services.filter(s => s.parentCategory === currentService.parentCategory && s.id !== currentService.id).slice(0, 3);
    }
    if (!related.length) return '';
    return `
      <div class="mt-12 pt-8 border-t border-outline/20">
        <h3 class="font-manrope font-bold text-xl text-on-background mb-6">You Might Also Need</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          ${related.map(sv => `
            <a href="service.html?id=${escHtml(sv.id)}" class="group bg-surface-container hover:bg-surface-container-high border border-outline/20 rounded-lg p-4 flex items-start gap-3 transition-all">
              <span class="material-symbols-outlined text-cta text-2xl flex-shrink-0">${escHtml(sv.icon)}</span>
              <div>
                <div class="font-semibold text-sm text-on-background group-hover:text-cta transition-colors">${escHtml(sv.title)}</div>
                <div class="text-xs text-on-surface-variant mt-1">${escHtml(sv.shortDesc)}</div>
              </div>
            </a>`).join('')}
        </div>
      </div>`;
  }
  function renderServiceDetail(c, service) {
    const root = $('#service-content');
    if (!root) return;
    const s = c.seo || {};
    document.title = `${service.title} ${s.geoPlacename || ''} | ${c.brand || ''} 24/7 — ${c.phoneDisplay || ''}`;
    setMeta('description', `${service.title} in ${s.geoPlacename || 'Amarillo'} TX. ${service.shortDesc} Call ${c.phoneDisplay} 24/7. Hablamos Español.`);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = (s.canonicalBase || '') + '/service.html?id=' + service.id;

    root.innerHTML = `
      <section class="max-w-6xl mx-auto px-4 py-12">
        <div id="service-breadcrumb">${renderSiloBreadcrumb(c, service)}</div>
        <div class="grid md:grid-cols-2 gap-10 items-start">
          <div class="aspect-[4/3] rounded-xl overflow-hidden">${imgTag(service.image, service.title, '', 900, 600, true)}</div>
          <div>
            <div data-delta="svc.categoryBadge" class="inline-block bg-tertiary text-on-tertiary-fixed px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-3">${escHtml(service.category || '')}</div>
            <h1 class="font-manrope font-black text-3xl md:text-5xl text-on-background mb-4">${escHtml(service.title)}</h1>
            <p class="text-on-surface-variant text-lg mb-6">${escHtml(service.shortDesc)}</p>
            <div class="flex flex-wrap gap-3 mb-8">
              <a data-delta="svc.callBtn" data-delta-trigger="call" href="tel:${escHtml(c.phone || '')}" class="btn-magnetic inline-flex items-center gap-2 bg-cta hover:bg-cta-hover text-white font-bold px-5 py-3 rounded">
                <span class="material-symbols-outlined">call</span>${escHtml((c.labels && c.labels.callBtn) || 'CALL')} ${escHtml(c.phoneDisplay || '')}
              </a>
              <a data-delta="svc.textBtn" data-delta-trigger="text" href="sms:${escHtml(c.phone || '')}" class="btn-magnetic inline-flex items-center gap-2 bg-tertiary hover:bg-tertiary-dim text-on-tertiary-fixed font-bold px-5 py-3 rounded">
                <span class="material-symbols-outlined">chat</span>${escHtml((c.labels && c.labels.textBtn) || 'TEXT')}
              </a>
            </div>
            <div class="prose-base text-on-surface-variant leading-relaxed">${escHtml(service.longDesc || '')}</div>
          </div>
        </div>

        ${(service.pricing && service.pricing.length) ? `
          <div class="mt-12">
            <h2 class="font-manrope font-bold text-2xl text-on-background mb-4">Transparent Pricing</h2>
            <div class="bg-surface-container border border-outline/20 rounded-xl overflow-hidden">
              <table class="w-full border-collapse">
                ${service.pricing.map(p => `
                  <tr class="border-b border-outline/20 last:border-0">
                    <td class="py-3 px-4 font-medium text-on-background">${escHtml(p.label)}</td>
                    <td class="py-3 px-4 font-manrope font-bold text-cta text-right whitespace-nowrap">${escHtml(p.price)}</td>
                    <td class="py-3 px-4 text-on-surface-variant text-sm hidden md:table-cell">${escHtml(p.note || '')}</td>
                  </tr>`).join('')}
              </table>
            </div>
            <div class="text-on-surface-variant text-xs mt-2">Quoted before work begins. No hidden fees.</div>
          </div>` : ''}

        ${(service.faq && service.faq.length) ? `
          <div class="mt-12">
            <h2 class="font-manrope font-bold text-2xl text-on-background mb-4">Frequently Asked Questions</h2>
            <div class="grid gap-2">
              ${service.faq.map((f, i) => `
                <div class="bg-surface-container border border-outline/20 rounded-lg overflow-hidden">
                  <button data-faq-trigger class="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-surface-container-high transition-colors">
                    <span class="font-semibold text-on-background">${escHtml(f.q)}</span>
                    <span class="material-symbols-outlined text-on-surface-variant">expand_more</span>
                  </button>
                  <div data-faq-panel class="px-5 overflow-hidden transition-all" style="max-height:0">
                    <p class="py-4 text-on-surface-variant text-sm">${escHtml(f.a)}</p>
                  </div>
                </div>`).join('')}
            </div>
          </div>` : ''}

        <div id="service-reviews">${renderServiceReviews(c, service.id)}</div>
        <div id="related-services">${renderRelatedServices(c, service)}</div>
      </section>`;

    $all('[data-faq-trigger]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        const isOpen = panel.style.maxHeight && panel.style.maxHeight !== '0px';
        $all('[data-faq-panel]').forEach(p => p.style.maxHeight = '');
        if (!isOpen) panel.style.maxHeight = panel.scrollHeight + 'px';
      });
    });
  }

  // ─── 22. PROGRAMMATIC PAGE GENERATORS ───────────────────────────────────
  function generateCityPage(area, DATA) {
    DATA = DATA || STATE.content;
    const slug = area.slug || (area.city.toLowerCase().replace(/\s+/g, '-') + '-' + area.state.toLowerCase());
    if (DATA.pages.find(p => p.id === slug)) { toast('City page already exists: ' + slug, 'info'); return; }
    DATA.pages.push({
      id: slug, title: `24/7 Roadside Assistance in ${area.city}, ${area.state}`,
      metaDescription: `Stuck in ${area.city}? ${DATA.brand} dispatches in ${area.driveTime}. Towing, flat tires, jump starts, lockouts, fuel. Call ${DATA.phoneDisplay}. Hablamos Español.`,
      showInNav: false,
      blocks: [
        { type: 'heading', content: `24/7 Roadside Assistance in ${area.city}, ${area.state}`, level: 'h1', align: 'left' },
        { type: 'paragraph', content: `${area.driveTime} from our dispatch base. We patrol the corridor constantly — average response under 30 minutes. No hidden fees, flat rates on every service.` },
        { type: 'heading', content: 'Common Breakdown Spots', level: 'h2', align: 'left' },
        { type: 'paragraph', content: (area.neighborhoods || []).join(' • ') },
        { type: 'divider' },
        { type: 'heading', content: 'Services Available in ' + area.city, level: 'h2', align: 'left' },
        { type: 'paragraph', content: 'Emergency Towing • Flat Tire Repair • Battery Jump Start • Vehicle Lockout • Fuel Delivery • Winch-Out • Mobile Mechanic • Semi Truck Repair' },
        { type: 'heading', content: 'Why Drivers in ' + area.city + ' Call Us', level: 'h2', align: 'left' },
        { type: 'paragraph', content: 'Licensed, insured, and locally owned. USDOT certified for commercial and heavy-duty work. We give you a flat rate before we start — no surprises on the bill.' },
        { type: 'spacer', size: 'medium' },
        { type: 'link', label: `📞 Call ${DATA.phoneDisplay}`, href: `tel:${DATA.phone}`, style: 'button', newTab: false }
      ]
    });
  }
  function generateExitPage(exit, DATA) {
    DATA = DATA || STATE.content;
    const slug = exit.slug || `i40-exit-${exit.exit}`;
    if (DATA.pages.find(p => p.id === slug)) return;
    DATA.pages.push({
      id: slug, title: `Tow Truck I-40 Exit ${exit.exit} ${exit.name} ${exit.city}`,
      metaDescription: `Broke down at I-40 Exit ${exit.exit} ${exit.name}? ${DATA.brand} dispatches in under 25 min. 24/7 towing, mobile mechanic, semi truck repair. No hidden fees. Call ${DATA.phoneDisplay}.`,
      showInNav: false,
      blocks: [
        { type: 'heading', content: `Tow Truck at I-40 Exit ${exit.exit} — ${exit.name}`, level: 'h1', align: 'left' },
        { type: 'paragraph', content: `Stuck at Exit ${exit.exit} (${exit.name}) on I-40 near ${exit.city}? Our heavy-duty wreckers patrol this corridor 24/7. Average dispatch time to this exit: under 25 minutes. Flat rate pricing — you know the cost before we start.` },
        { type: 'heading', content: 'What We Handle at This Exit', level: 'h2', align: 'left' },
        { type: 'paragraph', content: 'Light, medium & heavy-duty towing • Semi truck breakdowns • DPF/DEF/air-brake repair on-site • Tire blowouts • Jump starts • Winch-out & recovery • Cargo recovery • Accident recovery' },
        { type: 'heading', content: 'What Happens When You Call', level: 'h2', align: 'left' },
        { type: 'paragraph', content: `Call now. We confirm your exit number and send you a GPS link to track your technician. Most arrivals at Exit ${exit.exit} are under 25 minutes. No membership required.` },
        { type: 'spacer', size: 'medium' },
        { type: 'link', label: `🚨 CALL NOW — ${DATA.phoneDisplay}`, href: `tel:${DATA.phone}`, style: 'button', newTab: false }
      ]
    });
  }
  function generateHubPage(category, DATA) {
    DATA = DATA || STATE.content;
    const slug = category.hubPageId;
    if (!slug) return;
    if (DATA.pages.find(p => p.id === slug)) { toast('Hub page already exists: ' + slug, 'info'); return; }
    const children = (DATA.services || []).filter(s => s.parentCategory === category.id);
    DATA.pages.push({
      id: slug,
      title: `${category.label} in ${DATA.seo && DATA.seo.geoPlacename ? DATA.seo.geoPlacename + ', TX' : 'the Texas Panhandle'}`,
      metaDescription: `Professional ${category.label.toLowerCase()} from ${DATA.brand}. 24/7 dispatch, flat-rate pricing, USDOT certified. Serving the Texas Panhandle. Call ${DATA.phoneDisplay}.`,
      showInNav: false,
      blocks: [
        { type: 'heading', content: `${category.label} — ${DATA.seo && DATA.seo.geoPlacename ? DATA.seo.geoPlacename + ', TX' : 'Texas Panhandle'}`, level: 'h1', align: 'left' },
        { type: 'paragraph', content: `When you need ${category.label.toLowerCase()}, you need it now. ${DATA.brand} operates 24/7 across the Texas Panhandle with USDOT-certified technicians, heavy-duty equipment, and flat-rate pricing.` },
        { type: 'heading', content: `Our ${category.label}`, level: 'h2', align: 'left' },
        { type: 'paragraph', content: 'Click any service below for full details, pricing, and FAQs:' },
        ...children.map(s => ({ type: 'link', label: `→ ${s.title}`, href: `service.html?id=${s.id}`, style: 'inline', newTab: false })),
        { type: 'divider' },
        { type: 'heading', content: 'Why Choose ' + DATA.brand, level: 'h2', align: 'left' },
        { type: 'paragraph', content: 'Licensed & insured • USDOT certified • Flat-rate pricing • GPS-tracked dispatch • Average arrival under 30 min • No hidden fees • Hablamos Español • Locally owned Texas Panhandle' },
        { type: 'spacer', size: 'medium' },
        { type: 'link', label: `📞 Call Now — ${DATA.phoneDisplay}`, href: `tel:${DATA.phone}`, style: 'button', newTab: false }
      ]
    });
  }
  function generateAllHubPages(DATA) {
    DATA = DATA || STATE.content;
    (DATA.serviceCategories || []).forEach(cat => generateHubPage(cat, DATA));
    toast('Hub pages generated', 'success');
  }

  // ─── 23. ELEMENT STYLES ─────────────────────────────────────────────────
  function applyElementStyles(c) {
    const styles = (c && c.elementStyles) || {};
    Object.keys(styles).forEach(key => {
      const el = document.querySelector(`[data-delta="${key}"]`);
      if (!el) return;
      const { animation, ...cssStyles } = styles[key] || {};
      Object.assign(el.style, cssStyles);
      if (animation) {
        el.removeAttribute('data-aos');
        el.setAttribute('data-element-anim', animation);
      }
    });
  }

  // ─── 23b. STATIC FIELD BINDINGS ─────────────────────────────────────────
  // Updates any data-delta="brand" / data-delta="phoneDisplay" spans that live
  // in static headers outside #delta-root, so they never show hardcoded text.
  function applyStaticFields(c) {
    document.querySelectorAll('[data-delta="brand"]').forEach(el => {
      el.textContent = c.brand || '';
    });
    document.querySelectorAll('[data-delta="phoneDisplay"]').forEach(el => {
      el.textContent = c.phoneDisplay || '';
    });
    document.querySelectorAll('[data-delta="tagline"]').forEach(el => {
      el.textContent = c.tagline || '';
    });
    document.querySelectorAll('[data-delta="address"]').forEach(el => {
      el.textContent = c.address || '';
    });
  }

  // ─── 23c. NAV RENDERER ──────────────────────────────────────────────────
  function renderNavItems(c) {
    const navItems = c.nav || [];
    const navEl = document.getElementById('delta-nav');
    if (!navEl) return;
    navEl.innerHTML = navItems.map((item, i) =>
      `<a href="${escHtml(item.href)}" data-delta="nav.${i}.label" class="hover:text-cta transition-colors">${escHtml(item.label)}</a>`
    ).join('');
  }

  // ─── 23d. UI STRINGS POPULATOR ──────────────────────────────────────────
  // Walks all [data-delta^="ui."] elements and fills textContent from content.json ui.*
  function applyUIStrings(c) {
    document.querySelectorAll('[data-delta^="ui."]').forEach(el => {
      const key = el.getAttribute('data-delta');
      const parts = key.split('.');
      let val = c;
      for (let i = 0; i < parts.length; i++) {
        if (val && typeof val === 'object' && val[parts[i]] !== undefined) val = val[parts[i]];
        else { val = null; break; }
      }
      if (typeof val === 'string') el.textContent = val;
    });
  }

  // ─── 24. EXPORT ─────────────────────────────────────────────────────────
  global.DeltaEngine = {
    // constants
    ADMIN_PASSWORD, ANIMATION_OPTIONS, GSAP_ANIM_KEYS, THEME_TOKENS, DEFAULT_THEME,
    DEFAULT_KEYWORD_BANK, IMG_PLACEHOLDER, PLATFORM_COLORS,
    // utils
    $, $all, escHtml, toast, normalizeImageUrl, imgTag, buildMapEmbedSrc,
    utf8ToBase64, base64ToUtf8,
    // I/O
    loadContent, fetchShaWithToken, commitContent,
    // theme
    bootstrapTheme, applyTheme, getThemeMode, setThemeMode, bindThemeToggle,
    // SEO
    injectSEO, injectMetaTags, injectOpenGraph, injectTwitterCard, injectCanonical,
    injectHreflang, injectSchema, injectFAQSchema, injectBreadcrumbSchema, injectServiceSchema,
    // animation
    aosAttr, isGSAPAnim, applyMagnetic, bindMagneticButtons,
    // renderers
    renderStatsBar, renderTrustBadges, renderTrustStrip, renderLiveDispatch, renderRadiusSection,
    renderServiceGrid, renderReviews, renderServiceReviews,
    renderPublic, renderPage, renderBlock, renderServiceDetail,
    renderSiloBreadcrumb, renderRelatedServices, renderSafetyCompliance,
    renderFooter, renderHowItWorks, renderAbout, renderFleet,
    renderNavItems,
    bindLiveDispatch,
    // bindings
    bindMobileNav, bindContactForm, bindMobileCTABar, bindGSAPAnimations, bindStatsCountUp,
    // generators
    generateCityPage, generateExitPage, generateHubPage, generateAllHubPages,
    // misc
    applyElementStyles, injectPopup, applyStaticFields, applyUIStrings,
    // state
    state: STATE
  };

  // ─── 25. AUTO-BOOT ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    bootstrapTheme();
    const app = document.body && document.body.getAttribute('data-delta-app');
    if (!app) return;
    try {
      const c = await loadContent();
      applyTheme(c);
      bindThemeToggle();
      if (app === 'public') {
        injectSEO(c);
        applyStaticFields(c);
        renderNavItems(c);
        renderPublic(c);
        applyUIStrings(c);
        bindMobileNav();
        bindContactForm();
        bindMobileCTABar(c);
        bindGSAPAnimations(c);
        bindMagneticButtons();
      }
      // Service & page apps boot from their own inline scripts to allow id parsing first.
    } catch (err) {
      console.error('[DeltaEngine] boot failed:', err);
    }
  });

})(window);
