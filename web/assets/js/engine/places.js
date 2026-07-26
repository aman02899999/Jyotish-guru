/**
 * places.js — birth-place resolution and timezone handling.
 *
 * Two tiers:
 *   1. A built-in offline gazetteer of ~140 cities so the site produces real
 *      charts with zero network access (important for GitHub Pages / offline).
 *   2. Live geocoding via the Open-Meteo public API (no key required) for any
 *      other place on Earth, with graceful fallback to tier 1.
 *
 * Historical timezone offsets come from the browser's own IANA database via
 * Intl.DateTimeFormat, so DST and historical rule changes are handled
 * correctly rather than being approximated by a fixed offset.
 */

/** Compact gazetteer: [name, country, lat, lon, ianaTimeZone]. */
const CITIES = [
  ['New Delhi', 'India', 28.6139, 77.2090, 'Asia/Kolkata'],
  ['Mumbai', 'India', 19.0760, 72.8777, 'Asia/Kolkata'],
  ['Bengaluru', 'India', 12.9716, 77.5946, 'Asia/Kolkata'],
  ['Chennai', 'India', 13.0827, 80.2707, 'Asia/Kolkata'],
  ['Kolkata', 'India', 22.5726, 88.3639, 'Asia/Kolkata'],
  ['Hyderabad', 'India', 17.3850, 78.4867, 'Asia/Kolkata'],
  ['Pune', 'India', 18.5204, 73.8567, 'Asia/Kolkata'],
  ['Ahmedabad', 'India', 23.0225, 72.5714, 'Asia/Kolkata'],
  ['Jaipur', 'India', 26.9124, 75.7873, 'Asia/Kolkata'],
  ['Lucknow', 'India', 26.8467, 80.9462, 'Asia/Kolkata'],
  ['Kanpur', 'India', 26.4499, 80.3319, 'Asia/Kolkata'],
  ['Nagpur', 'India', 21.1458, 79.0882, 'Asia/Kolkata'],
  ['Indore', 'India', 22.7196, 75.8577, 'Asia/Kolkata'],
  ['Bhopal', 'India', 23.2599, 77.4126, 'Asia/Kolkata'],
  ['Patna', 'India', 25.5941, 85.1376, 'Asia/Kolkata'],
  ['Varanasi', 'India', 25.3176, 82.9739, 'Asia/Kolkata'],
  ['Surat', 'India', 21.1702, 72.8311, 'Asia/Kolkata'],
  ['Vadodara', 'India', 22.3072, 73.1812, 'Asia/Kolkata'],
  ['Ludhiana', 'India', 30.9010, 75.8573, 'Asia/Kolkata'],
  ['Amritsar', 'India', 31.6340, 74.8723, 'Asia/Kolkata'],
  ['Chandigarh', 'India', 30.7333, 76.7794, 'Asia/Kolkata'],
  ['Dehradun', 'India', 30.3165, 78.0322, 'Asia/Kolkata'],
  ['Guwahati', 'India', 26.1445, 91.7362, 'Asia/Kolkata'],
  ['Bhubaneswar', 'India', 20.2961, 85.8245, 'Asia/Kolkata'],
  ['Kochi', 'India', 9.9312, 76.2673, 'Asia/Kolkata'],
  ['Thiruvananthapuram', 'India', 8.5241, 76.9366, 'Asia/Kolkata'],
  ['Coimbatore', 'India', 11.0168, 76.9558, 'Asia/Kolkata'],
  ['Madurai', 'India', 9.9252, 78.1198, 'Asia/Kolkata'],
  ['Visakhapatnam', 'India', 17.6868, 83.2185, 'Asia/Kolkata'],
  ['Mysuru', 'India', 12.2958, 76.6394, 'Asia/Kolkata'],
  ['Jodhpur', 'India', 26.2389, 73.0243, 'Asia/Kolkata'],
  ['Udaipur', 'India', 24.5854, 73.7125, 'Asia/Kolkata'],
  ['Agra', 'India', 27.1767, 78.0081, 'Asia/Kolkata'],
  ['Rajkot', 'India', 22.3039, 70.8022, 'Asia/Kolkata'],
  ['Ranchi', 'India', 23.3441, 85.3096, 'Asia/Kolkata'],
  ['Raipur', 'India', 21.2514, 81.6296, 'Asia/Kolkata'],
  ['Srinagar', 'India', 34.0837, 74.7973, 'Asia/Kolkata'],
  ['Shimla', 'India', 31.1048, 77.1734, 'Asia/Kolkata'],
  ['Gurugram', 'India', 28.4595, 77.0266, 'Asia/Kolkata'],
  ['Noida', 'India', 28.5355, 77.3910, 'Asia/Kolkata'],
  ['Tirupati', 'India', 13.6288, 79.4192, 'Asia/Kolkata'],
  ['Haridwar', 'India', 29.9457, 78.1642, 'Asia/Kolkata'],
  ['Ujjain', 'India', 23.1765, 75.7885, 'Asia/Kolkata'],
  ['Puri', 'India', 19.8135, 85.8312, 'Asia/Kolkata'],
  ['Katmandu', 'Nepal', 27.7172, 85.3240, 'Asia/Kathmandu'],
  ['Colombo', 'Sri Lanka', 6.9271, 79.8612, 'Asia/Colombo'],
  ['Dhaka', 'Bangladesh', 23.8103, 90.4125, 'Asia/Dhaka'],
  ['Karachi', 'Pakistan', 24.8607, 67.0011, 'Asia/Karachi'],
  ['Lahore', 'Pakistan', 31.5204, 74.3587, 'Asia/Karachi'],
  ['Islamabad', 'Pakistan', 33.6844, 73.0479, 'Asia/Karachi'],
  ['Kabul', 'Afghanistan', 34.5553, 69.2075, 'Asia/Kabul'],
  ['Thimphu', 'Bhutan', 27.4712, 89.6339, 'Asia/Thimphu'],
  ['Male', 'Maldives', 4.1755, 73.5093, 'Indian/Maldives'],
  ['Dubai', 'UAE', 25.2048, 55.2708, 'Asia/Dubai'],
  ['Abu Dhabi', 'UAE', 24.4539, 54.3773, 'Asia/Dubai'],
  ['Doha', 'Qatar', 25.2854, 51.5310, 'Asia/Qatar'],
  ['Muscat', 'Oman', 23.5880, 58.3829, 'Asia/Muscat'],
  ['Riyadh', 'Saudi Arabia', 24.7136, 46.6753, 'Asia/Riyadh'],
  ['Kuwait City', 'Kuwait', 29.3759, 47.9774, 'Asia/Kuwait'],
  ['Manama', 'Bahrain', 26.2285, 50.5860, 'Asia/Bahrain'],
  ['Tehran', 'Iran', 35.6892, 51.3890, 'Asia/Tehran'],
  ['Istanbul', 'Turkey', 41.0082, 28.9784, 'Europe/Istanbul'],
  ['Tel Aviv', 'Israel', 32.0853, 34.7818, 'Asia/Jerusalem'],
  ['Cairo', 'Egypt', 30.0444, 31.2357, 'Africa/Cairo'],
  ['Nairobi', 'Kenya', -1.2921, 36.8219, 'Africa/Nairobi'],
  ['Lagos', 'Nigeria', 6.5244, 3.3792, 'Africa/Lagos'],
  ['Johannesburg', 'South Africa', -26.2041, 28.0473, 'Africa/Johannesburg'],
  ['Cape Town', 'South Africa', -33.9249, 18.4241, 'Africa/Johannesburg'],
  ['Accra', 'Ghana', 5.6037, -0.1870, 'Africa/Accra'],
  ['Casablanca', 'Morocco', 33.5731, -7.5898, 'Africa/Casablanca'],
  ['Port Louis', 'Mauritius', -20.1609, 57.5012, 'Indian/Mauritius'],
  ['London', 'United Kingdom', 51.5074, -0.1278, 'Europe/London'],
  ['Manchester', 'United Kingdom', 53.4808, -2.2426, 'Europe/London'],
  ['Birmingham', 'United Kingdom', 52.4862, -1.8904, 'Europe/London'],
  ['Dublin', 'Ireland', 53.3498, -6.2603, 'Europe/Dublin'],
  ['Paris', 'France', 48.8566, 2.3522, 'Europe/Paris'],
  ['Berlin', 'Germany', 52.5200, 13.4050, 'Europe/Berlin'],
  ['Munich', 'Germany', 48.1351, 11.5820, 'Europe/Berlin'],
  ['Frankfurt', 'Germany', 50.1109, 8.6821, 'Europe/Berlin'],
  ['Amsterdam', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam'],
  ['Brussels', 'Belgium', 50.8503, 4.3517, 'Europe/Brussels'],
  ['Zurich', 'Switzerland', 47.3769, 8.5417, 'Europe/Zurich'],
  ['Geneva', 'Switzerland', 46.2044, 6.1432, 'Europe/Zurich'],
  ['Vienna', 'Austria', 48.2082, 16.3738, 'Europe/Vienna'],
  ['Rome', 'Italy', 41.9028, 12.4964, 'Europe/Rome'],
  ['Milan', 'Italy', 45.4642, 9.1900, 'Europe/Rome'],
  ['Madrid', 'Spain', 40.4168, -3.7038, 'Europe/Madrid'],
  ['Barcelona', 'Spain', 41.3874, 2.1686, 'Europe/Madrid'],
  ['Lisbon', 'Portugal', 38.7223, -9.1393, 'Europe/Lisbon'],
  ['Stockholm', 'Sweden', 59.3293, 18.0686, 'Europe/Stockholm'],
  ['Oslo', 'Norway', 59.9139, 10.7522, 'Europe/Oslo'],
  ['Copenhagen', 'Denmark', 55.6761, 12.5683, 'Europe/Copenhagen'],
  ['Helsinki', 'Finland', 60.1699, 24.9384, 'Europe/Helsinki'],
  ['Warsaw', 'Poland', 52.2297, 21.0122, 'Europe/Warsaw'],
  ['Prague', 'Czechia', 50.0755, 14.4378, 'Europe/Prague'],
  ['Budapest', 'Hungary', 47.4979, 19.0402, 'Europe/Budapest'],
  ['Athens', 'Greece', 37.9838, 23.7275, 'Europe/Athens'],
  ['Bucharest', 'Romania', 44.4268, 26.1025, 'Europe/Bucharest'],
  ['Moscow', 'Russia', 55.7558, 37.6173, 'Europe/Moscow'],
  ['Kyiv', 'Ukraine', 50.4501, 30.5234, 'Europe/Kyiv'],
  ['New York', 'United States', 40.7128, -74.0060, 'America/New_York'],
  ['Los Angeles', 'United States', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['San Francisco', 'United States', 37.7749, -122.4194, 'America/Los_Angeles'],
  ['San Jose', 'United States', 37.3382, -121.8863, 'America/Los_Angeles'],
  ['Seattle', 'United States', 47.6062, -122.3321, 'America/Los_Angeles'],
  ['Chicago', 'United States', 41.8781, -87.6298, 'America/Chicago'],
  ['Houston', 'United States', 29.7604, -95.3698, 'America/Chicago'],
  ['Dallas', 'United States', 32.7767, -96.7970, 'America/Chicago'],
  ['Austin', 'United States', 30.2672, -97.7431, 'America/Chicago'],
  ['Atlanta', 'United States', 33.7490, -84.3880, 'America/New_York'],
  ['Boston', 'United States', 42.3601, -71.0589, 'America/New_York'],
  ['Washington DC', 'United States', 38.9072, -77.0369, 'America/New_York'],
  ['Miami', 'United States', 25.7617, -80.1918, 'America/New_York'],
  ['Philadelphia', 'United States', 39.9526, -75.1652, 'America/New_York'],
  ['Phoenix', 'United States', 33.4484, -112.0740, 'America/Phoenix'],
  ['Denver', 'United States', 39.7392, -104.9903, 'America/Denver'],
  ['Detroit', 'United States', 42.3314, -83.0458, 'America/Detroit'],
  ['Toronto', 'Canada', 43.6532, -79.3832, 'America/Toronto'],
  ['Vancouver', 'Canada', 49.2827, -123.1207, 'America/Vancouver'],
  ['Montreal', 'Canada', 45.5017, -73.5673, 'America/Toronto'],
  ['Calgary', 'Canada', 51.0447, -114.0719, 'America/Edmonton'],
  ['Mexico City', 'Mexico', 19.4326, -99.1332, 'America/Mexico_City'],
  ['Sao Paulo', 'Brazil', -23.5505, -46.6333, 'America/Sao_Paulo'],
  ['Rio de Janeiro', 'Brazil', -22.9068, -43.1729, 'America/Sao_Paulo'],
  ['Buenos Aires', 'Argentina', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
  ['Santiago', 'Chile', -33.4489, -70.6693, 'America/Santiago'],
  ['Lima', 'Peru', -12.0464, -77.0428, 'America/Lima'],
  ['Bogota', 'Colombia', 4.7110, -74.0721, 'America/Bogota'],
  ['Port of Spain', 'Trinidad', 10.6596, -61.5089, 'America/Port_of_Spain'],
  ['Georgetown', 'Guyana', 6.8013, -58.1551, 'America/Guyana'],
  ['Paramaribo', 'Suriname', 5.8520, -55.2038, 'America/Paramaribo'],
  ['Singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
  ['Kuala Lumpur', 'Malaysia', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'],
  ['Bangkok', 'Thailand', 13.7563, 100.5018, 'Asia/Bangkok'],
  ['Jakarta', 'Indonesia', -6.2088, 106.8456, 'Asia/Jakarta'],
  ['Bali (Denpasar)', 'Indonesia', -8.6500, 115.2167, 'Asia/Makassar'],
  ['Manila', 'Philippines', 14.5995, 120.9842, 'Asia/Manila'],
  ['Hong Kong', 'China', 22.3193, 114.1694, 'Asia/Hong_Kong'],
  ['Shanghai', 'China', 31.2304, 121.4737, 'Asia/Shanghai'],
  ['Beijing', 'China', 39.9042, 116.4074, 'Asia/Shanghai'],
  ['Tokyo', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo'],
  ['Osaka', 'Japan', 34.6937, 135.5023, 'Asia/Tokyo'],
  ['Seoul', 'South Korea', 37.5665, 126.9780, 'Asia/Seoul'],
  ['Taipei', 'Taiwan', 25.0330, 121.5654, 'Asia/Taipei'],
  ['Hanoi', 'Vietnam', 21.0278, 105.8342, 'Asia/Ho_Chi_Minh'],
  ['Ho Chi Minh City', 'Vietnam', 10.8231, 106.6297, 'Asia/Ho_Chi_Minh'],
  ['Yangon', 'Myanmar', 16.8661, 96.1951, 'Asia/Yangon'],
  ['Sydney', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'],
  ['Melbourne', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'],
  ['Brisbane', 'Australia', -27.4698, 153.0251, 'Australia/Brisbane'],
  ['Perth', 'Australia', -31.9505, 115.8605, 'Australia/Perth'],
  ['Adelaide', 'Australia', -34.9285, 138.6007, 'Australia/Adelaide'],
  ['Auckland', 'New Zealand', -36.8485, 174.7633, 'Pacific/Auckland'],
  ['Wellington', 'New Zealand', -41.2865, 174.7762, 'Pacific/Auckland'],
  ['Suva', 'Fiji', -18.1248, 178.4501, 'Pacific/Fiji'],
  ['Honolulu', 'United States', 21.3069, -157.8583, 'Pacific/Honolulu'],
];

export const GAZETTEER = CITIES.map(([name, country, lat, lon, tz]) => ({
  name, country, lat, lon, tz, label: `${name}, ${country}`,
}));

/** Fuzzy local search over the built-in gazetteer. */
export function searchLocal(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const c of GAZETTEER) {
    const n = c.name.toLowerCase(), l = c.label.toLowerCase();
    let score = -1;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (l.includes(q)) score = 2;
    if (score >= 0) scored.push({ ...c, score });
  }
  scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

/** Live geocoding through Open-Meteo (keyless). Falls back to local results. */
export async function searchPlaces(query, limit = 8) {
  const local = searchLocal(query, limit);
  const q = query.trim();
  if (q.length < 2) return local;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('geocode failed');
    const data = await res.json();
    const remote = (data.results || []).map((r) => ({
      name: r.name,
      country: r.country || r.country_code || '',
      admin: r.admin1 || '',
      lat: r.latitude,
      lon: r.longitude,
      tz: r.timezone || 'UTC',
      label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      remote: true,
    }));
    // Merge, preferring remote precision but keeping unique local hits first.
    const seen = new Set(remote.map((r) => r.label.toLowerCase()));
    return [...remote, ...local.filter((l) => !seen.has(l.label.toLowerCase()))].slice(0, limit);
  } catch {
    return local;
  }
}

/**
 * UTC offset (minutes) for an IANA zone at a specific instant.
 * Uses the browser's own tz database, so DST and historical changes apply.
 */
export function tzOffsetMinutes(tz, dateUTC) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(dateUTC).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
    );
    const asUTC = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      +parts.hour % 24, +parts.minute, +parts.second
    );
    return Math.round((asUTC - dateUTC.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * Convert a wall-clock birth time in a given zone to the true UTC instant.
 * Iterates twice so DST boundaries resolve correctly.
 */
export function localToUTC(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMinutes(tz, guess);
    const next = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
    if (Math.abs(next - guess) < 1000) { guess = next; break; }
    guess = next;
  }
  return guess;
}

/** Format an instant in a specific zone. */
export function formatInZone(date, tz, opts = {}) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true, ...opts,
  }).format(date);
}

export function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const a = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

/** Best-effort detection of the visitor's own city, for the live panchang. */
export function guessLocalPlace() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hit = GAZETTEER.find((c) => c.tz === tz);
  if (hit) return hit;
  return GAZETTEER[0]; // New Delhi
}
