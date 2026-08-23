import { useEffect, useMemo, useRef, useState } from "react";
import {
  PuzzleStep,
  PuzzleStepType,
  isPuzzleStepType,
  isQuestionStepType,
  isInteractiveSubtype,
  INTERACTIVE_SUBTYPES,
  INTERACTIVE_SUBTYPE_LABELS,
  parseStepHint,
  serializeStepHint,
  type InteractiveSubtype,
  type InteractiveConfig,
  type CameraOverlayConfig,
  type SymbolCodexConfig,

  type JigsawConfig,
} from "@/types/database";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import EditorAccordion from "@/components/EditorAccordion";
import ImageUploadBlock from "@/components/ImageUploadBlock";

type Draft = {
  type: PuzzleStepType;
  content: string;
  notes: string;
  answerText: string;
  incorrectOption1Text: string;
  incorrectOption2Text: string;
  incorrectOption3Text: string;
  latText: string;
  lngText: string;
  hintText: string;
  hintDelaySecondsText: string;
  interactiveSubtype: InteractiveSubtype;
  interactiveConfig: InteractiveConfig;
};

type EditorSection = "content" | "playerImage" | "hints" | "notes" | "location";

type Props = {
  step: PuzzleStep | null;
  placementStepId: string | null;
  onStartPlacement: () => void;
  onCancelPlacement: () => void;
  onUpdate: (next: PuzzleStep) => Promise<void> | void;
  onDeleteStep: (stepId: string) => Promise<void> | void;
  onSetImage: (input: { stepId: string; file: File }) => Promise<void> | void;
  onRemoveImage: (input: { stepId: string }) => Promise<void> | void;
  onSetOverlayImage: (input: { stepId: string; file: File }) => Promise<void> | void;
  onRemoveOverlayImage: (input: { stepId: string }) => Promise<void> | void;
  onSetOverlayReferenceImage: (input: { stepId: string; file: File }) => Promise<void> | void;
  onRemoveOverlayReferenceImage: (input: { stepId: string }) => Promise<void> | void;
  onSetHintImage: (input: { stepId: string; file: File }) => Promise<void> | void;
  onRemoveHintImage: (input: { stepId: string }) => Promise<void> | void;
  onSetJigsawImage: (input: { stepId: string; file: File }) => Promise<void> | void;
  onRemoveJigsawImage: (input: { stepId: string }) => Promise<void> | void;
  onUploadSymbolImages: (input: {
    stepId: string;
    files: File[];
  }) => Promise<void> | void;
  onRemoveSymbolImage: (input: {
    stepId: string;
    symbolIndex: number;
  }) => Promise<void> | void;
  getImageUrl: (path: string, cacheKey?: string) => string;
  /** Larger inputs + scroll focused field into view (mobile editor panel). */
  compactMobile?: boolean;
};

