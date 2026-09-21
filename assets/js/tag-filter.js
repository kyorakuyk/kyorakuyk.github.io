window.initTagFilter = function() {
  const tagList = document.getElementById('tag-list');
  if (!tagList) return; // Only run on pages with tag filters

  const tagButtons = tagList.querySelectorAll('.tag-btn');
  const postItems = document.querySelectorAll('.post-list__item');
  const toggleModeBtn = document.getElementById('toggle-filter-mode');
  
  let selectedTags = new Set();
  let isAndMode = true; // true = AND (交集), false = OR (并集)

  function updateFilter() {
    const activeTags = Array.from(selectedTags);

    postItems.forEach(item => {
      const itemTagsAttr = item.getAttribute('data-tags');
      const itemTags = itemTagsAttr ? itemTagsAttr.split(',') : [];
      
      let isVisible = true;

      if (activeTags.length > 0) {
        if (isAndMode) {
          // 交集: item 必须包含所有 activeTags
          isVisible = activeTags.every(tag => itemTags.includes(tag));
        } else {
          // 并集: item 包含任意一个 activeTags 即可
          isVisible = activeTags.some(tag => itemTags.includes(tag));
        }
      }

      if (isVisible) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        btn.classList.remove('active');
      } else {
        selectedTags.add(tag);
        btn.classList.add('active');
      }
      
      updateFilter();
    });
  });

  if (toggleModeBtn) {
    // Remove old listeners to avoid duplicates on pjax load
    const newBtn = toggleModeBtn.cloneNode(true);
    toggleModeBtn.parentNode.replaceChild(newBtn, toggleModeBtn);
    
    newBtn.addEventListener('click', () => {
      isAndMode = !isAndMode;
      newBtn.textContent = isAndMode ? 'AND (交集)' : 'OR (并集)';
      updateFilter();
    });
  }
};

document.addEventListener('DOMContentLoaded', window.initTagFilter);
