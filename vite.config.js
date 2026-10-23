import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const host = env.PUBLIC_SITE_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '')
  const socialImage = host ? new URL('/social-card.png', host).href : '/social-card.png'
  return { plugins: [react(), {
    name: 'dearly-social-card',
    transformIndexHtml: (html) => html.replaceAll('__SOCIAL_IMAGE__', socialImage.replaceAll('&', '&amp;').replaceAll('"', '&quot;')),
  }] }
})
