import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'api/**/*.test.js'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/hooks/**', 'src/contexts/**', 'api/_lib/**'],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GymBrAIn',
        short_name: 'GymBrAIn',
        description: 'Workout tracking PWA with AI assistance',
        theme_color: '#6B8E6B',
        background_color: '#6B8E6B',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Google Fonts CSS - CacheFirst (font stylesheets)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts Files - CacheFirst (woff2, woff files)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Exercise library - CacheFirst (large reference data, changes infrequently)
            urlPattern: /^https?:\/\/.*\/api\/exercises$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-exercises',
              expiration: {
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Workouts GET - NetworkFirst (prefer fresh, fall back to cache)
            urlPattern: /^https?:\/\/.*\/api\/workouts(\?.*)?$/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-workouts',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Templates GET - NetworkFirst
            urlPattern: /^https?:\/\/.*\/api\/templates$/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-templates',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Stats endpoints - NetworkOnly (computed data, no cache)
            urlPattern: /^https?:\/\/.*\/api\/stats\/.*/,
            handler: 'NetworkOnly',
          },
          {
            // Auth endpoints - NetworkOnly (security)
            urlPattern: /^https?:\/\/.*\/api\/auth\/.*/,
            handler: 'NetworkOnly',
          },
          {
            // AI endpoints - NetworkOnly (real-time, rate-limited)
            urlPattern: /^https?:\/\/.*\/api\/ai\/.*/,
            handler: 'NetworkOnly',
          },
        ],
        // Exclude mutations from service worker (client sync manager handles offline)
        navigateFallback: null,
      },
      devOptions: {
        enabled: true, // Enable SW in dev mode for testing
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  server: {
    // Use default Vite port (5173) to avoid conflict with Vercel dev (port 3000)
    port: 5173,
    // Proxy API requests to Vercel dev server
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
