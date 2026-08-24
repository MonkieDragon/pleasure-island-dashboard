import type { Database } from "@/supabase/types";

export type UUID = string;

type PublicTables = Database["public"]["Tables"];

export type Region = PublicTables["regions"]["Row"];
export type PuzzleChain = PublicTables["puzzle_chains"]["Row"];
export type Treasure = PublicTables["treasures"]["Row"];
export type Trail = PublicTables["trails"]["Row"];
export type TrailStop = PublicTables["trail_stops"]["Row"];

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

export type StepHint = {
  text: string;
  delaySeconds: number;
  image?: string;
};

export function parseStepHint(raw: unknown): StepHint | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const entry = raw[0];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const obj = entry as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text : "";
  const delaySeconds =
    typeof obj.delaySeconds === "number" && obj.delaySeconds >= 0
      ? obj.delaySeconds
      : 30;
  const image = typeof obj.image === "string" && obj.image.trim() !== "" ? obj.image : undefined;
  if (text.trim() === "" && !image) return null;
  return { text, delaySeconds, image };
}

export function serializeStepHint(input: {
  text: string;
  delaySeconds: number;
  imagePath?: string | null;
}): StepHint[] | null {
  const text = input.text.trim();
  const image = input.imagePath?.trim() || undefined;
  if (text === "" && !image) return null;
  const delaySeconds =
    Number.isFinite(input.delaySeconds) && input.delaySeconds >= 0
      ? input.delaySeconds
      : 30;
  return [{ text, delaySeconds, ...(image ? { image } : {}) }];
}

export type CameraOverlayConfig = {
  subtype: "camera_overlay";
  overlayImagePath: string;
  referenceImagePath?: string;
  overlayOpacity?: number;
  answerInputMode?: "text" | "number";
};

export type SymbolCodexConfig = {
  subtype: "symbol_codex";
  symbols: string[];
  slotCount: number;
  answerArray: number[];
};

export type CodeWheelConfig = {
  subtype: "code_wheel";
  answerInputMode?: "text" | "number";
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
