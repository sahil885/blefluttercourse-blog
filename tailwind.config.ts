import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#cbd5e1',
            'h1,h2,h3,h4': { color: '#f1f5f9' },
            strong: { color: '#f1f5f9' },
            code: { color: '#38bdf8' },
            a: { color: '#38bdf8' },
            blockquote: { borderLeftColor: '#0ea5e9', color: '#94a3b8' },
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
