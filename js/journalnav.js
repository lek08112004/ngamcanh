// The journal's tabs: one pane shown at a time, the others hidden (not rendered, not read aloud).
// Navigation is separate from the content: each pane fills itself when it is shown (onShow).
// Keyboard: ←/→ (or Home/End) move between tabs when a tab has focus, as the ARIA tabs pattern asks.
export function createJournalNav(root, { onShow = () => {} } = {}) {
  const tabs = [...root.querySelectorAll('.jnav [role="tab"]')];
  const panes = new Map([...root.querySelectorAll('.jpane')].map((p) => [p.dataset.tab, p]));
  let current = '';
  function show(id, focusTab = false) {
    if (!panes.has(id)) id = 'trip';
    current = id;
    for (const t of tabs) {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus({ preventScroll: true });
    }
    for (const [k, p] of panes) p.hidden = k !== id;
    onShow(id);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j >= 0) { e.preventDefault(); e.stopPropagation(); show(tabs[j].dataset.tab, true); }
    });
  });
  return { show, get current() { return current; } };
}
