import { heroui } from "@heroui/theme";
import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["selector"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        default: "url('/background.png')",
        blue: "url('/background-blue.png')",
        test: "url('/test.png')",
      },
      fontFamily: {
        SiYuanSongTi: ["SiYuanSongTi", ...defaultTheme.fontFamily.sans],
        FangZhengKaiTi: ["FangZhengKaiTi", ...defaultTheme.fontFamily.sans],
        SiYuanHeiTi: ["SiYuanHeiTi", ...defaultTheme.fontFamily.sans],
        XiaLuZhenKai: ["XiaLuZhenKai", ...defaultTheme.fontFamily.sans],
        HanZiPinYin: ["HanZiPinYin", ...defaultTheme.fontFamily.sans],
        JiangChengYuanTi: ["JiangChengYuanTi", ...defaultTheme.fontFamily.sans],
        LinHaiLiShu: ["LinHaiLiShu", ...defaultTheme.fontFamily.sans],
        Comfortaa: ["Comfortaa", ...defaultTheme.fontFamily.sans],
        FrederickatheGreat: ["FrederickatheGreat", ...defaultTheme.fontFamily.sans],
        RobotoSlab: ["RobotoSlab", ...defaultTheme.fontFamily.sans],
        Merienda: ["Merienda", ...defaultTheme.fontFamily.sans],
        ComicNeueAngular: ["ComicNeueAngular", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [animate, heroui()],
} satisfies Config;
