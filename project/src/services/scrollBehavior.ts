import type { RouterScrollBehavior } from 'vue-router';

export const scrollBehavior: RouterScrollBehavior = (to, from, saved) => {
  if (saved) return saved;
  if (to.path === from.path) return false;
  return {top: 0};
};
