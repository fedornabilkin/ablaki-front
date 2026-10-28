import {fileURLToPath, URL} from 'node:url'
import {defineConfig, loadEnv} from "vite";
import vue from "@vitejs/plugin-vue";
// import terser from '@rollup/plugin-terser'; // "@rollup/plugin-terser": "0.4.4"

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.API_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:3180/';

  return {
  plugins: [
    vue()
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      // https://rollupjs.org/configuration-options/
      // plugins: [terser()],
      output: {
        manualChunks: {
          core: [
            'vue',
            'vue-router',
            'vuex',
            'pinia',
            'moment',
          ],
          network: [
            'axios',
            'vue-axios',
          ],
          utils: [],
          ui: [
            'naive-ui',
          ],
          icons: [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/vue-fontawesome',
          ],
        },
      },
    },
  },
  server: {
    watch: {
      usePolling: true
    },
    host: true,
    strictPort: true,
    port: 5173,
    proxy: {
      '/api/': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\//, '/'),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData: `@import "./src/assets/scss/main.scss";`
      }
    }
  }
  };
})
