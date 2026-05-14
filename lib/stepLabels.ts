import { isPuzzleStepType, type PuzzleStepType } from "@/types/database";

const LABELS: Record<PuzzleStepType, string> = {
  info: "Info",
  text: "Text question",
  qr: "QR code",
  number: "Number question",
  multiple_choice: "Multiple choice",
};

export function puzzleStepTypeLabel(type: string): string {
  return isPuzzleStepType(type) ? LABELS[type] : type;
}
