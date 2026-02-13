// assets/js/script.js
(() => {
  const PRODUCTS_URL = '/data/products.json'; // adjust if path different
  let PRODUCTS = [];
  let currentList = [];
  let activeCat = 'all';
  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('emptyState');

  // helpers
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function debounce(fn, wait=200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), wait); };
  }

  function fetchProducts() {
    return fetch(PRODUCTS_URL).then(r => {
      if(!r.ok) throw new Error('gagal load products.json');
      return r.json();
    });
  }

  function renderCard(p) {
    // produce card node
    const a = document.createElement('a');
    a.href = p.url;
    a.className = 'group card-reflection block bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden p-4 relative transition-transform duration-300 hover:-translate-y-3 hover:shadow-2xl';
    a.innerHTML = `
      <div class="relative">
        <img src="${p.img}" alt="${escapeHtml(p.name)}" class="rounded-lg object-cover w-full card-img-size" />
        <img src="${p.img}" alt="" class="reflection rounded-lg" style="width:60%;" />
      </div>
      <div class="p-4 text-center">
        <h4 class="font-semibold text-lg">${escapeHtml(p.name)}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${escapeHtml(p.price || '')}</p>
      </div>
      <div class="explore-fade"><span class="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-full font-semibold">Explore →</span></div>
    `;
    return a;
  }

  function escapeHtml(str) {
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  function renderList(list) {
    currentList = list;
    grid.innerHTML = '';
    if(!list || list.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    const frag = document.createDocumentFragment();
    list.forEach(p => frag.appendChild(renderCard(p)));
    grid.appendChild(frag);
  }

  // filtering / searching
  function filterAndSearch({ q = '', cat = 'all' } = {}) {
    q = (q || '').toLowerCase().trim();
    activeCat = cat || 'all';
    let list = PRODUCTS.slice();

    if (cat && cat !== 'all') {
      list = list.filter(p => p.category === cat);
    }

    if (q) {
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.short && p.short.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    renderList(list);
    // update URL (without reloading)
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat && cat !== 'all') params.set('cat', cat);
    const newUrl = `${location.pathname}?${params.toString()}`;
    history.replaceState(null, '', newUrl);
  }

  // UI hooks: tab buttons + inputs
  function setupUI() {
    // tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('bg-gray-200'));
        e.currentTarget.classList.add('bg-gray-200');
        const cat = e.currentTarget.dataset.cat;
        const q = getSearchValue();
        filterAndSearch({ q, cat });
      });
    });

    // mobileSearch (in shop page)
    const mobileSearch = document.getElementById('mobileSearch');
    if (mobileSearch) {
      mobileSearch.addEventListener('input', debounce((ev) => {
        const q = ev.target.value;
        const active = activeCat || 'all';
        filterAndSearch({ q, cat: active });
        const global = document.getElementById('globalSearch');
        if (global) global.value = q; // keep sync
      }, 220));
    }

    // globalSearch (navbar) — if used from other pages, will redirect to shop.html?q=...
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
      // initialize from URL param q if present
      const qParam = qs('q') || qs('search') || '';
      if (qParam) globalSearch.value = qParam;

      globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          // If not on shop page → navigate to shop.html with query
          if (!location.pathname.endsWith('shop.html')) {
            const url = `shop.html?q=${encodeURIComponent(q)}`;
            location.href = url;
            return;
          }
          // if on shop page, just apply filter
          filterAndSearch({ q, cat: activeCat || 'all' });
        }
      });

      // live update (debounced) while on shop page
      globalSearch.addEventListener('input', debounce((ev) => {
        const q = ev.target.value;
        // if not on shop page, do nothing (user likely intends to press Enter)
        if (!location.pathname.endsWith('shop.html')) return;
        // sync mobile input if exists
        const mobile = document.getElementById('mobileSearch');
        if (mobile) mobile.value = q;
        filterAndSearch({ q, cat: activeCat || 'all' });
      }, 220));
    }

    // If the page was opened with URL params, apply them
    const urlQ = qs('q') || '';
    const urlCat = qs('cat') || 'all';
    // mark active tab
    const defaultTab = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.dataset.cat === (urlCat || 'all'));
    if (defaultTab) {
      document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('bg-gray-200'));
      defaultTab.classList.add('bg-gray-200');
    } else {
      // default mark 'all'
      const allBtn = document.querySelector('.tab-btn[data-cat="all"]');
      if (allBtn) allBtn.classList.add('bg-gray-200');
    }

    // initial filter
    if (urlQ || urlCat) {
      // set input values
      if (globalSearch) globalSearch.value = urlQ;
      if (mobileSearch) mobileSearch.value = urlQ;
      filterAndSearch({ q: urlQ, cat: urlCat });
    } else {
      filterAndSearch({ q: '', cat: 'all' });
    }
  }

  // utility: if not on shop page and global search typed -> redirect
  function attachGlobalSearchRedirect() {
    // For pages other than shop.html we expect the navbar to have #globalSearch.
    const gx = document.getElementById('globalSearch');
    if (!gx) return;
    gx.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !location.pathname.endsWith('shop.html')) {
        const q = e.target.value.trim();
        location.href = `shop.html?q=${encodeURIComponent(q)}`;
      }
    });
  }

  // init
  fetchProducts().then(data => {
    PRODUCTS = data;
    // only render when DOM ready and UI set up
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupUI);
    } else {
      setupUI();
    }
  }).catch(err => {
    console.error('Failed loading products.json', err);
    grid.innerHTML = '<div class="col-span-4 text-center text-red-500">Gagal memuat data produk.</div>';
  });

  // small helper: keep redirect behavior if navbar search used from other pages
  document.addEventListener('DOMContentLoaded', () => {
    attachGlobalSearchRedirect();
  });

})();
