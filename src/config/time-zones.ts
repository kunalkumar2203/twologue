// Time zones offered in the app, with the helpers that find a middle ground between two partners.

export const COMMON_TIME_ZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles, Vancouver)" },
  { value: "America/Denver", label: "Mountain Time (Denver, Phoenix)" },
  { value: "America/Chicago", label: "Central Time (Chicago, Mexico City)" },
  { value: "America/New_York", label: "Eastern Time (New York, Toronto)" },
  { value: "America/Sao_Paulo", label: "Brasilia Time (São Paulo)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina Time (Buenos Aires)" },
  { value: "America/Halifax", label: "Atlantic Time (Halifax)" },
  { value: "Europe/London", label: "London (United Kingdom)" },
  { value: "Europe/Dublin", label: "Dublin (Ireland)" },
  { value: "Europe/Lisbon", label: "Lisbon (Portugal)" },
  { value: "Europe/Paris", label: "Central European Time (Paris, Berlin)" },
  { value: "Europe/Amsterdam", label: "Central European Time (Amsterdam)" },
  { value: "Europe/Athens", label: "Eastern European Time (Athens)" },
  { value: "Europe/Helsinki", label: "Eastern European Time (Helsinki)" },
  { value: "Europe/Moscow", label: "Moscow Time (Moscow)" },
  { value: "Africa/Cairo", label: "Eastern European Time (Cairo)" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (Johannesburg)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (Karachi)" },
  { value: "Asia/Kolkata", label: "India Standard Time (Mumbai, New Delhi)" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (Dhaka)" },
  { value: "Asia/Bangkok", label: "Indochina Time (Bangkok)" },
  { value: "Asia/Singapore", label: "Singapore Time (Singapore)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (Hong Kong)" },
  { value: "Asia/Shanghai", label: "China Standard Time (Shanghai, Beijing)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Tokyo)" },
  { value: "Asia/Seoul", label: "Korea Standard Time (Seoul)" },
  { value: "Australia/Perth", label: "Australian Western Time (Perth)" },
  { value: "Australia/Adelaide", label: "Australian Central Time (Adelaide)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney, Melbourne)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (Auckland)" },
  { value: "Pacific/Honolulu", label: "Hawaii-Aleutian Time (Honolulu)" },
] as const;

export const zoneLabel = (zone: string) =>
  COMMON_TIME_ZONES.find((item) => item.value === zone)?.label ?? zone;

// Current UTC offset of a zone in minutes, for example +330 for India
export function utcOffsetMinutes(timeZone: string, at: Date = new Date()) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

// The listed zone closest to halfway between two partners' zones. Same zone in, same zone out.
export function middleTimeZone(first: string, second: string) {
  if (first === second) return first;
  const target = (utcOffsetMinutes(first) + utcOffsetMinutes(second)) / 2;
  let best = first;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const zone of COMMON_TIME_ZONES) {
    const gap = Math.abs(utcOffsetMinutes(zone.value) - target);
    if (gap < bestGap) {
      best = zone.value;
      bestGap = gap;
    }
  }
  return best;
}
