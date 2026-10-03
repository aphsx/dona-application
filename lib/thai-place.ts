import slim from "./data/thai-places-slim.json";

export type PlaceIds = {
  provinceId: number;
  districtId: number;
  subdistrictId: number;
};

type Slim = {
  provinces: [number, string][];
  districts: [number, string, number][];
  subdistricts: [number, string, number, number, number | null, number | null][];
};

const data = slim as Slim;

const provinceById = new Map(data.provinces.map(([id, name]) => [id, name]));
const districtById = new Map(
  data.districts.map(([id, name, provinceId]) => [id, { name, provinceId }]),
);
const subdistrictById = new Map(
  data.subdistricts.map(([id, name, districtId, provinceId, lat, lng]) => [
    id,
    { name, districtId, provinceId, lat, lng },
  ]),
);

const districtsByProvince = new Map<number, { id: number; name: string }[]>();
for (const [id, name, provinceId] of data.districts) {
  const list = districtsByProvince.get(provinceId) ?? [];
  list.push({ id, name });
  districtsByProvince.set(provinceId, list);
}

const subdistrictsByDistrict = new Map<number, { id: number; name: string }[]>();
for (const [id, name, districtId] of data.subdistricts) {
  const list = subdistrictsByDistrict.get(districtId) ?? [];
  list.push({ id, name });
  subdistrictsByDistrict.set(districtId, list);
}

export function provinceOptions() {
  return data.provinces
    .slice()
    .sort((a, b) => a[1].localeCompare(b[1], "th"))
    .map(([id, name]) => ({ value: String(id), label: name }));
}

export function districtOptions(provinceId: number) {
  return (districtsByProvince.get(provinceId) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "th"))
    .map((item) => ({ value: String(item.id), label: item.name }));
}

export function subdistrictOptions(provinceId: number, districtId: number) {
  const district = districtById.get(districtId);
  if (!district || district.provinceId !== provinceId) return [];
  return (subdistrictsByDistrict.get(districtId) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "th"))
    .map((item) => ({ value: String(item.id), label: item.name }));
}

export function provinceName(id: number) {
  return provinceById.get(id) ?? "—";
}

export function districtName(id: number) {
  return districtById.get(id)?.name ?? "—";
}

export function subdistrictName(id: number) {
  return subdistrictById.get(id)?.name ?? "—";
}

export function placeLabel(place: PlaceIds | null | undefined) {
  if (!place?.provinceId || !place.districtId || !place.subdistrictId) return "—";
  return `${subdistrictName(place.subdistrictId)} ${districtName(place.districtId)} ${provinceName(place.provinceId)}`;
}

export function placeParts(place: PlaceIds | null | undefined) {
  if (!place?.provinceId || !place.districtId || !place.subdistrictId) {
    return { province: "", district: "", subdistrict: "" };
  }
  return {
    province: provinceName(place.provinceId),
    district: districtName(place.districtId),
    subdistrict: subdistrictName(place.subdistrictId),
  };
}

export function isCompletePlace(place: PlaceIds | null | undefined) {
  if (!place) return false;
  const sub = subdistrictById.get(place.subdistrictId);
  return !!sub && sub.provinceId === place.provinceId && sub.districtId === place.districtId;
}

export function placeAt(lng: number, lat: number): PlaceIds | null {
  let best: PlaceIds | null = null;
  let bestDistance = Infinity;
  for (const [id, sub] of subdistrictById) {
    if (sub.lat == null || sub.lng == null) continue;
    const dLat = sub.lat - lat;
    const dLng = sub.lng - lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = {
      provinceId: sub.provinceId,
      districtId: sub.districtId,
      subdistrictId: id,
    };
  }
  return best;
}

export type PlaceCenter = { lng: number; lat: number; zoom: number };

function averagePoint(points: { lat: number; lng: number }[]): { lng: number; lat: number } | null {
  if (points.length === 0) return null;
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  return { lng, lat };
}

/** Best map focus for a Thai place selection (tambon → amphoe → province). */
export function placeCenter(place: Partial<PlaceIds> | null | undefined): PlaceCenter | null {
  if (!place) return null;

  if (place.subdistrictId) {
    const sub = subdistrictById.get(place.subdistrictId);
    if (sub?.lat != null && sub.lng != null) {
      return { lng: sub.lng, lat: sub.lat, zoom: 15 };
    }
  }

  if (place.districtId) {
    const points = data.subdistricts
      .filter(([, , districtId, , lat, lng]) => districtId === place.districtId && lat != null && lng != null)
      .map(([, , , , lat, lng]) => ({ lat: lat as number, lng: lng as number }));
    const avg = averagePoint(points);
    if (avg) return { ...avg, zoom: 12 };
  }

  if (place.provinceId) {
    const points = data.subdistricts
      .filter(([, , , provinceId, lat, lng]) => provinceId === place.provinceId && lat != null && lng != null)
      .map(([, , , , lat, lng]) => ({ lat: lat as number, lng: lng as number }));
    const avg = averagePoint(points);
    if (avg) return { ...avg, zoom: 9 };
  }

  return null;
}
