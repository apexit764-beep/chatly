/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        whatsapp: '#25D366',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        bg: {
          light: '#F8F9FC',
          dark: '#0F1117',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A1D27',
        },
        sidebar: {
          light: '#F1F3F9',
          dark: '#13151D',
        },
        border: {
          light: '#E5E7EB',
          dark: '#2D3148',
        },
        muted: {
          light: '#6B7280',
          dark: '#8B92A9',
        },
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.4)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
