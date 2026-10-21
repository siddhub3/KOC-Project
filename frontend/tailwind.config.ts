import type { Config } from 'tailwindcss';
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { orange: "#ff7a18", blue: "#0f3b5f", cream: "#fef9ec" }
      }
    }
  },
  plugins: []
};
export default config;
