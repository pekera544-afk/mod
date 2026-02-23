/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    'frame-gold',
    'frame-fire',
    'frame-rainbow',
    'frame-galaxy',
    'frame-ice',
    'frame-rose',
    'frame-crystal',
    'frame-love',
    'frame-angel',
    'frame-neon',
    'frame-diamond',
    'frame-sakura',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#d4af37',
          light: '#e8cc6b',
          dark: '#a88a20'
        },
        cinema: {
          dark: '#0f0f14',
          card: '#16161e',
          border: '#252535',
          purple: '#4a2080',
          red: '#8b1a1a'
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif']
      },
      boxShadow: {
        gold: '0 0 20px rgba(212, 175, 55, 0.3)',
        'gold-lg': '0 0 40px rgba(212, 175, 55, 0.4)',
        'gold-sm': '0 0 10px rgba(212, 175, 55, 0.2)',
        purple: '0 0 20px rgba(74, 32, 128, 0.4)',
        cinema: '0 8px 32px rgba(0, 0, 0, 0.6)'
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #d4af37, #a88a20)',
        'dark-gradient': 'linear-gradient(180deg, #0f0f14 0%, #1a1a2e 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(22,22,30,0.9), rgba(15,15,20,0.95))'
      }
    }
  },
  plugins: []
};
