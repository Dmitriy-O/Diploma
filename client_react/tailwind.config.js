/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Указываем пути к файлам
  ],
  theme: {
    extend: {
        fontFamily: { // Добавляем шрифт Poppins (если нужно)
            poppins: ['Poppins', 'sans-serif'],
        },
        // Можно добавить кастомные цвета, анимации и т.д.
         animation: {
            'fade-in': 'fadeIn 0.5s ease-out forwards',
            'gradient': 'gradient 15s ease infinite', // Для фона
         },
         keyframes: {
            fadeIn: {
                 '0%': { opacity: '0', transform: 'translateY(10px)' },
                 '100%': { opacity: '1', transform: 'translateY(0)' },
            },
            gradient: { // Для фона
                '0%, 100%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
            }
         }
    },
  },
  plugins: [],
}
