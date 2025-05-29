/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 기본 sans 폰트 설정 (영문+한글 혼합)
        sans: [
          'var(--font-geist-sans)', 
          'var(--font-noto-sans-kr)', 
          'ui-sans-serif', 
          'system-ui', 
          'sans-serif'
        ],
        // 한글 중심 폰트
        korean: ['var(--font-noto-sans-kr)', 'sans-serif'],
        // 영문 전용 폰트
        geist: ['var(--font-geist-sans)', 'sans-serif'],
        // 고정폭 폰트
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#333',
            strong: {
              fontWeight: '700',
            },
            a: {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
          },
        },
      },
      // 그리드 컬럼 확장 (5, 6 컬럼 추가)
      gridTemplateColumns: {
        '5': 'repeat(5, minmax(0, 1fr))',
        '6': 'repeat(6, minmax(0, 1fr))',
      },
      // 컬럼 확장 (masonry 레이아웃용)
      columns: {
        '5': '5',
        '6': '6',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      };
      addUtilities(newUtilities);
    }
  ],
  // 5, 6 컬럼 그리드 클래스를 safelist에 추가하여 빌드 시 포함되도록 함
  safelist: [
    'grid-cols-5',
    'grid-cols-6',
    'columns-5',
    'columns-6'
  ]
}; 