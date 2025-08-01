import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
// import terser from '@rollup/plugin-terser'; // "@rollup/plugin-terser": "0.4.4"

export default defineConfig({
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
            'element-plus',
            // 'bootstrap',
            // 'bootstrap-vue',
            // 'bootstrap-vue-3',
          ],
          icons: [
            '@element-plus/icons-vue',
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
    port: 5173
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
})