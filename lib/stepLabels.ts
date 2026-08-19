import {
  isPuzzleStepType,
  isInteractiveSubtype,
  INTERACTIVE_SUBTYPE_LABELS,
  type PuzzleStepType,
  type InteractiveConfig,
} from "@/types/database";

const LABELS: Record<PuzzleStepType, string> = {
  info: "Info",
  text: "Text question",
  qr: "QR code",
  number: "Number question",
  multiple_choice: "Multiple choice",
  interactive: "Interactive puzzle",
};

export function puzzleStepTypeLabel(type: string, config?: InteractiveConfig | null): string {
  if (type === "interactive" && config && isInteractiveSubtype(config.subtype)) {
    return INTERACTIVE_SUBTYPE_LABELS[config.subtype];
  }
  return isPuzzleStepType(type) ? LABELS[type] : type;
}
