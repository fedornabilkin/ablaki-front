import {createApp} from 'vue';
import {createPinia} from 'pinia';

import 'element-plus/dist/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss';
import App from './App.vue';
import {router} from './router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import {store} from './store/store';

const app = createApp(App);

for (const [key, value] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, value);
}


app
  .use(createPinia())
  .use(router)
  .use(ElementPlus)
  .use(store)

app.mount('#app');