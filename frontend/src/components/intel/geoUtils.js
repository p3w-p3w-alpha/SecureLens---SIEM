const IP_GEO = {
  '8.8.8.8':        { lat: 37.4, lng: -122.1, country: 'USA', city: 'Mountain View' },
  '8.8.4.4':        { lat: 37.4, lng: -122.1, country: 'USA', city: 'Mountain View' },
  '1.1.1.1':        { lat: -33.9, lng: 151.2, country: 'Australia', city: 'Sydney' },
  '185.220.101.3':  { lat: 51.3, lng: 9.5,   country: 'Germany', city: 'Kassel' },
  '91.198.174.1':   { lat: 52.5, lng: 13.4,  country: 'Germany', city: 'Berlin' },
  '203.0.113.1':    { lat: 35.7, lng: 139.7,  country: 'Japan', city: 'Tokyo' },
  '198.51.100.1':   { lat: 51.5, lng: -0.1,   country: 'UK', city: 'London' },
  '192.168.1.1':    { lat: 33.9, lng: -6.9,   country: 'Morocco', city: 'Rabat' },
  '10.0.0.1':       { lat: 33.9, lng: -6.9,   country: 'Morocco', city: 'Rabat' },
};

export function ipToGeo(ip) {
  if (!ip) return null;
  if (IP_GEO[ip]) return IP_GEO[ip];
  const prefix = ip.split('.').slice(0, 3).join('.');
  for (const [k, v] of Object.entries(IP_GEO)) {
    if (k.startsWith(prefix)) return v;
  }
  const hash = ip.split('.').reduce((h, o) => ((h << 5) - h + parseInt(o || 0)) | 0, 0);
  return {
    lat: ((Math.abs(hash) % 140) - 70),
    lng: ((Math.abs(hash * 7) % 360) - 180),
    country: 'Unknown',
    city: ip,
  };
}

export const HOME_BASE = { lat: 33.9, lng: -6.9, country: 'Morocco', city: 'Home Base' };
