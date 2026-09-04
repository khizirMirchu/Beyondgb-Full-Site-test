(() => {
  'use strict';
  const SITE = 'https://beyondgb.com';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const ensureMeta = (name, content, property = false) => {
    const attr = property ? 'property' : 'name';
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    if (content) el.setAttribute('content', content);
  };
  const ensureLink = (rel, href) => {
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
    el.href = href;
  };
  const path = location.pathname.replace(/\\/g, '/');
  const canonicalPath = path === '/' || path.endsWith('/index.html') ? '/' : path;
  const canonical = SITE + canonicalPath;
  ensureLink('canonical', canonical);

  const description = clean(document.querySelector('meta[name="description"]')?.content) ||
    'BeyondGB helps travelers explore Gilgit-Baltistan with customized tours, mountain journeys and authentic local experiences.';
  const title = clean(document.title) || 'BeyondGB | Gilgit-Baltistan Tours, Travel & Experiences';
  const image = SITE + '/assets/logo/logo.webp';
  ensureMeta('description', description);
  ensureMeta('robots', 'index,follow,max-image-preview:large');
  ensureMeta('og:type', 'website', true);
  ensureMeta('og:site_name', 'BeyondGB', true);
  ensureMeta('og:title', title, true);
  ensureMeta('og:description', description, true);
  ensureMeta('og:url', canonical, true);
  ensureMeta('og:image', image, true);
  ensureMeta('twitter:card', 'summary_large_image');
  ensureMeta('twitter:title', title);
  ensureMeta('twitter:description', description);
  ensureMeta('twitter:image', image);

  if (!document.querySelector('script[data-beyondgb-schema="site"]')) {
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.dataset.beyondgbSchema = 'site';
    schema.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'TravelAgency',
      name:'BeyondGB',
      url:SITE,
      logo:image,
      description,
      areaServed:'Gilgit-Baltistan, Pakistan'
    });
    document.head.appendChild(schema);
  }

  // Performance: let the browser defer below-the-fold images and decode them asynchronously.
  const imgs = [...document.images];
  imgs.forEach((img, index) => {
    if (!img.hasAttribute('loading')) img.loading = index === 0 ? 'eager' : 'lazy';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (!img.hasAttribute('fetchpriority') && index === 0) img.fetchPriority = 'high';
  });

  // Optional Google Analytics 4: only loads when a measurement ID is explicitly configured.
  // This keeps development/local builds free of tracking and avoids inventing an account ID.
  const gaId = clean(document.documentElement.dataset.gaMeasurementId || document.querySelector('meta[name="ga-measurement-id"]')?.content);
  if (gaId && /^G-[A-Z0-9]+$/i.test(gaId) && !window.__beyondgbGA) {
    window.__beyondgbGA = true;
    const g = document.createElement('script');
    g.async = true;
    g.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
  }

})();
