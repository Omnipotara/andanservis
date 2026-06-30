import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#111214',
        asphalt: '#1c1f23',
        steel: '#87909b',
        ember: '#d9232e',
        copper: '#b56a2c',
        mint: '#5fb49c',
        paper: '#f5f1ea',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 18px 60px rgba(0, 0, 0, 0.28)',
      },
    },
  },
  plugins: [],
} satisfies Config;
