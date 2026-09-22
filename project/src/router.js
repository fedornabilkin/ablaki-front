import { createRouter, createWebHistory } from 'vue-router';
import { store } from './store/store';
import { createAuthGuard } from './services/authGuard';
import { routes } from './routes';
import { scrollBehavior } from './services/scrollBehavior';
const router = createRouter({ history: createWebHistory(), routes, scrollBehavior });
router.beforeEach(createAuthGuard(store));
export { router };
