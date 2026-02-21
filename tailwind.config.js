/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',       // Violet 600
        'primary-light': '#8B5CF6', // Violet 500
        'primary-dark': '#6D28D9',  // Violet 700
        secondary: '#F59E0B',     // Amber 500
        accent: '#EC4899',        // Pink 500
        success: '#10B981',       // Emerald 500
        warning: '#F59E0B',       // Amber 500
        surface: '#F5F3FF',       // Violet 50 (page backgrounds)
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.4s ease-out',
        'bounce-slow': 'wizardBounce 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
