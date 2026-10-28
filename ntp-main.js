(() => {
  'use strict';
  if (!/^\/edge\/(?:ntp|newtab)(?:\/|$)/i.test(location.pathname)) return;
  // MSN's search web component owns the server-provided trending suggestion.
  // Clear its suggestion properties only; never touch its value or input field.
  function clean(root) {
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'cs-common-search-box') {
        if (el.contextualSuggestionText) el.contextualSuggestionText = '';
        if (el.contextualSuggestionSlug) el.contextualSuggestionSlug = '';
        if (Array.isArray(el.contextualSuggestionList) && el.contextualSuggestionList.length) el.contextualSuggestionList = [];
        if (el.options && el.options.enableContextualSuggest === true) el.options.enableContextualSuggest = false;
      }
      if (el.shadowRoot) clean(el.shadowRoot);
    }
  }
  function run() { try { clean(document); } catch (_) { /* Retry after hydration. */ } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  setInterval(run, 500);
})();
