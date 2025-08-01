/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // Make sure your source files are included
  ],
  theme: {
    extend: {
      colors: {
        // 🌞 Light Mode
        background: '#ffffff',
        foreground: '#0f172a',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryLight: '#dbeafe',
        success: '#10b981',
        successLight: '#d1fae5',
        destructive: '#ef4444',
        destructiveLight: '#fee2e2',
        warning: '#f59e0b',
        warningLight: '#fef3c7',
        border: '#e2e8f0',
        borderHover: '#cbd5e1',
        input: '#ffffff',
        ring: 'rgba(59, 130, 246, 0.5)',

        // 🌚 Dark Mode overrides via `dark:` variants
        dark: {
          background: '#0f172a',
          foreground: '#f8fafc',
          primary: '#60a5fa',
          primaryHover: '#3b82f6',
          primaryLight: '#1e3a8a',
          success: '#34d399',
          successLight: '#064e3b',
          destructive: '#f87171',
          destructiveLight: '#7f1d1d',
          warning: '#fbbf24',
          warningLight: '#78350f',
          border: '#334155',
          borderHover: '#475569',
          input: '#1e293b',
          ring: 'rgba(96, 165, 250, 0.5)',
        }
      },
      fontFamily: {
        primary: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        base: '14px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        cardLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        loadingPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.7' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        loadingPulse: 'loadingPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
