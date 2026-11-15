import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function buildCsp(apiUrl) {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiUrl}`,
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

function devCsp(apiUrl) {
  return [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ws: wss: ${apiUrl}`,
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const apiUrl = env.VITE_API_URL || 'https://localhost:5000'

  return {
    plugins: [
      react(),
      {
        name: 'csp-meta',
        apply: 'build',
        transformIndexHtml(html) {
          return html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${buildCsp(apiUrl)}" />`,
          )
        },
      },
    ],
    server: {
      headers: {
        'Content-Security-Policy': devCsp(apiUrl),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
      // npm run test:report also writes JUnit results; the fixed hostname keeps the PC name out of the file
      ...(mode === 'report' && {
        reporters: ['default', ['junit', { hostname: 'hustlehub' }]],
        outputFile: { junit: '../evidence/frontend-tests.xml' },
      }),
    },
    preview: {
  headers: {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self'; connect-src 'self' https://localhost:5000; " +
      "object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  },
},
  }
})
