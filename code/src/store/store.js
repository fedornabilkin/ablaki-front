import { createStore } from 'vuex';
import { auth } from './auth';
import { menu } from './menu';

const store = createStore({
    modules: {
        auth,
        menu
    }
});

export { store };