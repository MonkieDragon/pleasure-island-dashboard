import L from "leaflet";

const COLOR_MAIN = "#1565c0";
const COLOR_OPTIONAL = "#78909c";
const COLOR_STROKE_SELECTED = "#0d47a1";
const COLOR_STROKE_HOVER = "#ff9800";

function attractionSvg(fill: string, stroke: string, strokeWidth: number): string {
  // Landmark / monument
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
    <path fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"
      d="M12 2 3 8v1h18V8L12 2zm-7 9v9H4v2h16v-2h-1v-9H5zm3 2h2v7H8v-7zm6 0h2v7h-2v-7z"/>
  </svg>`;
}

function eaterySvg(fill: string, stroke: string, strokeWidth: number): string {
  // Fork + knife
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
    <g fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M5 2v7a2 2 0 0 0 2 2v11h2V11a2 2 0 0 0 2-2V2H9v6H8V2H6v6H5V2H5zm11.5 0c-1.9 0-3.5 1.8-3.5 4v5h2v11h2V11h2V6c0-2.2-1.6-4-2.5-4z"/>
    </g>
  </svg>`;
}

export function pickChainIcon(input: {
  isEatery: boolean;
  optional: boolean;
  readyToPublish: boolean;
  selected: boolean;
  hovered: boolean;
}): L.DivIcon {
  const size = input.optional ? 28 : 36;
  const fill = input.optional ? COLOR_OPTIONAL : COLOR_MAIN;
  // Keep drafts visible: do not dim with opacity. Instead apply grayscale styling only.
  const opacity = 1;
  const isDraft = !input.readyToPublish;
  const shouldGray = isDraft && !input.selected && !input.hovered;
  const stroke = input.selected
    ? COLOR_STROKE_SELECTED
    : input.hovered
      ? COLOR_STROKE_HOVER
      : "#ffffff";
  const strokeWidth = input.selected || input.hovered ? 1.5 : 0.75;
  const scale = input.selected || input.hovered ? 1.12 : 1;

  const glyph = input.isEatery
    ? eaterySvg(fill, stroke, strokeWidth)
    : attractionSvg(fill, stroke, strokeWidth);

  const outer = Math.round(size * scale);
  const filter = shouldGray
    ? "drop-shadow(0 1px 2px rgba(0,0,0,.35)) grayscale(1)"
    : "drop-shadow(0 1px 2px rgba(0,0,0,.35))";
  const html = `<div style="width:${outer}px;height:${outer}px;opacity:${opacity};filter:${filter};line-height:0;">${glyph}</div>`;

  return L.divIcon({
    className: "chain-map-icon",
    html,
    iconSize: [outer, outer],
    iconAnchor: [outer / 2, outer],
  });
}
