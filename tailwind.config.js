/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        navbar: "#5a784f",
        // navbar: "#66a066",
        navbar2: "#8da587",
        navbarLogo: "#e0be43",
        authForms: "#80b0ca",
        formBackground: "#8faf83",
        buttons: "#423c36",
        buttonsHover: "#635f5b",
      },
      fontFamily: {
        righteous: ["var(--font-righteous)"],
      },
    },
  },
  plugins: [],
};
