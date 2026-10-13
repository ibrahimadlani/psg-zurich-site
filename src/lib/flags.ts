/** Flag emoji of a country code ("CH" → 🇨🇭). */
export const flag = (country: string) =>
  String.fromCodePoint(...[...country].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
