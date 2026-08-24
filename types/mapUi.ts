export type MapHover =
  | { kind: "country"; id: string }
  | { kind: "region"; id: string }
  | { kind: "chain"; id: string }
  | { kind: "step"; id: string }
  | { kind: "treasure"; id: string }
  | { kind: "trail"; id: string };
