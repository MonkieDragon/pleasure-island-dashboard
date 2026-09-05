import L from "leaflet";

/** Theme primary — matches app/theme.ts */
const FILL = "#1976d2";
const STROKE = "#ffffff";
const SIZE = 16;

/** Single shared marker for countries, regions, chains, steps, treasures, drafts. */
export const mapMarkerIcon = L.divIcon({
  className: "map-marker-icon",
  html: `<div style="width:${SIZE}px;height:${SIZE}px;border-radius:50%;background:${FILL};border:2px solid ${STROKE};box-shadow:0 1px 3px rgba(0,0,0,.35);"></div>`,
  iconSize: [SIZE, SIZE],
  iconAnchor: [SIZE / 2, SIZE / 2],
});
