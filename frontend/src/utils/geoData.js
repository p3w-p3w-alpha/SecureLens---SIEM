// Shared IP → Geolocation mapping + globe data builders

const IP_GEO = {
  '185.220.101.3':  { lat: 51.2993, lng: 9.491,    country: 'Germany', city: 'Frankfurt' },
  '203.0.113.10':   { lat: 35.6762, lng: 139.6503,  country: 'Japan', city: 'Tokyo' },
  '203.0.113.1':    { lat: 35.6762, lng: 139.6503,  country: 'Japan', city: 'Tokyo' },
  '91.198.174.1':   { lat: 52.5200, lng: 13.4050,   country: 'Germany', city: 'Berlin' },
  '198.51.100.7':   { lat: 51.5074, lng: -0.1278,   country: 'UK', city: 'London' },
  '198.51.100.1':   { lat: 51.5074, lng: -0.1278,   country: 'UK', city: 'London' },
  '172.16.50.99':   { lat: 39.9042, lng: 116.4074,  country: 'China', city: 'Beijing' },
  '8.8.8.8':        { lat: 37.4220, lng: -122.0841, country: 'USA', city: 'Mountain View' },
  '8.8.4.4':        { lat: 37.4220, lng: -122.0841, country: 'USA', city: 'Mountain View' },
  '1.1.1.1':        { lat: -33.8688, lng: 151.2093, country: 'Australia', city: 'Sydney' },
  '192.168.1.100':  { lat: 48.8566, lng: 2.3522,    country: 'France', city: 'Paris' },
  '10.0.0.1':       { lat: 33.5731, lng: -7.5898,   country: 'Morocco', city: 'Casablanca' },
  '55.7558':        { lat: 55.7558, lng: 37.6173,   country: 'Russia', city: 'Moscow' },
};

export const HOME_BASE = { lat: 33.5731, lng: -7.5898, country: 'Morocco', city: 'Casablanca' };

// Decorative arcs for login/register page globe background (ambient, not real data)
export const LOGIN_ARCS = [
  { startLat: 51.2993, startLng: 9.491 },    // Germany
  { startLat: 39.9042, startLng: 116.4074 },  // China
  { startLat: 35.6762, startLng: 139.6503 },  // Japan
  { startLat: 51.5074, startLng: -0.1278 },   // UK
  { startLat: 37.4220, startLng: -122.0841 }, // USA
  { startLat: 48.8566, startLng: 2.3522 },    // France
  { startLat: 55.7558, startLng: 37.6173 },   // Russia
  { startLat: -33.8688, startLng: 151.2093 }, // Australia
].map(a => ({
  ...a,
  endLat: HOME_BASE.lat,
  endLng: HOME_BASE.lng,
  color: ['#ff2d5580', '#00d4ff80'],
}));

export const LOGIN_POINTS = [
  { lat: 51.2993, lng: 9.491, color: '#ff2d55', size: 0.35 },
  { lat: 39.9042, lng: 116.4074, color: '#ff2d55', size: 0.35 },
  { lat: 35.6762, lng: 139.6503, color: '#ff6b35', size: 0.3 },
  { lat: 51.5074, lng: -0.1278, color: '#ff6b35', size: 0.3 },
  { lat: 37.4220, lng: -122.0841, color: '#ffb800', size: 0.3 },
  { lat: 48.8566, lng: 2.3522, color: '#ff2d55', size: 0.3 },
  { lat: 55.7558, lng: 37.6173, color: '#ff2d55', size: 0.35 },
  { lat: -33.8688, lng: 151.2093, color: '#ffb800', size: 0.25 },
  { lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#00e68a', size: 0.5 },
];

export function getIpCoordinates(ip) {
  if (!ip) return null;
  if (IP_GEO[ip]) return IP_GEO[ip];
  const prefix = ip.split('.').slice(0, 3).join('.');
  for (const [k, v] of Object.entries(IP_GEO)) {
    if (k.startsWith(prefix)) return v;
  }
  // Deterministic hash for unknown IPs
  const hash = ip.split('.').reduce((h, o) => ((h << 5) - h + parseInt(o || 0)) | 0, 0);
  return {
    lat: ((Math.abs(hash) % 140) - 70),
    lng: ((Math.abs(hash * 7) % 360) - 180),
    country: 'Unknown',
    city: ip,
  };
}

export function getArcData(sourceIps) {
  if (!sourceIps?.length) return [];
  const unique = [...new Set(sourceIps.filter(Boolean))];
  return unique.map(ip => {
    const geo = getIpCoordinates(ip);
    if (!geo) return null;
    return {
      startLat: geo.lat, startLng: geo.lng,
      endLat: HOME_BASE.lat, endLng: HOME_BASE.lng,
      color: ['#ff2d5580', '#00d4ff80'],
      label: geo.city,
    };
  }).filter(Boolean);
}

export function getPointData(sourceIps) {
  if (!sourceIps?.length) return [{ lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#00e68a', size: 0.5 }];
  const unique = [...new Set(sourceIps.filter(Boolean))];
  const points = unique.map(ip => {
    const geo = getIpCoordinates(ip);
    if (!geo) return null;
    return { lat: geo.lat, lng: geo.lng, color: '#ff2d55', size: 0.35, label: geo.city };
  }).filter(Boolean);
  points.push({ lat: HOME_BASE.lat, lng: HOME_BASE.lng, color: '#00e68a', size: 0.5, label: 'HQ' });
  return points;
}
