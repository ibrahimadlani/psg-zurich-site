import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

export const virage = localFont({
  src: [
    { path: "../fonts/Virage-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Virage-Semibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-virage",
  display: "swap",
});

export const virageWide = localFont({
  src: [
    { path: "../fonts/Virage-WideRegular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Virage-WideSemibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-virage-wide",
  display: "swap",
});

export const virageNarrow = localFont({
  src: [
    { path: "../fonts/Virage-NarrowSemibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Virage-NarrowBoldItalic.woff2", weight: "700", style: "italic" },
    { path: "../fonts/Virage-NarrowUltraboldItalic.woff2", weight: "800", style: "italic" },
  ],
  variable: "--font-virage-narrow",
  display: "swap",
});

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** Class names exposing every font as a CSS variable; put them on <html>. */
export const fontVariables = [virage, virageWide, virageNarrow, geistMono]
  .map((font) => font.variable)
  .join(" ");
