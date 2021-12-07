import { createApp } from 'vue';
import ElementPlus from 'element-plus';

// import 'element-plus/dist/index.css';
import './index.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App.vue';
import { router } from './router';
import { store } from './store/store';
import { setupElementPlusIcons } from './plugins/element-plus-icons';

const app = createApp(App);

app.use(ElementPlus);
app.use(store);
app.use(router);

setupElementPlusIcons(app);

app.mount('#app');