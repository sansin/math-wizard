/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFD700',    // Bright Yellow
        secondary: '#00BFFF',  // Deep Sky Blue
        accent: '#FF69B4',     // Hot Pink
        success: '#90EE90',    // Light Green
        warning: '#FFA500',    // Orange
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.5s ease-out',
        'bounce-slow': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
}
