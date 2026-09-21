document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const splashQuote = document.querySelector('.splash-quote');
  const btnReadNotes = document.getElementById('btn-read-notes');
  

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

  // Also exit splash if user scrolls
  window.addEventListener('wheel', (e) => {
    if (body.classList.contains('state-splash') && window.innerWidth > 768) {
      exitSplash();
    }
  }, { passive: true });

  // 2. Scroll Jacking between Hero and Notes views (Only on Home Page and Desktop)
  let isAnimating = false;
  let accumulatedDelta = 0;
  const SCROLL_THRESHOLD = 80; // The threshold of accumulated scroll delta to trigger switch

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
    }, 800); // match CSS transition duration
  }

  const mainContent = document.getElementById('main-content');
  
  mainContent.addEventListener('wheel', (e) => {
    if (!body.classList.contains('is-home')) return; // Only scroll-jack on home
    if (window.innerWidth <= 768) return; // Disable on mobile
    if (body.classList.contains('state-splash')) return;

    const isViewNotesActive = body.classList.contains('view-notes-active');
    const viewNotes = document.getElementById('view-notes');
    
    // If we are in notes view, and we are not at the top of the notes view, let normal scroll happen
    if (isViewNotesActive && viewNotes.scrollTop > 0) {
      return; 
    }

    // Prevent default to hijack
    if (!isViewNotesActive || (isViewNotesActive && e.deltaY < 0)) {
      e.preventDefault();
      
      accumulatedDelta += e.deltaY;

      if (accumulatedDelta > SCROLL_THRESHOLD && !isViewNotesActive) {
        switchView(true); // scroll down to notes
      } else if (accumulatedDelta < -SCROLL_THRESHOLD && isViewNotesActive) {
        switchView(false); // scroll up to hero
      }
    }
  }, { passive: false });

  // Use event delegation for buttons that might be replaced by Pjax
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#btn-read-notes');
    if (target && body.classList.contains('is-home')) {
      e.preventDefault();
      exitSplash();
      switchView(true);
    }
  });

  // Delegate clicks for .nav-notes
  document.addEventListener('click', (e) => {
    const navNotesLink = e.target.closest('.nav-notes');
    if (navNotesLink && body.classList.contains('is-home')) {
      e.preventDefault();
      exitSplash();
      switchView(true);
    }
  });
    });
  }

  // ==========================================================================
  // 3. Pjax Seamless Page Transitions (无刷新淡入淡�?
  // ==========================================================================
  
  const mainContent = document.getElementById('main-content');
  const cache = new Map();

  async function loadPage(url) {
    // 1. Fade out current content
    mainContent.style.opacity = '0';
    
    try {
      let html;
      if (cache.has(url)) {
        html = cache.get(url);
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        html = await response.text();
        cache.set(url, html);
      }

      // 2. Parse new HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newMain = doc.getElementById('main-content');
      
      // 3. Wait for fade out transition (approx 300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 4. Update DOM and Document Title
      if (newMain) {
        mainContent.innerHTML = newMain.innerHTML;
        document.title = doc.title;
        
        // Update body classes for state management
        body.className = doc.body.className;
        // Ensure sidebar state is correct when navigating via Pjax
        if (url === '/' || url.endsWith('/')) {
            // If going back to home, we might not want the splash screen again, 
            // but the parsed body might have it. Let's strip state-splash if we already exited it.
            body.classList.remove('state-splash');
            body.classList.add('state-sidebar');
        }

        // 5. Scroll to top
        window.scrollTo(0, 0);
        mainContent.scrollTo(0, 0);
        
        // 6. Re-bind dynamic scripts for the new view (e.g. tag filters)
        if (window.initTagFilter) {
          window.initTagFilter();
        }

        // 7. Fade in
        mainContent.style.opacity = '1';
      }
    } catch (error) {
      console.error('Pjax load failed:', error);
      window.location.href = url; // Fallback to normal navigation
    }
  }

  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    
    // Ignore non-links, external links, anchor links, and modifier clicks
    if (!link) return;
    if (link.hostname !== window.location.hostname) return;
    if (link.getAttribute('href').startsWith('#')) return;
    if (link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    const url = link.href;
    
    // Only push state if URL is different
        // Ignore if it's the exact same path and just different hash
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(url);
    if (currentUrl.pathname === targetUrl.pathname && targetUrl.hash) {
      // Just a hash jump on the same page, do not pjax
      return;
    }
    
    if (url !== window.location.href) {
      window.history.pushState({ url: url }, '', url);
      loadPage(url);
    }
  });

  // Handle browser Back/Forward buttons
  window.addEventListener('popstate', (e) => {
    loadPage(window.location.href);
  });


  // ==========================================================================
  // 4. Sidebar Drag / Swipe to Reveal (Desktop & Mobile)
  // ==========================================================================
  const sidebar = document.getElementById('sidebar');
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  function onDragStart(e) {
    if (!body.classList.contains('state-splash')) return;
    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    sidebar.style.transition = 'none'; // Disable transition while dragging
  }

  function onDragMove(e) {
    if (!isDragging) return;
    currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Only allow dragging left
    if (diff < 0) {
      // Calculate width percentage based on drag
      const newWidth = Math.max(280, window.innerWidth + diff);
      sidebar.style.width = newWidth + 'px';
    }
  }

  function onDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    sidebar.style.transition = 'width 0.7s cubic-bezier(0.77, 0, 0.175, 1)';
    sidebar.style.width = ''; // Reset inline style
    
    const diff = currentX - startX;
    // If dragged more than 100px left, exit splash
    if (diff < -100) {
      exitSplash();
    }
  }

  sidebar.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  
  sidebar.addEventListener('touchstart', onDragStart, {passive: true});
  window.addEventListener('touchmove', onDragMove, {passive: true});
  window.addEventListener('touchend', onDragEnd);

});


