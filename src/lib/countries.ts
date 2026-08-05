import type { Locale } from "@/lib/i18n";

/**
 * Países con su indicativo telefónico internacional.
 *
 * Solo se almacena lo que no se puede derivar (código ISO 3166-1 alfa-2 +
 * indicativo E.164). Los nombres NO se hardcodean: se obtienen localizados con
 * `Intl.DisplayNames` (ver `getCountryOptions`), así no hay que mantener 240
 * nombres × 3 idiomas a mano ni cargarlos en el bundle.
 */
export interface Country {
  code: string;
  dial: string;
}

export const COUNTRIES: Country[] = [
  { code: "AF", dial: "93" },
  { code: "AL", dial: "355" },
  { code: "DE", dial: "49" },
  { code: "AD", dial: "376" },
  { code: "AO", dial: "244" },
  { code: "AI", dial: "1264" },
  { code: "AG", dial: "1268" },
  { code: "SA", dial: "966" },
  { code: "DZ", dial: "213" },
  { code: "AR", dial: "54" },
  { code: "AM", dial: "374" },
  { code: "AW", dial: "297" },
  { code: "AU", dial: "61" },
  { code: "AT", dial: "43" },
  { code: "AZ", dial: "994" },
  { code: "BS", dial: "1242" },
  { code: "BD", dial: "880" },
  { code: "BB", dial: "1246" },
  { code: "BH", dial: "973" },
  { code: "BE", dial: "32" },
  { code: "BZ", dial: "501" },
  { code: "BJ", dial: "229" },
  { code: "BM", dial: "1441" },
  { code: "BY", dial: "375" },
  { code: "BO", dial: "591" },
  { code: "BA", dial: "387" },
  { code: "BW", dial: "267" },
  { code: "BR", dial: "55" },
  { code: "BN", dial: "673" },
  { code: "BG", dial: "359" },
  { code: "BF", dial: "226" },
  { code: "BI", dial: "257" },
  { code: "BT", dial: "975" },
  { code: "CV", dial: "238" },
  { code: "KH", dial: "855" },
  { code: "CM", dial: "237" },
  { code: "CA", dial: "1" },
  { code: "QA", dial: "974" },
  { code: "TD", dial: "235" },
  { code: "CL", dial: "56" },
  { code: "CN", dial: "86" },
  { code: "CY", dial: "357" },
  { code: "CO", dial: "57" },
  { code: "KM", dial: "269" },
  { code: "CG", dial: "242" },
  { code: "CD", dial: "243" },
  { code: "KP", dial: "850" },
  { code: "KR", dial: "82" },
  { code: "CI", dial: "225" },
  { code: "CR", dial: "506" },
  { code: "HR", dial: "385" },
  { code: "CU", dial: "53" },
  { code: "CW", dial: "599" },
  { code: "DK", dial: "45" },
  { code: "DM", dial: "1767" },
  { code: "EC", dial: "593" },
  { code: "EG", dial: "20" },
  { code: "SV", dial: "503" },
  { code: "AE", dial: "971" },
  { code: "ER", dial: "291" },
  { code: "SK", dial: "421" },
  { code: "SI", dial: "386" },
  { code: "ES", dial: "34" },
  { code: "US", dial: "1" },
  { code: "EE", dial: "372" },
  { code: "SZ", dial: "268" },
  { code: "ET", dial: "251" },
  { code: "PH", dial: "63" },
  { code: "FI", dial: "358" },
  { code: "FJ", dial: "679" },
  { code: "FR", dial: "33" },
  { code: "GA", dial: "241" },
  { code: "GM", dial: "220" },
  { code: "GE", dial: "995" },
  { code: "GH", dial: "233" },
  { code: "GI", dial: "350" },
  { code: "GD", dial: "1473" },
  { code: "GR", dial: "30" },
  { code: "GL", dial: "299" },
  { code: "GP", dial: "590" },
  { code: "GU", dial: "1671" },
  { code: "GT", dial: "502" },
  { code: "GF", dial: "594" },
  { code: "GG", dial: "44" },
  { code: "GN", dial: "224" },
  { code: "GQ", dial: "240" },
  { code: "GW", dial: "245" },
  { code: "GY", dial: "592" },
  { code: "HT", dial: "509" },
  { code: "HN", dial: "504" },
  { code: "HK", dial: "852" },
  { code: "HU", dial: "36" },
  { code: "IN", dial: "91" },
  { code: "ID", dial: "62" },
  { code: "IQ", dial: "964" },
  { code: "IR", dial: "98" },
  { code: "IE", dial: "353" },
  { code: "IM", dial: "44" },
  { code: "IS", dial: "354" },
  { code: "KY", dial: "1345" },
  { code: "CK", dial: "682" },
  { code: "FO", dial: "298" },
  { code: "MV", dial: "960" },
  { code: "MP", dial: "1670" },
  { code: "MH", dial: "692" },
  { code: "SB", dial: "677" },
  { code: "TC", dial: "1649" },
  { code: "VG", dial: "1284" },
  { code: "VI", dial: "1340" },
  { code: "IL", dial: "972" },
  { code: "IT", dial: "39" },
  { code: "JM", dial: "1876" },
  { code: "JP", dial: "81" },
  { code: "JE", dial: "44" },
  { code: "JO", dial: "962" },
  { code: "KZ", dial: "7" },
  { code: "KE", dial: "254" },
  { code: "KG", dial: "996" },
  { code: "KI", dial: "686" },
  { code: "KW", dial: "965" },
  { code: "LA", dial: "856" },
  { code: "LS", dial: "266" },
  { code: "LV", dial: "371" },
  { code: "LB", dial: "961" },
  { code: "LR", dial: "231" },
  { code: "LY", dial: "218" },
  { code: "LI", dial: "423" },
  { code: "LT", dial: "370" },
  { code: "LU", dial: "352" },
  { code: "MO", dial: "853" },
  { code: "MK", dial: "389" },
  { code: "MG", dial: "261" },
  { code: "MY", dial: "60" },
  { code: "MW", dial: "265" },
  { code: "ML", dial: "223" },
  { code: "MT", dial: "356" },
  { code: "MA", dial: "212" },
  { code: "MQ", dial: "596" },
  { code: "MU", dial: "230" },
  { code: "MR", dial: "222" },
  { code: "YT", dial: "262" },
  { code: "MX", dial: "52" },
  { code: "FM", dial: "691" },
  { code: "MD", dial: "373" },
  { code: "MC", dial: "377" },
  { code: "MN", dial: "976" },
  { code: "ME", dial: "382" },
  { code: "MS", dial: "1664" },
  { code: "MZ", dial: "258" },
  { code: "MM", dial: "95" },
  { code: "NA", dial: "264" },
  { code: "NR", dial: "674" },
  { code: "NP", dial: "977" },
  { code: "NI", dial: "505" },
  { code: "NE", dial: "227" },
  { code: "NG", dial: "234" },
  { code: "NU", dial: "683" },
  { code: "NO", dial: "47" },
  { code: "NC", dial: "687" },
  { code: "NZ", dial: "64" },
  { code: "OM", dial: "968" },
  { code: "NL", dial: "31" },
  { code: "PK", dial: "92" },
  { code: "PW", dial: "680" },
  { code: "PS", dial: "970" },
  { code: "PA", dial: "507" },
  { code: "PG", dial: "675" },
  { code: "PY", dial: "595" },
  { code: "PE", dial: "51" },
  { code: "PF", dial: "689" },
  { code: "PL", dial: "48" },
  { code: "PT", dial: "351" },
  { code: "PR", dial: "1787" },
  { code: "GB", dial: "44" },
  { code: "CF", dial: "236" },
  { code: "CZ", dial: "420" },
  { code: "DO", dial: "1809" },
  { code: "RW", dial: "250" },
  { code: "RO", dial: "40" },
  { code: "RU", dial: "7" },
  { code: "WS", dial: "685" },
  { code: "AS", dial: "1684" },
  { code: "BL", dial: "590" },
  { code: "KN", dial: "1869" },
  { code: "SM", dial: "378" },
  { code: "MF", dial: "590" },
  { code: "PM", dial: "508" },
  { code: "VC", dial: "1784" },
  { code: "SH", dial: "290" },
  { code: "LC", dial: "1758" },
  { code: "ST", dial: "239" },
  { code: "SN", dial: "221" },
  { code: "RS", dial: "381" },
  { code: "SC", dial: "248" },
  { code: "SL", dial: "232" },
  { code: "SG", dial: "65" },
  { code: "SX", dial: "1721" },
  { code: "SY", dial: "963" },
  { code: "SO", dial: "252" },
  { code: "LK", dial: "94" },
  { code: "ZA", dial: "27" },
  { code: "SD", dial: "249" },
  { code: "SS", dial: "211" },
  { code: "SE", dial: "46" },
  { code: "CH", dial: "41" },
  { code: "SR", dial: "597" },
  { code: "TH", dial: "66" },
  { code: "TW", dial: "886" },
  { code: "TZ", dial: "255" },
  { code: "TJ", dial: "992" },
  { code: "IO", dial: "246" },
  { code: "TL", dial: "670" },
  { code: "TG", dial: "228" },
  { code: "TK", dial: "690" },
  { code: "TO", dial: "676" },
  { code: "TT", dial: "1868" },
  { code: "TN", dial: "216" },
  { code: "TM", dial: "993" },
  { code: "TR", dial: "90" },
  { code: "TV", dial: "688" },
  { code: "UA", dial: "380" },
  { code: "UG", dial: "256" },
  { code: "UY", dial: "598" },
  { code: "UZ", dial: "998" },
  { code: "VU", dial: "678" },
  { code: "VA", dial: "379" },
  { code: "VE", dial: "58" },
  { code: "VN", dial: "84" },
  { code: "WF", dial: "681" },
  { code: "YE", dial: "967" },
  { code: "DJ", dial: "253" },
  { code: "ZM", dial: "260" },
  { code: "ZW", dial: "263" },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

/** Devuelve el país por su código ISO alfa-2, o `undefined` si no está en la lista. */
export function findCountry(code: string): Country | undefined {
  return COUNTRY_BY_CODE.get(code.toUpperCase());
}

/**
 * Convierte un código ISO alfa-2 en su emoji de bandera (pares de "regional
 * indicator symbols"). En Windows no existe el glifo y el sistema lo dibuja
 * como las dos letras del país — por eso la opción siempre muestra además el
 * nombre y el indicativo, para que nunca quede ambigua.
 */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export interface CountryOption extends Country {
  name: string;
  flag: string;
}

/**
 * Lista de países lista para pintar en un `<select>`: nombre localizado según
 * el idioma activo y orden estrictamente alfabético A→Z (sin "países populares"
 * arriba). Si `Intl.DisplayNames` no está disponible, se degrada al código ISO.
 */
export function getCountryOptions(locale: Locale): CountryOption[] {
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    displayNames = undefined;
  }

  return COUNTRIES.map((country) => ({
    ...country,
    flag: flagEmoji(country.code),
    name: displayNames?.of(country.code) ?? country.code,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}
