import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', headless: true, viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
    reuseExistingServer: false,
  },
})
