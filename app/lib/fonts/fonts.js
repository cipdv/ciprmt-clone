import { Righteous } from "next/font/google";

export const righteous_init = Righteous({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-righteous",
});

export const righteous = righteous_init.variable;
