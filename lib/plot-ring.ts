export type LngLat = [number, number];

export function openRing(points: LngLat[]) {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points.slice(0, -1);
  return points;
}

export function isClosedRing(points: LngLat[]) {
  return points.length >= 4 && openRing(points).length === points.length - 1;
}

export function closeRing(points: LngLat[]) {
  const ring = openRing(points);
  if (ring.length < 3) return null;
  return [...ring, ring[0]] as LngLat[];
}

export function nearPoint(a: LngLat, b: LngLat) {
  const lng = a[0] - b[0];
  const lat = a[1] - b[1];
  return lng * lng + lat * lat < 0.00008 * 0.00008;
}

export function ringCentroid(points: LngLat[]) {
  const ring = openRing(points);
  if (ring.length === 0) return null;
  const lng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const lat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  return { lng, lat };
}

/** Local fallback only. Prefer API measure-area (PostGIS). */
export function polygonAreaRai(points: LngLat[]) {
  const ring = openRing(points);
  if (ring.length < 3) return null;
  const lat0 = (ring.reduce((sum, point) => sum + point[1], 0) / ring.length) * (Math.PI / 180);
  const metersPerLng = (Math.PI / 180) * 6378137 * Math.cos(lat0);
  const metersPerLat = (Math.PI / 180) * 6378137;
  let sum = 0;
  for (let index = 0; index < ring.length; index++) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    sum += lng1 * metersPerLng * lat2 * metersPerLat - lng2 * metersPerLng * lat1 * metersPerLat;
  }
  return Math.round((Math.abs(sum) / 2 / 1600) * 100) / 100;
}
