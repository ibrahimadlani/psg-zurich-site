import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

/*
 * Phone numbers: Switzerland and its neighbours only, in order of likely use by the club's
 * members. Each number must follow its country's numbering plan (full metadata, so mobile and
 * landline ranges are checked) and is stored in E.164 ("+41791234567"): clean, comparable data.
 */
export const PHONE_COUNTRIES = ["CH", "FR", "DE", "IT", "AT", "LI"] as const satisfies readonly CountryCode[];
export type PhoneCountry = (typeof PHONE_COUNTRIES)[number];

const allowed = (country: string | undefined): country is PhoneCountry =>
  (PHONE_COUNTRIES as readonly string[]).includes(country ?? "");

export const callingCode = (country: PhoneCountry) => `+${getCountryCallingCode(country)}`;

export { flag } from "@/lib/flags";

/** E.164 form of a valid number from one of the allowed countries, else null. */
export function normalizePhone(input: string, country: PhoneCountry = "CH") {
  const number = parsePhoneNumberFromString(input.trim(), country);
  if (!number || !number.isValid() || !allowed(number.country)) return null;
  return number.number;
}

/** Stored number, written the international way ("+41 79 123 45 67"); unknown values as they are. */
export function formatPhone(value: string | null | undefined) {
  if (!value) return "";
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

/** Country and national part of a stored number, to fill the phone field. */
export function splitPhone(value: string | null | undefined): { country: PhoneCountry; national: string } {
  const number = value ? parsePhoneNumberFromString(value) : undefined;
  if (number && allowed(number.country)) return { country: number.country, national: number.formatNational() };
  return { country: "CH", national: value ?? "" };
}

/** National part formatted while typing, in the country's usual groups ("079 123 45 67"). */
export const formatAsYouType = (national: string, country: PhoneCountry) => new AsYouType(country).input(national);
