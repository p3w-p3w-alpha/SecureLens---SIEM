/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        void: {
          DEFAULT: '#06060a',
          surface: '#0c0c14',
          raised: '#12121e',
        },
        ice: {
          DEFAULT: '#7dd3fc',
          dim: 'rgba(125,211,252,0.25)',
        },
        frost: '#e2e8f0',
        mist: '#64748b',
        ghost: '#1e293b',
        sev: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
          info: '#64748b',
        },
      },
      boxShadow: {
        'ice-glow': '0 0 20px rgba(125,211,252,0.1)',
        'ice-strong': '0 0 30px rgba(125,211,252,0.2)',
        'ember-glow': '0 0 20px rgba(239,68,68,0.15)',
      },
      animation: {
        'drift': 'drift 20s linear infinite',
        'scanline': 'scanline 1.5s ease-in-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
          '100%': { transform: 'translateY(0) translateX(0)' },
        },
        scanline: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
