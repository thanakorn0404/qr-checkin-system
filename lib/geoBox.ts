export function isPointInBox(
  lat: number,
  lng: number,
  box: { north: number; south: number; east: number; west: number }
) {
  return lat <= box.north && lat >= box.south && lng <= box.east && lng >= box.west;
}
