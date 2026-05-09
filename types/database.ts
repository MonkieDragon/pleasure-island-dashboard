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
  | "multiple_choice";

export function isPuzzleStepType(value: string): value is PuzzleStepType {
  return (
    value === "info" ||
    value === "text" ||
    value === "qr" ||
    value === "number" ||
    value === "multiple_choice"
  );
}

export function isQuestionStepType(
  type: PuzzleStepType,
): type is "text" | "number" {
  return type === "text" || type === "number";
}

// DB-derived row type (matches Supabase exactly; `type` is `string` in DB).
export type PuzzleStep = PuzzleStepRow;

export type ChainWithSteps = PuzzleChain & {
  steps: PuzzleStep[];
};