function parseOptionalNumber(input: string): number | null {
  const t = input.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Matches numeric answers for question steps (integers/decimals, optional leading minus). */
const NUMERIC_ANSWER_PATTERN = /^-?\d+(\.\d+)?$/;

const DEFAULT_INTERACTIVE_CONFIG: CameraOverlayConfig = {
  subtype: "camera_overlay",
  overlayImagePath: "",
  overlayOpacity: 0.5,
};

function parseInteractiveConfig(raw: unknown): InteractiveConfig {
  if (raw && typeof raw === "object" && "subtype" in raw) {
    const obj = raw as Record<string, unknown>;
    if (isInteractiveSubtype(obj.subtype as string)) {
      return raw as InteractiveConfig;
    }
  }
  return DEFAULT_INTERACTIVE_CONFIG;
}

function incorrectOptionsFromStep(
  options: string[] | null,
  answer: string | null,
): Pick<Draft, "incorrectOption1Text" | "incorrectOption2Text" | "incorrectOption3Text"> {
  if (!Array.isArray(options)) {
    return {
      incorrectOption1Text: "",
      incorrectOption2Text: "",
      incorrectOption3Text: "",
    };
  }

  const answerText = answer == null ? "" : String(answer);
  const remaining = [...options];
  if (answerText !== "") {
    const idx = remaining.indexOf(answerText);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  return {
    incorrectOption1Text: remaining[0] ?? "",
    incorrectOption2Text: remaining[1] ?? "",
    incorrectOption3Text: remaining[2] ?? "",
  };
}

function toDraft(step: PuzzleStep): Draft {
  const type: PuzzleStepType = isPuzzleStepType(step.type) ? step.type : "text";
  const rawAnswer = step.answer;

  const answerText = rawAnswer == null ? "" : String(rawAnswer);

  const config = parseInteractiveConfig(step.config);
  const hint = parseStepHint(step.hints);

  return {
    type,
    content: step.content ?? "",
    notes: step.notes ?? "",
    answerText,
    ...incorrectOptionsFromStep(step.multiple_choice_options, step.answer),
    latText: step.latitude == null ? "" : String(step.latitude),
    lngText: step.longitude == null ? "" : String(step.longitude),
    hintText: hint?.text ?? "",
    hintDelaySecondsText: hint ? String(hint.delaySeconds) : "30",
    interactiveSubtype: config.subtype,
    interactiveConfig: config,
  };
}

// ---------------------------------------------------------------------------
// Interactive config sub-editor
// ---------------------------------------------------------------------------

function InteractiveConfigEditor({
  config,
  answerError,
  onChange,
  mobileInputProps,
  stepId,
  overlayImagePath,
  referenceImagePath,
  jigsawImagePath,
  getImageUrl,
  onPickOverlayFile,
  onRemoveOverlayImage,
  onPickReferenceFile,
  onRemoveReferenceImage,
  onPickJigsawFile,
  onRemoveJigsawImage,
  onUploadSymbolFiles,
  onRemoveSymbolAtIndex,
}: {
  config: InteractiveConfig;
  answerError: string | null;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
  stepId: string;
  overlayImagePath: string | null;
  referenceImagePath: string | null;
  jigsawImagePath: string | null;
  getImageUrl: (path: string, cacheKey?: string) => string;
  onPickOverlayFile: (file: File) => Promise<void> | void;
  onRemoveOverlayImage: () => void;
  onPickReferenceFile: (file: File) => Promise<void> | void;
  onRemoveReferenceImage: () => void;
  onPickJigsawFile: (file: File) => Promise<void> | void;
  onRemoveJigsawImage: () => void;
  onUploadSymbolFiles: (files: File[]) => Promise<void> | void;
  onRemoveSymbolAtIndex: (symbolIndex: number) => Promise<void> | void;
}) {
  const setSubtype = (subtype: InteractiveSubtype) => {
    switch (subtype) {
      case "camera_overlay":
        onChange({
          subtype: "camera_overlay",
          overlayImagePath: overlayImagePath ?? "",
          referenceImagePath: referenceImagePath ?? undefined,
          overlayOpacity: 0.5,
        });
        break;
      case "symbol_codex":
        onChange({ subtype: "symbol_codex", symbols: [], slotCount: 3, answerArray: [] });
        break;
      case "code_wheel":
        onChange({ subtype: "code_wheel" });
        break;
      case "jigsaw":
        onChange({
          subtype: "jigsaw",
          imagePath: jigsawImagePath ?? "",
          gridSize: config.subtype === "jigsaw" ? config.gridSize : 3,
        });
        break;
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Typography variant="subtitle2">Interactive puzzle config</Typography>

      <FormControl size="small">
        <InputLabel id="interactive-subtype-label">Subtype</InputLabel>
        <Select
          labelId="interactive-subtype-label"
          label="Subtype"
          value={config.subtype}
          onChange={(e) => setSubtype(e.target.value as InteractiveSubtype)}
        >
          {INTERACTIVE_SUBTYPES.map((st) => (
            <MenuItem key={st} value={st}>{INTERACTIVE_SUBTYPE_LABELS[st]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {config.subtype === "camera_overlay" && (
        <>
          <CameraOverlayFields
            config={config}
            onChange={onChange}
            stepId={stepId}
            overlayImagePath={overlayImagePath}
            referenceImagePath={referenceImagePath}
            getImageUrl={getImageUrl}
            onPickOverlayFile={onPickOverlayFile}
            onRemoveOverlayImage={onRemoveOverlayImage}
            onPickReferenceFile={onPickReferenceFile}
            onRemoveReferenceImage={onRemoveReferenceImage}
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.answerInputMode === "number"}
                onChange={(_, checked) =>
                  onChange({
                    ...config,
                    answerInputMode: checked ? "number" : "text",
                  })
                }
              />
            }
            label="Number keypad for answer"
          />
        </>
      )}
      {config.subtype === "symbol_codex" && (
        <SymbolCodexFields
          config={config}
          onChange={onChange}
          mobileInputProps={mobileInputProps}
          stepId={stepId}
          getImageUrl={getImageUrl}
          onUploadSymbolFiles={onUploadSymbolFiles}
          onRemoveSymbolAtIndex={onRemoveSymbolAtIndex}
        />
      )}
      {config.subtype === "code_wheel" && (
        <>
          <Typography variant="caption" color="text.secondary">
            The cipher disk always uses A-Z (outer) and 1-26 (inner). Put the cipher key and encoded message in the content/hints fields. The decoded word goes in the Answer field above.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={config.answerInputMode === "number"}
                onChange={(_, checked) =>
                  onChange({
                    ...config,
                    answerInputMode: checked ? "number" : "text",
                  })
                }
              />
            }
            label="Number keypad for answer"
          />
        </>
      )}
      {config.subtype === "jigsaw" && (
        <JigsawFields
          config={config}
          onChange={onChange}
          stepId={stepId}
          jigsawImagePath={jigsawImagePath}
          getImageUrl={getImageUrl}
          onPickJigsawFile={onPickJigsawFile}
          onRemoveJigsawImage={onRemoveJigsawImage}
        />
      )}

      {answerError && <Typography variant="body2" color="error">{answerError}</Typography>}
    </Box>
  );
}

function CameraOverlayFields({
  config,
  onChange,
  stepId,
  overlayImagePath,
  referenceImagePath,
  getImageUrl,
  onPickOverlayFile,
  onRemoveOverlayImage,
  onPickReferenceFile,
  onRemoveReferenceImage,
}: {
  config: CameraOverlayConfig;
  onChange: (next: InteractiveConfig) => void;
  stepId: string;
  overlayImagePath: string | null;
  referenceImagePath: string | null;
  getImageUrl: (path: string, cacheKey?: string) => string;
  onPickOverlayFile: (file: File) => Promise<void> | void;
  onRemoveOverlayImage: () => void;
  onPickReferenceFile: (file: File) => Promise<void> | void;
  onRemoveReferenceImage: () => void;
}) {
  return (
    <>
      <ImageUploadBlock
        label="Overlay image"
        imagePath={overlayImagePath}
        imageCacheKey={overlayImagePath ? `step-overlay:${stepId}` : undefined}
        getImageUrl={getImageUrl}
        emptyLabel="No overlay image yet."
        uploadLabel="Upload overlay image"
        replaceLabel="Replace overlay image"
        removeLabel="Remove overlay image"
        caption="Recommended: 1200×900 PNG, 4:3 aspect ratio (with transparency)."
        objectFit="contain"
        onPickFile={onPickOverlayFile}
        onRemove={onRemoveOverlayImage}
      />
      <ImageUploadBlock
        label="Reference photo (optional)"
        imagePath={referenceImagePath}
        imageCacheKey={referenceImagePath ? `step-overlay-ref:${stepId}` : undefined}
        getImageUrl={getImageUrl}
        emptyLabel="No reference photo yet."
        uploadLabel="Upload reference photo"
        replaceLabel="Replace reference photo"
        removeLabel="Remove reference photo"
        caption="Original view the overlay was designed against; can be shown as a player hint. 1200×900 JPG, 4:3."
        objectFit="contain"
        onPickFile={onPickReferenceFile}
        onRemove={onRemoveReferenceImage}
      />
      <Box>
        <Typography variant="caption" gutterBottom>
          Overlay opacity: {config.overlayOpacity ?? 0.5}
        </Typography>
        <Slider
          value={config.overlayOpacity ?? 0.5}
          onChange={(_, v) => onChange({ ...config, overlayOpacity: v as number })}
          min={0.1}
          max={1}
          step={0.05}
          size="small"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        The answer field above will be used as the expected answer (e.g. &quot;7&quot; for &quot;what number is in the red box?&quot;).
      </Typography>
    </>
  );
}

function parseAnswerArrayText(text: string): number[] {
  return text
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

function SymbolCodexFields({
  config,
  onChange,
  mobileInputProps,
  stepId,
  getImageUrl,
  onUploadSymbolFiles,
  onRemoveSymbolAtIndex,
}: {
  config: SymbolCodexConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
  stepId: string;
  getImageUrl: (path: string, cacheKey?: string) => string;
  onUploadSymbolFiles: (files: File[]) => Promise<void> | void;
  onRemoveSymbolAtIndex: (symbolIndex: number) => Promise<void> | void;
}) {
  // Keep raw text while typing so trailing commas/spaces are not stripped by join().
  const [answerText, setAnswerText] = useState(() => config.answerArray.join(", "));
  const lastPushedSerialized = useRef(config.answerArray.join(","));

  useEffect(() => {
    const serialized = config.answerArray.join(",");
    if (serialized === lastPushedSerialized.current) return;
    lastPushedSerialized.current = serialized;
    setAnswerText(config.answerArray.join(", "));
  }, [config.answerArray]);

  return (
    <>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Symbols
        </Typography>
        <Stack spacing={1}>
          {config.symbols.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No symbols yet. Upload PNG icons (transparent background recommended).
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                gap: 1,
              }}
            >
              {config.symbols.map((path, idx) => (
                <Box
                  key={`${path}-${idx}`}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    [{idx}]
                  </Typography>
                  <Box
                    component="img"
                    key={`${path}-${idx}`}
                    src={getImageUrl(path, `step-symbols:${stepId}`)}
                    alt={`Symbol ${idx}`}
                    sx={{
                      width: 64,
                      height: 64,
                      objectFit: "contain",
                      bgcolor: "action.hover",
                      borderRadius: 1,
                    }}
                  />
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    onClick={() => {
                      void onRemoveSymbolAtIndex(idx);
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          <Button component="label" variant="outlined" size="small">
            Upload symbol images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length === 0) return;
                await onUploadSymbolFiles(files);
              }}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            Recommended: square transparent PNG (e.g. 256×256 or 512×512). Indices are
            0-based and used by the answer array.
          </Typography>
        </Stack>
      </Box>
      <TextField
        label="Number of slots"
        type="number"
        value={config.slotCount}
        onChange={(e) => {
          const slotCount = Math.max(1, parseInt(e.target.value) || 1);
          onChange({ ...config, slotCount });
        }}
        size="small"
        {...mobileInputProps}
      />
      <TextField
        label="Answer array (comma-separated symbol indices, 0-based)"
        value={answerText}
        onChange={(e) => {
          const text = e.target.value;
          const answerArray = parseAnswerArrayText(text);
          lastPushedSerialized.current = answerArray.join(",");
          setAnswerText(text);
          onChange({ ...config, answerArray });
        }}
        size="small"
        placeholder="e.g. 0, 2, 1"
        {...mobileInputProps}
      />
    </>
  );
}

// CodeWheelFields removed — cipher disk uses fixed A-Z / 1-26 rings; no config needed.

function JigsawFields({
  config,
  onChange,
  stepId,
  jigsawImagePath,
  getImageUrl,
  onPickJigsawFile,
  onRemoveJigsawImage,
}: {
  config: JigsawConfig;
  onChange: (next: InteractiveConfig) => void;
  stepId: string;
  jigsawImagePath: string | null;
  getImageUrl: (path: string, cacheKey?: string) => string;
  onPickJigsawFile: (file: File) => Promise<void> | void;
  onRemoveJigsawImage: () => void;
}) {
  return (
    <>
      <ImageUploadBlock
        label="Source image"
        imagePath={jigsawImagePath}
        imageCacheKey={jigsawImagePath ? `step-jigsaw:${stepId}` : undefined}
        getImageUrl={getImageUrl}
        emptyLabel="No source image yet."
        uploadLabel="Upload source image"
        replaceLabel="Replace source image"
        removeLabel="Remove source image"
        objectFit="contain"
        onPickFile={onPickJigsawFile}
        onRemove={onRemoveJigsawImage}
      />
      <FormControl size="small">
        <InputLabel id="jigsaw-grid-label">Grid size</InputLabel>
        <Select
          labelId="jigsaw-grid-label"
          label="Grid size"
          value={config.gridSize}
          onChange={(e) => onChange({ ...config, gridSize: Number(e.target.value) })}
        >
          <MenuItem value={2}>2 &times; 2</MenuItem>
          <MenuItem value={3}>3 &times; 3</MenuItem>
          <MenuItem value={4}>4 &times; 4</MenuItem>
          <MenuItem value={5}>5 &times; 5</MenuItem>
          <MenuItem value={6}>6 &times; 6</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}

export default function SingleStepEditor({
  step,
  placementStepId,
  onStartPlacement,
  onCancelPlacement,
  onUpdate,
  onDeleteStep,
  onSetImage,
  onRemoveImage,
  onSetOverlayImage,
  onRemoveOverlayImage,
  onSetOverlayReferenceImage,
  onRemoveOverlayReferenceImage,
  onSetHintImage,
  onRemoveHintImage,
  onSetJigsawImage,
  onRemoveJigsawImage,
  onUploadSymbolImages,
  onRemoveSymbolImage,
  getImageUrl,
  compactMobile = false,
}: Props) {
  const [draftByStepId, setDraftByStepId] = useState<Record<string, Draft>>({});
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<EditorSection | false>("content");

  const draft = useMemo(() => {
    if (!step) return null;
    return draftByStepId[step.id] ?? toDraft(step);
  }, [draftByStepId, step]);

  useEffect(() => {
    if (!step) return;
    queueMicrotask(() => {
      setDraftByStepId((prev) =>
        prev[step.id] ? prev : { ...prev, [step.id]: toDraft(step) },
      );
    });
  }, [step]);

  // Keep lat/lon draft in sync with the underlying step so marker drags
  // immediately reflect in the numeric inputs.
  useEffect(() => {
    if (!step) return;
    queueMicrotask(() => {
      setDraftByStepId((prev) => {
        const existing = prev[step.id];
        if (!existing) return prev;
        const nextLatText = step.latitude == null ? "" : String(step.latitude);
        const nextLngText = step.longitude == null ? "" : String(step.longitude);
        if (existing.latText === nextLatText && existing.lngText === nextLngText) {
          return prev;
        }
        return {
          ...prev,
          [step.id]: { ...existing, latText: nextLatText, lngText: nextLngText },
        };
      });
    });
  }, [step]);

  // Keep camera overlay paths in sync after immediate upload/remove.
  useEffect(() => {
    if (!step) return;
    const saved = parseInteractiveConfig(step.config);
    if (saved.subtype !== "camera_overlay") return;
    const savedOverlayPath = saved.overlayImagePath;
    const savedReferencePath = saved.referenceImagePath ?? "";
    queueMicrotask(() => {
      setDraftByStepId((prev) => {
        const existing = prev[step.id];
        if (!existing) return prev;
        if (existing.interactiveConfig.subtype !== "camera_overlay") return prev;
        const cfg = existing.interactiveConfig;
        if (
          cfg.overlayImagePath === savedOverlayPath &&
          (cfg.referenceImagePath ?? "") === savedReferencePath
        ) {
          return prev;
        }
        return {
          ...prev,
          [step.id]: {
            ...existing,
            interactiveConfig: {
              ...cfg,
              overlayImagePath: savedOverlayPath,
              referenceImagePath: savedReferencePath || undefined,
            },
          },
        };
      });
    });
  }, [step]);

  // Keep symbol_codex symbols/answerArray in sync after immediate upload/remove.
  useEffect(() => {
    if (!step) return;
    const saved = parseInteractiveConfig(step.config);
    if (saved.subtype !== "symbol_codex") return;
    const savedSymbols = saved.symbols;
    const savedAnswerArray = saved.answerArray;
    queueMicrotask(() => {
      setDraftByStepId((prev) => {
        const existing = prev[step.id];
        if (!existing) return prev;
        if (existing.interactiveConfig.subtype !== "symbol_codex") return prev;
        const cfg = existing.interactiveConfig;
        if (
          JSON.stringify(cfg.symbols) === JSON.stringify(savedSymbols) &&
          JSON.stringify(cfg.answerArray) === JSON.stringify(savedAnswerArray)
        ) {
          return prev;
        }
        return {
          ...prev,
          [step.id]: {
            ...existing,
            interactiveConfig: {
              ...cfg,
              symbols: savedSymbols,
              answerArray: savedAnswerArray,
            },
          },
        };
      });
    });
  }, [step]);

  // Keep jigsaw imagePath in sync after immediate upload/remove.
  useEffect(() => {
    if (!step) return;
    const saved = parseInteractiveConfig(step.config);
    if (saved.subtype !== "jigsaw") return;
    const savedImagePath = saved.imagePath;
    queueMicrotask(() => {
      setDraftByStepId((prev) => {
        const existing = prev[step.id];
        if (!existing) return prev;
        if (existing.interactiveConfig.subtype !== "jigsaw") return prev;
        const cfg = existing.interactiveConfig;
        if (cfg.imagePath === savedImagePath) return prev;
        return {
          ...prev,
          [step.id]: {
            ...existing,
            interactiveConfig: {
              ...cfg,
              imagePath: savedImagePath,
            },
          },
        };
      });
    });
  }, [step]);

  useEffect(() => {
    queueMicrotask(() => {
      setAnswerError(null);
      setMapError(null);
      setExpandedSection("content");
    });
  }, [step?.id]);

  const dirty = useMemo(() => {
    if (!step || !draft) return false;
    const base = toDraft(step);
    return (
      base.type !== draft.type ||
      base.content !== draft.content ||
      base.notes !== draft.notes ||
      base.answerText !== draft.answerText ||
      base.incorrectOption1Text !== draft.incorrectOption1Text ||
      base.incorrectOption2Text !== draft.incorrectOption2Text ||
      base.incorrectOption3Text !== draft.incorrectOption3Text ||
      base.hintText !== draft.hintText ||
      base.hintDelaySecondsText !== draft.hintDelaySecondsText ||
      (draft.type === "interactive" &&
        JSON.stringify(base.interactiveConfig) !== JSON.stringify(draft.interactiveConfig))
    );
  }, [draft, step]);

  const setDraft = (patch: Partial<Draft>) => {
    if (!step || !draft) return;
    setDraftByStepId((prev) => ({
      ...prev,
      [step.id]: { ...draft, ...patch },
    }));
  };

  const validate = (): string | null => {
    if (!draft) return null;
    const a = draft.answerText.trim();

    if (draft.type === "number") {
      if (a === "") return "Question steps need an answer.";
      if (!NUMERIC_ANSWER_PATTERN.test(a)) {
        return "Answer must be a valid number.";
      }
    }
    if (draft.type === "text") {
      if (a === "") return "Question steps need an answer.";
      if (NUMERIC_ANSWER_PATTERN.test(a)) {
        return 'This answer looks numeric — enable "Number" so the app uses the numeric keyboard and validates correctly.';
      }
    }
    if (draft.type === "qr") {
      if (a === "") return "QR steps need a QR payload.";
    }
    if (draft.type === "multiple_choice") {
      if (a === "") return "Multiple choice steps need a correct answer.";
      const incorrect = [
        draft.incorrectOption1Text.trim(),
        draft.incorrectOption2Text.trim(),
        draft.incorrectOption3Text.trim(),
      ];
      if (incorrect.some((option) => option === "")) {
        return "Multiple choice steps need 3 incorrect options.";
      }
    }
    if (draft.type === "interactive") {
      const cfg = draft.interactiveConfig;
      switch (cfg.subtype) {
        case "camera_overlay": {
          const saved = parseInteractiveConfig(step?.config);
          const overlayPath =
            saved.subtype === "camera_overlay" ? saved.overlayImagePath : "";
          if (!overlayPath) return "Camera overlay needs an overlay image.";
          if (a === "") return "Camera overlay needs an answer.";
          break;
        }
        case "symbol_codex":
          if (cfg.symbols.length === 0) return "Symbol codex needs at least one symbol.";
          if (cfg.slotCount < 1) return "Symbol codex needs at least 1 slot.";
          if (cfg.answerArray.length !== cfg.slotCount) return "Answer array length must match slot count.";
          break;
        case "code_wheel":
          if (a === "") return "Code wheel needs an answer (the decoded word).";
          break;
        case "jigsaw": {
          const saved = parseInteractiveConfig(step?.config);
          const imagePath = saved.subtype === "jigsaw" ? saved.imagePath : "";
          if (!imagePath) return "Jigsaw needs a source image.";
          if (cfg.gridSize < 2 || cfg.gridSize > 6) return "Grid size must be between 2 and 6.";
          break;
        }
      }
    }
    return null;
  };

  const save = async () => {
    if (!step || !draft) return;
    const validationError = validate();
    setAnswerError(validationError);
    if (validationError) return;

    const trimmedAnswer = draft.answerText.trim();
    const answer = draft.type === "info" ? null : trimmedAnswer === "" ? null : trimmedAnswer;
    const multiple_choice_options =
      draft.type === "multiple_choice"
        ? [
            trimmedAnswer,
            draft.incorrectOption1Text.trim(),
            draft.incorrectOption2Text.trim(),
            draft.incorrectOption3Text.trim(),
          ]
        : null;

    const config = draft.type === "interactive" ? draft.interactiveConfig : null;
    const savedHint = parseStepHint(step.hints);
    const hints = serializeStepHint({
      text: draft.hintText,
      delaySeconds: parseInt(draft.hintDelaySecondsText, 10) || 30,
      imagePath: savedHint?.image,
    });

    const next: PuzzleStep = {
      ...step,
      type: draft.type,
      content: draft.content,
      answer,
      multiple_choice_options,
      notes: draft.notes || null,
      hints,
      config,
    };

    await onUpdate(next);
  };

  if (!step || !draft) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Step Editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a step to edit.
        </Typography>
      </Box>
    );
  }

  const stepImagePath = step.image_path || null;
  const savedInteractiveConfig = parseInteractiveConfig(step.config);
  const overlayImagePath =
    savedInteractiveConfig.subtype === "camera_overlay" &&
    savedInteractiveConfig.overlayImagePath
      ? savedInteractiveConfig.overlayImagePath
      : null;
  const referenceImagePath =
    savedInteractiveConfig.subtype === "camera_overlay" &&
    savedInteractiveConfig.referenceImagePath
      ? savedInteractiveConfig.referenceImagePath
      : null;
  const jigsawImagePath =
    savedInteractiveConfig.subtype === "jigsaw" && savedInteractiveConfig.imagePath
      ? savedInteractiveConfig.imagePath
      : null;
  const savedHint = parseStepHint(step.hints);
  const hintImagePath = savedHint?.image ?? null;
  const isQuestion = isQuestionStepType(draft.type);
  const isInteractive = draft.type === "interactive";
  const showAnswerRow =
    isQuestion ||
    draft.type === "multiple_choice" ||
    draft.type === "qr" ||
    (isInteractive && (draft.interactiveConfig.subtype === "camera_overlay" || draft.interactiveConfig.subtype === "code_wheel"));

  const mobileInputProps = compactMobile
    ? ({ inputProps: { style: { fontSize: 16 } } } as const)
    : {};

  const scrollFieldIntoView = (el: EventTarget | null) => {
    if (!compactMobile) return;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  };

  const contentSubtitle = draft.type;
  const playerImageSubtitle = stepImagePath ? "Has image" : "None";
  const hintsSubtitle =
    draft.hintText.trim() || hintImagePath ? "Configured" : "None";
  const notesSubtitle = draft.notes.trim() ? "Has notes" : "Empty";
  const locationSubtitle =
    step.latitude != null && step.longitude != null ? "Set" : "None";

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Edit Step
      </Typography>
      <Divider />

      <Box onFocusCapture={(e) => scrollFieldIntoView(e.target)}>
        <EditorAccordion
          section="content"
          expandedSection={expandedSection}
          onExpand={setExpandedSection}
          title="Content"
          subtitle={contentSubtitle}
        >
          <Stack spacing={2}>
            <FormControl size="small">
              <InputLabel id="step-type-label">Type</InputLabel>
              <Select
                labelId="step-type-label"
                label="Type"
                value={isQuestion ? "question" : draft.type}
                onChange={(e) => {
                  const v = e.target.value as PuzzleStepType | "question";
                  if (v === "question") setDraft({ type: "text" });
                  else setDraft({ type: v });
                }}
              >
                <MenuItem value="info">info</MenuItem>
                <MenuItem value="question">question</MenuItem>
                <MenuItem value="qr">qr-code</MenuItem>
                <MenuItem value="multiple_choice">multiple-choice</MenuItem>
                <MenuItem value="interactive">interactive</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Content"
              value={draft.content}
              onChange={(e) => setDraft({ content: e.target.value })}
              multiline
              minRows={4}
              size="small"
              {...mobileInputProps}
            />

            {showAnswerRow && (
              <FormControl
                size="small"
                fullWidth
                error={
                  !!answerError &&
                  (isQuestion || draft.type === "qr" || draft.type === "multiple_choice")
                }
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    label={draft.type === "qr" ? "QR payload" : "Answer"}
                    value={draft.answerText}
                    onChange={(e) => setDraft({ answerText: e.target.value })}
                    placeholder={
                      draft.type === "number"
                        ? "e.g. 42"
                        : draft.type === "qr"
                          ? "QR payload / code"
                          : "answer text"
                    }
                    size="small"
                    fullWidth
                    sx={{ flex: 1 }}
                    {...mobileInputProps}
                    error={
                      !!answerError &&
                      (isQuestion || draft.type === "qr" || draft.type === "multiple_choice")
                    }
                  />
                  {isQuestion && (
                    <FormControlLabel
                      sx={{ mt: 0.5, flexShrink: 0, mr: 0 }}
                      control={
                        <Checkbox
                          size="small"
                          checked={draft.type === "number"}
                          onChange={(_, checked) =>
                            setDraft({ type: checked ? "number" : "text" })
                          }
                        />
                      }
                      label="Number"
                    />
                  )}
                </Box>
                {!!answerError && (isQuestion || draft.type === "qr") && (
                  <FormHelperText>{answerError}</FormHelperText>
                )}
              </FormControl>
            )}

            {draft.type === "multiple_choice" && (
              <FormControl size="small" fullWidth error={!!answerError}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Incorrect options
                </Typography>
                <Stack spacing={1}>
                  <TextField
                    value={draft.incorrectOption1Text}
                    onChange={(e) => setDraft({ incorrectOption1Text: e.target.value })}
                    placeholder="Option A"
                    size="small"
                    fullWidth
                    error={!!answerError}
                    {...mobileInputProps}
                  />
                  <TextField
                    value={draft.incorrectOption2Text}
                    onChange={(e) => setDraft({ incorrectOption2Text: e.target.value })}
                    placeholder="Option B"
                    size="small"
                    fullWidth
                    error={!!answerError}
                    {...mobileInputProps}
                  />
                  <TextField
                    value={draft.incorrectOption3Text}
                    onChange={(e) => setDraft({ incorrectOption3Text: e.target.value })}
                    placeholder="Option C"
                    size="small"
                    fullWidth
                    error={!!answerError}
                    {...mobileInputProps}
                  />
                </Stack>
                {!!answerError && <FormHelperText>{answerError}</FormHelperText>}
              </FormControl>
            )}

            {isInteractive && (
              <InteractiveConfigEditor
                config={draft.interactiveConfig}
                answerError={answerError}
                onChange={(next) =>
                  setDraft({
                    interactiveSubtype: next.subtype,
                    interactiveConfig: next,
                  })
                }
                mobileInputProps={mobileInputProps}
                stepId={step.id}
                overlayImagePath={overlayImagePath}
                referenceImagePath={referenceImagePath}
                jigsawImagePath={jigsawImagePath}
                getImageUrl={getImageUrl}
                onPickOverlayFile={async (file) => {
                  await onSetOverlayImage({ stepId: step.id, file });
                }}
                onRemoveOverlayImage={() => {
                  void onRemoveOverlayImage({ stepId: step.id });
                }}
                onPickReferenceFile={async (file) => {
                  await onSetOverlayReferenceImage({ stepId: step.id, file });
                }}
                onRemoveReferenceImage={() => {
                  void onRemoveOverlayReferenceImage({ stepId: step.id });
                }}
                onPickJigsawFile={async (file) => {
                  await onSetJigsawImage({ stepId: step.id, file });
                }}
                onRemoveJigsawImage={() => {
                  void onRemoveJigsawImage({ stepId: step.id });
                }}
                onUploadSymbolFiles={async (files) => {
                  await onUploadSymbolImages({ stepId: step.id, files });
                }}
                onRemoveSymbolAtIndex={async (symbolIndex) => {
                  await onRemoveSymbolImage({ stepId: step.id, symbolIndex });
                }}
              />
            )}
          </Stack>
        </EditorAccordion>

        <EditorAccordion
          section="playerImage"
          expandedSection={expandedSection}
          onExpand={setExpandedSection}
          title="Player image"
          subtitle={playerImageSubtitle}
        >
          <ImageUploadBlock
            label="Player image"
            imagePath={stepImagePath}
            imageCacheKey={stepImagePath ? `step-image:${step.id}` : undefined}
            getImageUrl={getImageUrl}
            emptyLabel="No player image yet."
            uploadLabel="Upload player image"
            replaceLabel="Replace player image"
            removeLabel="Remove player image"
            caption="Shown to the player above the question. Crop to 4:3 (1200×900). QR steps do not display this image in the app."
            objectFit="contain"
            onPickFile={async (file) => {
              await onSetImage({ stepId: step.id, file });
            }}
            onRemove={async () => {
              await onRemoveImage({ stepId: step.id });
            }}
          />
        </EditorAccordion>

        <EditorAccordion
          section="hints"
          expandedSection={expandedSection}
          onExpand={setExpandedSection}
          title="Hints"
          subtitle={hintsSubtitle}
        >
          <Stack spacing={2}>
            <TextField
              label="Hint text"
              value={draft.hintText}
              onChange={(e) => setDraft({ hintText: e.target.value })}
              multiline
              minRows={2}
              size="small"
              placeholder="e.g. Look at the blue door on the left"
              {...mobileInputProps}
            />
            <TextField
              label="Delay before hint (seconds)"
              value={draft.hintDelaySecondsText}
              onChange={(e) => setDraft({ hintDelaySecondsText: e.target.value })}
              size="small"
              type="number"
              inputProps={{ min: 0 }}
              {...mobileInputProps}
            />
            <ImageUploadBlock
              label="Hint image (optional)"
              imagePath={hintImagePath}
              imageCacheKey={hintImagePath ? `step-hint:${step.id}` : undefined}
              getImageUrl={getImageUrl}
              emptyLabel="No hint image yet."
              uploadLabel="Upload hint image"
              replaceLabel="Replace hint image"
              removeLabel="Remove hint image"
              caption="Optional image shown with the hint after the delay. Crop to 4:3 (1200×900)."
              objectFit="contain"
              onPickFile={async (file) => {
                await onSetHintImage({ stepId: step.id, file });
              }}
              onRemove={() => {
                void onRemoveHintImage({ stepId: step.id });
              }}
            />
          </Stack>
        </EditorAccordion>

        <EditorAccordion
          section="notes"
          expandedSection={expandedSection}
          onExpand={setExpandedSection}
          title="Notes"
          subtitle={notesSubtitle}
        >
          <TextField
            label="Admin notes (not shown to player)"
            value={draft.notes}
            onChange={(e) => setDraft({ notes: e.target.value })}
            multiline
            minRows={3}
            size="small"
            placeholder="e.g. QR is on blue door"
            fullWidth
            {...mobileInputProps}
          />
        </EditorAccordion>

        <EditorAccordion
          section="location"
          expandedSection={expandedSection}
          onExpand={setExpandedSection}
          title="Location"
          subtitle={locationSubtitle}
        >
          <Stack spacing={1}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Latitude"
                value={draft.latText}
                onChange={(e) => setDraft({ latText: e.target.value })}
                size="small"
                fullWidth
                inputMode="decimal"
                {...mobileInputProps}
              />
              <TextField
                label="Longitude"
                value={draft.lngText}
                onChange={(e) => setDraft({ lngText: e.target.value })}
                size="small"
                fullWidth
                inputMode="decimal"
                {...mobileInputProps}
              />
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={async () => {
                const lat = parseOptionalNumber(draft.latText);
                const lng = parseOptionalNumber(draft.lngText);
                const pinned = step.type === "info" && step.order_index === 0;

                if (pinned && (lat === null || lng === null)) {
                  setMapError("The first info step must have latitude and longitude.");
                  return;
                }
                if ((lat === null) !== (lng === null)) {
                  setMapError("Provide both latitude and longitude (or clear both).");
                  return;
                }
                setMapError(null);
                await onUpdate({ ...step, latitude: lat, longitude: lng });
              }}
            >
              Apply lat/lon
            </Button>

            {placementStepId === step.id ? (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={onCancelPlacement}
              >
                Cancel placement
              </Button>
            ) : (
              <Button variant="outlined" size="small" onClick={onStartPlacement}>
                Set location on map
              </Button>
            )}
            {step.latitude != null && step.longitude != null && (
              <Button
                variant="text"
                color="secondary"
                size="small"
                disabled={step.type === "info" && step.order_index === 0}
                onClick={async () => {
                  await onUpdate({ ...step, latitude: null, longitude: null });
                }}
              >
                Remove map location
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              Optional. Steps can omit coordinates; when set, the marker appears on the map trail.
            </Typography>
          </Stack>
        </EditorAccordion>

        {!!mapError && (
          <Typography variant="body2" color="error">
            {mapError}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button variant="contained" onClick={save} disabled={!dirty} fullWidth>
            Update
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={step.type === "info" && step.order_index === 0}
            onClick={async () => {
              if (!confirm("Delete this step? This cannot be undone.")) return;
              await onDeleteStep(step.id);
            }}
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

