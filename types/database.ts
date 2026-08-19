import type { Database } from "@/supabase/types";

export type UUID = string;

type PublicTables = Database["public"]["Tables"];

export type Region = PublicTables["regions"]["Row"];
export type PuzzleChain = PublicTables["puzzle_chains"]["Row"];
export type Treasure = PublicTables["treasures"]["Row"];

export type PuzzleStepRow = PublicTables["puzzle_steps"]["Row"];

export type PuzzleStepType =
  | "info"
  | "text"
  | "qr"
  | "number"
  | "multiple_choice"
  | "interactive";

export function isPuzzleStepType(value: string): value is PuzzleStepType {
  return (
    value === "info" ||
    value === "text" ||
    value === "qr" ||
    value === "number" ||
    value === "multiple_choice" ||
    value === "interactive"
  );
}

export function isQuestionStepType(
  type: PuzzleStepType,
): type is "text" | "number" {
  return type === "text" || type === "number";
}

// --- Interactive step config types ---

export type InteractiveSubtype =
  | "camera_overlay"
  | "symbol_codex"
  | "code_wheel"
  | "jigsaw";

export const INTERACTIVE_SUBTYPES: readonly InteractiveSubtype[] = [
  "camera_overlay",
  "symbol_codex",
  "code_wheel",
  "jigsaw",
] as const;

export const INTERACTIVE_SUBTYPE_LABELS: Record<InteractiveSubtype, string> = {
  camera_overlay: "Camera overlay",
  symbol_codex: "Symbol codex",
  code_wheel: "Code wheel",
  jigsaw: "Jigsaw",
};

export type CameraOverlayConfig = {
  subtype: "camera_overlay";
  overlayImagePath: string;
  overlayOpacity?: number;
};

export type SymbolCodexConfig = {
  subtype: "symbol_codex";
  symbols: string[];
  slotCount: number;
  answerArray: number[];
};

export type CodeWheelConfig = {
  subtype: "code_wheel";
  rings: { symbols: string[] }[];
  answerArray: number[];
};

export type JigsawConfig = {
  subtype: "jigsaw";
  imagePath: string;
  gridSize: number;
};

export type InteractiveConfig =
  | CameraOverlayConfig
  | SymbolCodexConfig
  | CodeWheelConfig
  | JigsawConfig;

export function isInteractiveSubtype(value: string): value is InteractiveSubtype {
  return (INTERACTIVE_SUBTYPES as readonly string[]).includes(value);
}

// DB-derived row type (matches Supabase exactly; `type` is `string` in DB).
export type PuzzleStep = PuzzleStepRow;

export type ChainWithSteps = PuzzleChain & {
  steps: PuzzleStep[];
};
