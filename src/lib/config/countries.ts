import type { CountryPack } from "@/types";

export const COUNTRY_PACKS: CountryPack[] = [
  {
    code: "PK",
    name: "Pakistan",
    currency: "PKR",
    currencySymbol: "Rs",
    phoneCode: "+92",
    idLabel: "CNIC / B-Form",
    dateFormat: "DD/MM/YYYY",
    locales: ["en", "ur"],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "AED",
    phoneCode: "+971",
    idLabel: "Emirates ID",
    dateFormat: "DD/MM/YYYY",
    locales: ["en", "ur"],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "SAR",
    phoneCode: "+966",
    idLabel: "Iqama / National ID",
    dateFormat: "DD/MM/YYYY",
    locales: ["en"],
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    phoneCode: "+44",
    idLabel: "National Insurance / Passport",
    dateFormat: "DD/MM/YYYY",
    locales: ["en"],
  },
];

export const DEFAULT_COUNTRY = COUNTRY_PACKS[0];

export function getCountryPack(code: string): CountryPack {
  return COUNTRY_PACKS.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}
