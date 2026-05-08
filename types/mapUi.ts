export type MapHover =
  | { kind: "region"; id: string }
  | { kind: "chain"; id: string }
  | { kind: "step"; id: string }
  | { kind: "treasure"; id: string };
