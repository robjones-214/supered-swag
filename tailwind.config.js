/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        supered: {
          pink: "#E5097F",
          cobalt: "#006E97",
          gold: "#FEBD3B",
          aqua: "#91D1CE",
          navy: "#2B2E4A",
        },
      },
    },
  },
  plugins: [],
};
