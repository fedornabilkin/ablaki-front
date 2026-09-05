import { createRouter, createWebHistory } from 'vue-router';
import { store } from './store/store';
import { createAuthGuard } from './services/authGuard';
import { routes } from './routes';
const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) });
router.beforeEach(createAuthGuard(store));
export { router };
