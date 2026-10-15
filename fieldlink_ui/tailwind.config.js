/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Grotesque display + humanist sans: utilitarian, high-contrast pairing.
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // FieldLink palette: paper white + green (#EAF9E7 #C0E6BA #4CA771 #013237) + a touch of blue.
        paper: '#FBFDF9',
        ink: {
          DEFAULT: '#0B2B26',
          soft: '#4E726B',
        },
        line: '#D9E6D4',
        navy: {
          DEFAULT: '#013237',
          deep: '#012A2E',
        },
        brand: {
          DEFAULT: '#4CA771',
          foreground: '#FFFFFF',
          soft: '#EAF9E7',
        },
        mint: '#C0E6BA',
        accent: {
          DEFAULT: '#2B7CD3',
          soft: '#E9F1FC',
        },
        glass: '#FFFFFF',
        // `teal` utilities are used across the app; remapped to the FieldLink
        // green scale so every existing teal-* class renders the new identity.
        teal: {
          50: '#EAF9E7', 100: '#D9F0D3', 200: '#C0E6BA', 300: '#93D3A0',
          400: '#67BC7F', 500: '#4CA771', 600: '#3E8F62', 700: '#2F7350',
          800: '#16473A', 900: '#013237', 950: '#01262A',
        },
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        rise: 'rise 0.6s cubic-bezier(0.32, 0.72, 0, 1) both',
      },
      boxShadow: {
        lift: '0 20px 60px -30px rgba(1, 50, 55, 0.35)',
      },
    },
  },
  plugins: [],
};
