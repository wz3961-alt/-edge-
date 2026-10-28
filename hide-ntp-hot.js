(() => {
  'use strict';
  if (!/^\/edge\/(?:ntp|newtab)(?:\/|$)/i.test(location.pathname)) return;
  const exact = value => /^今日热点\s*[:：]?$/.test((value || '').trim());
  const observed = new WeakSet();
  function visit(root) {
    if (!root) return;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) watch(el.shadowRoot);
      const ownText = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      if (!exact(ownText) && !exact(el.getAttribute('aria-label')) && !exact(el.getAttribute('title'))) continue;
      const button = el.closest('button, [role="button"], a');
      const target = button || el;
      if (target.matches('input, form, cs-common-search-box, common-search-box-edgenext')) continue;
      target.style.setProperty('display', 'none', 'important');
    }
  }
  function watch(root) {
    if (observed.has(root)) return;
    observed.add(root);
    visit(root);
    new MutationObserver(() => visit(root)).observe(root, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title']});
  }
  function discover(root) {
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { watch(el.shadowRoot); discover(el.shadowRoot); }
  }
  if (document.documentElement) watch(document);
  else new MutationObserver((_, observer) => { if (document.documentElement) { observer.disconnect(); watch(document); } }).observe(document, {childList: true});
  setInterval(() => discover(document), 3000);
})();
