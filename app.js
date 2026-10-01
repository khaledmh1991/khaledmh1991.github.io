(() => {
  'use strict';
  const {copy, figures} = window.portfolioContent;
  const pageKey = document.body.dataset.page || 'home';
  const pageMetadata = window.portfolioContent.pages[pageKey];
  const visibleFigures = new Set([...document.querySelectorAll('[data-open]')].map(element => element.dataset.open));
  const figureMap = new Map(figures.map(figure => [figure.id, figure]));
  const dialog = document.getElementById('figure-dialog');
  const stage = dialog.querySelector('.viewer-stage');
  const viewerImage = document.getElementById('viewer-image');
  const zoomButton = document.getElementById('viewer-zoom');
  let language = 'en';
  let currentFigure = null;
  let viewerGroup = [];
  let returnFocus = null;
  let toastTimer;

  function localPreference() {
    try { return localStorage.getItem('km-language'); } catch { return null; }
  }

  function updateFigureCopy() {
    document.querySelectorAll('[data-figure-title]').forEach(element => {
      element.textContent = figureMap.get(element.dataset.figureTitle)[language].title;
    });
    document.querySelectorAll('[data-figure-caption]').forEach(element => {
      element.textContent = figureMap.get(element.dataset.figureCaption)[language].caption;
    });
    document.querySelectorAll('[data-open]').forEach(button => {
      const figure = figureMap.get(button.dataset.open);
      button.setAttribute('aria-label', `${copy[language].openFigure}: ${figure[language].title}`);
      button.querySelector('img').alt = `${figure[language].title} — ${figure.tool}`;
    });
  }

  function setLanguage(next) {
    if (!['en', 'fr'].includes(next)) return;
    language = next;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = copy[language][element.dataset.i18n];
      if (value !== undefined) element.textContent = value;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
      element.alt = copy[language][element.dataset.i18nAlt];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const value = copy[language][element.dataset.i18nHtml];
      if (value !== undefined) element.innerHTML = value;
    });
    document.querySelectorAll('[data-lang]').forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const payback = document.querySelector('[data-numeric="payback"]');
    const irr = document.querySelector('[data-numeric="irr"]');
    const perYear = document.querySelector('[data-per-year]');
    if (payback) payback.innerHTML = language === 'fr' ? '6,3 <small>ans</small>' : '6.3 <small>years</small>';
    if (irr) irr.textContent = language === 'fr' ? '15,7 %' : '15.7%';
    if (perYear) perYear.textContent = language === 'fr' ? '/ an' : '/ year';
    document.title = pageMetadata[language].title;
    document.querySelector('meta[name="description"]').content = pageMetadata[language].description;
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = pageMetadata[language].description;
    document.querySelectorAll('[data-page-path]').forEach(link => {
      const target = new URL(link.dataset.pagePath, location.origin);
      target.searchParams.set('lang', language);
      link.href = target.pathname + target.search + target.hash;
    });
    document.querySelector('.desktop-nav').setAttribute('aria-label', language === 'fr' ? 'Navigation principale' : 'Main navigation');
    document.getElementById('mobile-menu').setAttribute('aria-label', language === 'fr' ? 'Navigation mobile' : 'Mobile navigation');
    updateFigureCopy();
    if (currentFigure && dialog.open) renderViewer();
    try { localStorage.setItem('km-language', language); } catch { /* Storage is optional. */ }
  }

  function setZoom(zoomed) {
    const fitWidth = Math.min(stage.clientWidth, stage.clientHeight * (viewerImage.naturalWidth / viewerImage.naturalHeight || 1));
    viewerImage.style.width = zoomed ? `${Math.max(viewerImage.naturalWidth, fitWidth * 1.8)}px` : '';
    stage.classList.toggle('zoomed', zoomed);
    zoomButton.textContent = copy[language][zoomed ? 'fit' : 'zoom'];
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  function renderViewer() {
    const figure = figureMap.get(currentFigure);
    const localized = figure[language];
    document.getElementById('viewer-title').textContent = localized.title;
    document.getElementById('viewer-tool').textContent = figure.tool;
    document.getElementById('viewer-caption').textContent = localized.caption;
    viewerImage.src = figure.src;
    viewerImage.alt = `${localized.title} — ${figure.tool}`;
    const position = viewerGroup.indexOf(currentFigure) + 1;
    document.getElementById('viewer-count').textContent = `${position} ${copy[language].figureOf} ${viewerGroup.length}`;
    document.getElementById('viewer-prev').disabled = viewerGroup.length < 2;
    document.getElementById('viewer-next').disabled = viewerGroup.length < 2;
    setZoom(false);
  }

  function openFigure(id, trigger) {
    const figure = figureMap.get(id);
    if (!figure) return;
    currentFigure = id;
    viewerGroup = figures.filter(item => item.group === figure.group && visibleFigures.has(item.id)).map(item => item.id);
    returnFocus = trigger;
    renderViewer();
    dialog.showModal();
    document.body.classList.add('viewer-open');
    document.getElementById('viewer-close').focus();
  }

  function advanceFigure(direction) {
    if (!currentFigure || viewerGroup.length < 2) return;
    const nextIndex = (viewerGroup.indexOf(currentFigure) + direction + viewerGroup.length) % viewerGroup.length;
    currentFigure = viewerGroup[nextIndex];
    renderViewer();
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open]');
    if (trigger) openFigure(trigger.dataset.open, trigger);
  });
  document.getElementById('viewer-close').addEventListener('click', () => dialog.close());
  document.getElementById('viewer-prev').addEventListener('click', () => advanceFigure(-1));
  document.getElementById('viewer-next').addEventListener('click', () => advanceFigure(1));
  zoomButton.addEventListener('click', () => setZoom(!stage.classList.contains('zoomed')));
  viewerImage.addEventListener('click', () => setZoom(!stage.classList.contains('zoomed')));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      advanceFigure(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    returnFocus?.focus({preventScroll: true});
  });

  const menu = document.getElementById('mobile-menu');
  const menuButton = document.querySelector('.menu-toggle');
  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 1151px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  document.querySelector('.copy-email').addEventListener('click', async () => {
    let message;
    try {
      await navigator.clipboard.writeText('Khaled.mhamdi1991@gmail.com');
      message = copy[language].copied;
    } catch { message = copy[language].copyFailed; }
    const toast = document.getElementById('toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  const requestedLanguage = new URLSearchParams(location.search).get('lang');
  const preferredLanguage = requestedLanguage || localPreference();
  const initialLanguage = ['en', 'fr'].includes(preferredLanguage) ? preferredLanguage : 'en';
  const legacyRoutes = {'#process': '/process-engineering/', '#utilities': '/utilities/', '#enerwise': '/enerwise/', '#management': '/project-management/'};
  if ((pageKey === 'home' && legacyRoutes[location.hash]) || (pageKey === 'process' && location.hash === '#management')) {
    const target = new URL(legacyRoutes[location.hash], location.origin);
    target.searchParams.set('lang', initialLanguage);
    location.replace(target.pathname + target.search + target.hash);
    return;
  }
  setLanguage(initialLanguage);
})();
