(function(){
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const state = {
    lang: localStorage.getItem('lang') || 'en',
    currency: menuData?.meta?.currency || 'THB',
  };

  const t = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object') {
      return value[state.lang] ?? value.en ?? Object.values(value)[0] ?? '';
    }
    return '';
  };

  function fmtPrice(value) {
    if (value == null || value === '') return '';
    // Keep it simple: e.g., 180 THB
    return `${value} ${state.currency}`;
  }

  function setOpenStatus() {
    const dot = $('#status-dot');
    const txt = $('#status-text');

    // Hours in menuData.meta.hours, e.g., 09:00 - 18:00, daily
    const hours = menuData?.meta?.hours;
    if (!hours) {
      txt.textContent = 'Open hours unavailable';
      return;
    }

    const now = new Date();
    // Compute local time; assumes user is in same TZ
    const today = now.toISOString().slice(0,10);
    const openTime = new Date(`${today}T${hours.open}:00`);
    const closeTime = new Date(`${today}T${hours.close}:00`);
    const open = now >= openTime && now <= closeTime;

    dot.style.background = open ? '#16a34a' : '#f59e0b';
    txt.textContent = open ? 'Open now' : 'Closed (see hours above)';
  }

  function breakfastBadge(noteEl) {
    // Good Morning: 9:00-12:00
    const now = new Date();
    const today = now.toISOString().slice(0,10);
    const start = new Date(`${today}T09:00:00`);
    const end = new Date(`${today}T12:00:00`);
    const available = now >= start && now <= end;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = available ? 'Available now' : 'Unavailable right now';
    noteEl.appendChild(badge);
  }

  function imagePath(imageName) {
    if (!imageName) return 'images/placeholder.jpg';
    return `images/${imageName}`;
  }
  function handleImgError(e){
    e.target.src = 'images/placeholder.jpg';
    e.target.onerror = null;
  }

  function renderNav(categories) {
    const nav = $('#category-nav');
    nav.innerHTML = categories.map(cat => {
      return `<a class="category-chip" href="#${cat.id}">${t(cat.title)}</a>`;
    }).join('');
    // Active chip on scroll
    const sections = categories.map(c => $(`#${c.id}`)).filter(Boolean);
    const chips = $$('.category-chip', nav);

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chips.forEach(c => c.classList.toggle('active', c.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });

    sections.forEach(sec => io.observe(sec));
  }

  function itemCard(item) {
    const hasVariants = Array.isArray(item.variants) && item.variants.length;
    const hasAddons = Array.isArray(item.addons) && item.addons.length;

    const priceHtml = hasVariants
      ? ''
      : (item.price != null ? `<div class="price">${fmtPrice(item.price)}</div>` : (item.priceNote ? `<div class="price">${t(item.priceNote)}</div>` : ''));

    const variantsHtml = hasVariants
      ? `<ul class="options">${item.variants.map(v => `<li>${t(v.label)} — <strong>${fmtPrice(v.price)}</strong></li>`).join('')}</ul>`
      : '';

    const addonsHtml = hasAddons
      ? `<div class="addons"><span class="muted">Add-ons:</span> ${
          item.addons.map(a => `<span class="chip">${t(a.name)} +${fmtPrice(a.price)}</span>`).join(' ')
        }</div>`
      : '';

    return `
      <article class="card" id="item-${item.id}">
        <img src="${imagePath(item.image)}" alt="${t(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder.jpg';" />
        <div>
          <div class="item-head">
            <h4 class="item-title">${t(item.name)}</h4>
            ${priceHtml}
          </div>
          ${item.description ? `<p class="desc">${t(item.description)}</p>` : ''}
          ${variantsHtml}
          ${addonsHtml}
        </div>
      </article>
    `;
  }

  function renderCategory(cat) {
    const root = document.createElement('section');
    root.className = 'section';
    root.id = cat.id;

    const noteHtml = cat.note ? `<div class="note">${t(cat.note)}</div>` : '';
    root.innerHTML = `
      <h2>${t(cat.title)}</h2>
      ${noteHtml}
    `;

    if (cat.id === 'good-morning') {
      const noteEl = root.querySelector('.note') || root.appendChild(document.createElement('div'));
      noteEl.classList.add('note');
      breakfastBadge(noteEl);
    }

    // Regular items
    if (Array.isArray(cat.items)) {
      const grid = document.createElement('div');
      grid.className = 'grid';
      grid.innerHTML = cat.items.map(itemCard).join('');
      root.appendChild(grid);
    }

    // Grouped items (e.g., Drinks)
    if (Array.isArray(cat.groups)) {
      cat.groups.forEach(gr => {
        const group = document.createElement('div');
        group.className = 'group';
        group.innerHTML = `<h3>${t(gr.title)}</h3>`;
        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.innerHTML = (gr.items || []).map(itemCard).join('');
        group.appendChild(grid);
        root.appendChild(group);
      });
    }

    return root;
  }

  function renderAll() {
    // Header text (from data, future i18n-ready)
    $('#brand-name').textContent = t(menuData.meta.restaurant);
    $('#brand-subtitle').textContent = t(menuData.meta.subtitle);
    $('#open-daily').textContent = t(menuData.meta.openDaily);

    const cats = menuData.categories;
    renderNav(cats);

    const root = $('#menu-root');
    root.innerHTML = '';
    cats.forEach(cat => root.appendChild(renderCategory(cat)));
  }

  // Language switch
  function setupLangSwitch() {
    const select = $('#lang');
    select.value = state.lang;
    select.addEventListener('change', () => {
      state.lang = select.value;
      localStorage.setItem('lang', state.lang);
      renderAll();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupLangSwitch();
    renderAll();
    setOpenStatus();
    setInterval(setOpenStatus, 60 * 1000);
  });
})();
