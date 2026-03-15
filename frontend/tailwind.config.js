/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BeSQL dark theme design tokens
        bg:      '#0d1117',
        surface: '#161b22',
        border:  '#30363d',
        accent:  '#388bfd',
        green:   '#3fb950',
        red:     '#f85149',
        yellow:  '#d29922',
        text1:   '#e6edf3',
        text2:   '#8b949e',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
