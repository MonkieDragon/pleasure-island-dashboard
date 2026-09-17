import L from "leaflet";

/** Theme primary — matches app/theme.ts */
const MAIN_FILL = "#1976d2";
/** MUI warning orange for optional / side-find locations */
const OPTIONAL_FILL = "#ed6c02";
const STROKE = "#ffffff";
const MAIN_SIZE = 16;
const OPTIONAL_SIZE = 11;

function circleIcon(fill: string, size: number) {
  return L.divIcon({
    className: "map-marker-icon",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2px solid ${STROKE};box-shadow:0 1px 3px rgba(0,0,0,.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Shared marker for countries, regions, steps, treasures, drafts, and main locations. */
export const mapMarkerIcon = circleIcon(MAIN_FILL, MAIN_SIZE);

/** Smaller orange marker for optional (side find) locations. */
export const mapOptionalChainMarkerIcon = circleIcon(OPTIONAL_FILL, OPTIONAL_SIZE);

export function chainMapMarkerIcon(optional: boolean) {
  return optional ? mapOptionalChainMarkerIcon : mapMarkerIcon;
}
