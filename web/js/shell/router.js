/** In-memory router for the six workspaces plus utility routes. */
export function createRouter({routes, initial}) {
  const listeners = new Set();
  const history = [];
  let current = {name: initial, params: {}};
  const same = (a, b) => a.name === b.name && JSON.stringify(a.params) === JSON.stringify(b.params);
  function emit(previous) { for (const fn of listeners) fn(current, previous); }
  return {
    get current() { return current; },
    routes,
    navigate(name, params = {}) {
      if (!routes.includes(name)) throw new Error(`Unknown workspace: ${name}`);
      const next = {name, params};
      if (same(next, current)) return false;
      history.push(current);
      if (history.length > 30) history.shift();
      const previous = current;
      current = next;
      emit(previous);
      return true;
    },
    back() {
      const previous = history.pop();
      if (!previous) return false;
      const old = current;
      current = previous;
      emit(old);
      return true;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
