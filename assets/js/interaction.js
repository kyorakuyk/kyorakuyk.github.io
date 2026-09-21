document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const splashQuote = document.querySelector('.splash-quote');
  
  // 1. Splash Screen Transition
  function exitSplash() {
    if (body.classList.contains('state-splash')) {
      body.classList.remove('state-splash');
      body.classList.add('state-sidebar');
    }
  }

  if (splashQuote) {
    splashQuote.addEventListener('click', exitSplash);
  }

  window.addEventListener('wheel', (e) => {
    if (body.classList.contains('state-splash') && window.innerWidth > 768) {
      exitSplash();
    }
  }, { passive: true });

  // 2. Scroll Jacking between Hero and Notes views
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

  const mainContent = document.getElementById('main-content');
  
  mainContent.addEventListener('wheel', (e) => {
    if (!body.classList.contains('is-home')) return; 
    if (window.innerWidth <= 768) return; 
    if (body.classList.contains('state-splash')) return;

    const isViewNotesActive = body.classList.contains('view-notes-active');
    const viewNotes = document.getElementById('view-notes');
    
    if (isViewNotesActive && viewNotes.scrollTop > 0) {
      return; 
    }

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

  document.addEventListener('click', (e) => {
    const btnReadNotes = e.target.closest('#btn-read-notes');
    if (btnReadNotes && body.classList.contains('is-home')) {
      e.preventDefault();
      exitSplash();
      switchView(true);
    }

    const navNotesLink = e.target.closest('.nav-notes');
    if (navNotesLink && body.classList.contains('is-home')) {
      e.preventDefault();
      exitSplash();
      switchView(true);
    }
  });

  // 3. Pjax Seamless Page Transitions
  const cache = new Map();

  async function loadPage(url) {
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
        
        if (url === '/' || url.endsWith('/')) {
            body.classList.remove('state-splash');
            body.classList.add('state-sidebar');
        }

        window.scrollTo(0, 0);
        mainContent.scrollTo(0, 0);
        
                if (window.initTagFilter) window.initTagFilter();
        
        // Auto open notes view if navigated to /#notes
        if ((url === '/' || url.endsWith('/')) && window.location.hash === '#notes') {
          setTimeout(() => {
            if (typeof switchView === 'function') switchView(true);
          }, 400); // Wait for fade in
        }
        
        mainContent.style.opacity = '1';
      }
    } catch (error) {
      console.error('Pjax failed:', error);
      window.location.href = url;
    }
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || link.hostname !== window.location.hostname || link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    
    // Ignore pure hash links on the same page
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(link.href);
        if (currentUrl.pathname === targetUrl.pathname && targetUrl.hash) return;
    if (targetUrl.pathname.endsWith('.xml')) return;

    if (link.href !== window.location.href) {
      e.preventDefault();
      window.history.pushState({ url: link.href }, '', link.href);
      loadPage(link.href);
    }
  });

  window.addEventListener('popstate', () => {
    loadPage(window.location.href);
  });

  // 4. Sidebar Drag / Swipe to Reveal
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    function onDragStart(e) {
      if (!body.classList.contains('state-splash')) return;
      isDragging = true;
      startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      sidebar.style.transition = 'none';
    }

    function onDragMove(e) {
      if (!isDragging) return;
      currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff < 0) {
        const newWidth = Math.max(280, window.innerWidth + diff);
        sidebar.style.width = newWidth + 'px';
      }
    }

    function onDragEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      sidebar.style.transition = 'width 0.7s cubic-bezier(0.77, 0, 0.175, 1)';
      sidebar.style.width = '';
      if (currentX - startX < -100) {
        exitSplash();
      }
    }

    sidebar.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    sidebar.addEventListener('touchstart', onDragStart, {passive: true});
    window.addEventListener('touchmove', onDragMove, {passive: true});
    window.addEventListener('touchend', onDragEnd);
  }
});

