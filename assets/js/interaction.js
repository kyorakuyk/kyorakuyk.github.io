document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');

  // ==========================================================================
  // 1. Splash Screen Transition
  // ==========================================================================
  function exitSplash() {
    if (body.classList.contains('state-splash')) {
      body.classList.remove('state-splash');
      body.classList.add('state-sidebar');
    }
  }

  // Scroll wheel exits splash
  window.addEventListener('wheel', () => {
    if (body.classList.contains('state-splash') && window.innerWidth > 768) {
      exitSplash();
    }
  }, { passive: true });

  // ==========================================================================
  // 2. Scroll Jacking between Hero and Notes views (Home page only)
  // ==========================================================================
  let isAnimating = false;
  let accumulatedDelta = 0;
  const SCROLL_THRESHOLD = 80;

  function switchView(toNotes) {
    if (isAnimating) return;
    if (toNotes) {
      body.classList.add('view-notes-active');
    } else {
      body.classList.remove('view-notes-active');
    }
    isAnimating = true;
    setTimeout(() => {
      isAnimating = false;
      accumulatedDelta = 0;
    }, 800);
  }

  if (mainContent) {
    mainContent.addEventListener('wheel', (e) => {
      if (!body.classList.contains('is-home')) return;
      if (window.innerWidth <= 768) return;
      if (body.classList.contains('state-splash')) return;

      const isViewNotesActive = body.classList.contains('view-notes-active');
      const viewNotes = document.getElementById('view-notes');

      if (isViewNotesActive && viewNotes && viewNotes.scrollTop > 0) return;

      if (!isViewNotesActive || (isViewNotesActive && e.deltaY < 0)) {
        e.preventDefault();
        accumulatedDelta += e.deltaY;
        if (accumulatedDelta > SCROLL_THRESHOLD && !isViewNotesActive) {
          switchView(true);
        } else if (accumulatedDelta < -SCROLL_THRESHOLD && isViewNotesActive) {
          switchView(false);
        }
      }
    }, { passive: false });
  }

  // ==========================================================================
  // 3. Click handlers (event delegation for Pjax compatibility)
  // ==========================================================================
  document.addEventListener('click', (e) => {
    // "Read the notes" button
    const btnReadNotes = e.target.closest('#btn-read-notes');
    if (btnReadNotes && body.classList.contains('is-home')) {
      e.preventDefault();
      exitSplash();
      setTimeout(() => switchView(true), 100);
      return;
    }

    // Notes nav link — should exit splash and switch to notes view directly
    const navNotesLink = e.target.closest('.nav-notes');
    if (navNotesLink) {
      e.preventDefault();
      if (body.classList.contains('is-home')) {
        // Already on home page, just exit splash and switch view
        exitSplash();
        setTimeout(() => switchView(true), 100);
      } else {
        // On another page, use Pjax to load home, then switch to notes
        const homeUrl = navNotesLink.href.split('#')[0] || '/';
        window.history.pushState({ url: homeUrl }, '', homeUrl);
        loadPage(homeUrl, true); // pass flag to auto-switch to notes
      }
      return;
    }
  });

  // ==========================================================================
  // 4. Pjax Seamless Page Transitions
  // ==========================================================================
  const cache = new Map();

  async function loadPage(url, autoSwitchToNotes) {
    if (!mainContent) return;
    mainContent.style.opacity = '0';

    try {
      let html;
      if (cache.has(url)) {
        html = cache.get(url);
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        html = await response.text();
        cache.set(url, html);
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newMain = doc.getElementById('main-content');

      await new Promise(resolve => setTimeout(resolve, 300));

      if (newMain) {
        mainContent.innerHTML = newMain.innerHTML;
        document.title = doc.title;
        body.className = doc.body.className;

        // Never re-enter splash via Pjax
        body.classList.remove('state-splash');
        body.classList.add('state-sidebar');

        mainContent.scrollTo(0, 0);

        if (window.initTagFilter) window.initTagFilter();

        mainContent.style.opacity = '1';

        // If we came from Notes link, auto-switch to notes view after content loads
        if (autoSwitchToNotes && body.classList.contains('is-home')) {
          setTimeout(() => switchView(true), 400);
        }
      }
    } catch (error) {
      console.error('Pjax failed:', error);
      window.location.href = url;
    }
  }

  // Intercept link clicks for Pjax
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.hostname !== window.location.hostname) return;
    if (link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    // Skip .nav-notes — handled above
    if (link.classList.contains('nav-notes')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const targetUrl = new URL(link.href);
    const currentUrl = new URL(window.location.href);

    // Skip XML files (RSS feed)
    if (targetUrl.pathname.endsWith('.xml')) return;

    // Skip same-page hash links
    if (currentUrl.pathname === targetUrl.pathname && targetUrl.hash) return;

    if (link.href !== window.location.href) {
      e.preventDefault();
      window.history.pushState({ url: link.href }, '', link.href);
      loadPage(link.href, false);
    }
  });

  window.addEventListener('popstate', () => {
    loadPage(window.location.href, false);
  });

  // ==========================================================================
  // 5. Sidebar Drag / Swipe with Velocity Detection
  // ==========================================================================
  if (sidebar) {
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let isDragging = false;
    let isSidebarState = false; // keep track of start state

    function enterSplash() {
      body.classList.add('state-splash');
      body.classList.remove('state-sidebar');
      // Always reset view to hero when opening splash
      switchView(false);
    }

    function onDragStart(e) {
      // Don't start drag on interactive elements
      if (e.target.closest('a, button')) return;

      isDragging = true;
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      startX = clientX;
      lastX = clientX;
      lastTime = Date.now();
      velocity = 0;
      isSidebarState = !body.classList.contains('state-splash');
      sidebar.style.transition = 'none';
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const now = Date.now();
      const dt = now - lastTime;

      // Track velocity (px/ms)
      if (dt > 0) {
        velocity = (clientX - lastX) / dt;
      }
      lastX = clientX;
      lastTime = now;

      const diff = clientX - startX;
      
      if (!isSidebarState) {
        // We are in state-splash (full width). Can only drag left (diff < 0)
        if (diff < 0) {
          const newWidth = Math.max(280, window.innerWidth + diff);
          sidebar.style.width = newWidth + 'px';
        }
      } else {
        // We are in state-sidebar (280px). Can only drag right (diff > 0)
        if (diff > 0) {
          const newWidth = Math.min(window.innerWidth, 280 + diff);
          sidebar.style.width = newWidth + 'px';
        }
      }
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      sidebar.style.transition = 'width 0.7s cubic-bezier(0.77, 0, 0.175, 1)';
      sidebar.style.width = ''; // Let CSS take over

      const diff = lastX - startX;
      
      if (!isSidebarState) {
        // Exit splash if dragged far enough left OR flicked fast enough
        if (diff < -80 || velocity < -0.5) {
          exitSplash();
        }
      } else {
        // Enter splash if dragged far enough right OR flicked fast enough
        if (diff > 80 || velocity > 0.5) {
          enterSplash();
        }
      }
    }

    sidebar.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    sidebar.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('touchmove', onDragMove, { passive: true });
    window.addEventListener('touchend', onDragEnd);
  }
});
