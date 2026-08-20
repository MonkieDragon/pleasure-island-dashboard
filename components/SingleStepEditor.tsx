import { useEffect, useMemo, useState } from "react";
import {
  PuzzleStep,
  PuzzleStepType,
  isPuzzleStepType,
  isQuestionStepType,
  isInteractiveSubtype,
  INTERACTIVE_SUBTYPES,
  INTERACTIVE_SUBTYPE_LABELS,
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
  TextField,
  Typography,
} from "@mui/material";

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
  interactiveSubtype: InteractiveSubtype;
  interactiveConfig: InteractiveConfig;
};

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
  onUploadSymbolImages: (input: {
    stepId: string;
    files: File[];
  }) => Promise<void> | void;
  onRemoveSymbolImage: (input: {
    stepId: string;
    symbolIndex: number;
  }) => Promise<void> | void;
  getImageUrl: (path: string) => string;
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

  return {
    type,
    content: step.content ?? "",
    notes: step.notes ?? "",
    answerText,
    ...incorrectOptionsFromStep(step.multiple_choice_options, step.answer),
    latText: step.latitude == null ? "" : String(step.latitude),
    lngText: step.longitude == null ? "" : String(step.longitude),
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
  overlayImagePath,
  getImageUrl,
  onPickOverlayFile,
  onRemoveOverlayImage,
  onUploadSymbolFiles,
  onRemoveSymbolAtIndex,
}: {
  config: InteractiveConfig;
  answerError: string | null;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
  overlayImagePath: string | null;
  getImageUrl: (path: string) => string;
  onPickOverlayFile: (file: File) => Promise<void> | void;
  onRemoveOverlayImage: () => void;
  onUploadSymbolFiles: (files: File[]) => Promise<void> | void;
  onRemoveSymbolAtIndex: (symbolIndex: number) => Promise<void> | void;
}) {
  const setSubtype = (subtype: InteractiveSubtype) => {
    switch (subtype) {
      case "camera_overlay":
        onChange({
          subtype: "camera_overlay",
          overlayImagePath: overlayImagePath ?? "",
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
        onChange({ subtype: "jigsaw", imagePath: "", gridSize: 3 });
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
        <CameraOverlayFields
          config={config}
          onChange={onChange}
          overlayImagePath={overlayImagePath}
          getImageUrl={getImageUrl}
          onPickOverlayFile={onPickOverlayFile}
          onRemoveOverlayImage={onRemoveOverlayImage}
        />
      )}
      {config.subtype === "symbol_codex" && (
        <SymbolCodexFields
          config={config}
          onChange={onChange}
          mobileInputProps={mobileInputProps}
          getImageUrl={getImageUrl}
          onUploadSymbolFiles={onUploadSymbolFiles}
          onRemoveSymbolAtIndex={onRemoveSymbolAtIndex}
        />
      )}
      {config.subtype === "code_wheel" && (
        <Typography variant="caption" color="text.secondary">
          The cipher disk always uses A-Z (outer) and 1-26 (inner). Put the cipher key and encoded message in the content/hints fields. The decoded word goes in the Answer field above.
        </Typography>
      )}
      {config.subtype === "jigsaw" && (
        <JigsawFields config={config} onChange={onChange} mobileInputProps={mobileInputProps} />
      )}

      {answerError && <Typography variant="body2" color="error">{answerError}</Typography>}
    </Box>
  );
}

function CameraOverlayFields({
  config,
  onChange,
  overlayImagePath,
  getImageUrl,
  onPickOverlayFile,
  onRemoveOverlayImage,
}: {
  config: CameraOverlayConfig;
  onChange: (next: InteractiveConfig) => void;
  overlayImagePath: string | null;
  getImageUrl: (path: string) => string;
  onPickOverlayFile: (file: File) => Promise<void> | void;
  onRemoveOverlayImage: () => void;
}) {
  return (
    <>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Overlay image
        </Typography>
        <Stack spacing={1}>
          {overlayImagePath ? (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
              }}
            >
              <Box
                component="img"
                src={getImageUrl(overlayImagePath)}
                alt="Camera overlay"
                sx={{
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "contain",
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: "action.hover",
                }}
              />
              <Button
                size="small"
                color="error"
                variant="text"
                onClick={() => {
                  void onRemoveOverlayImage();
                }}
              >
                Remove overlay image
              </Button>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No overlay image yet.
            </Typography>
          )}

          <Button component="label" variant="outlined" size="small">
            {overlayImagePath ? "Replace overlay image" : "Upload overlay image"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                await onPickOverlayFile(file);
              }}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            Recommended: 1200×900 PNG, 4:3 aspect ratio (with transparency).
          </Typography>
        </Stack>
      </Box>
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

function SymbolCodexFields({
  config,
  onChange,
  mobileInputProps,
  getImageUrl,
  onUploadSymbolFiles,
  onRemoveSymbolAtIndex,
}: {
  config: SymbolCodexConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
  getImageUrl: (path: string) => string;
  onUploadSymbolFiles: (files: File[]) => Promise<void> | void;
  onRemoveSymbolAtIndex: (symbolIndex: number) => Promise<void> | void;
}) {
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
                    src={getImageUrl(path)}
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
        value={config.answerArray.join(", ")}
        onChange={(e) => {
          const answerArray = e.target.value
            .split(",")
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n));
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
  mobileInputProps,
}: {
  config: JigsawConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
}) {
  return (
    <>
      <TextField
        label="Source image path (Supabase storage)"
        value={config.imagePath}
        onChange={(e) => onChange({ ...config, imagePath: e.target.value })}
        size="small"
        fullWidth
        placeholder="e.g. jigsaw/temple-door.jpg"
        {...mobileInputProps}
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
  onUploadSymbolImages,
  onRemoveSymbolImage,
  getImageUrl,
  compactMobile = false,
}: Props) {
  const [draftByStepId, setDraftByStepId] = useState<Record<string, Draft>>({});
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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

  // Keep camera overlay path in sync after immediate upload/remove.
  useEffect(() => {
    if (!step) return;
    const saved = parseInteractiveConfig(step.config);
    const savedPath =
      saved.subtype === "camera_overlay" ? saved.overlayImagePath : "";
    queueMicrotask(() => {
      setDraftByStepId((prev) => {
        const existing = prev[step.id];
        if (!existing) return prev;
        if (existing.interactiveConfig.subtype !== "camera_overlay") return prev;
        const cfg = existing.interactiveConfig;
        if (cfg.overlayImagePath === savedPath) return prev;
        return {
          ...prev,
          [step.id]: {
            ...existing,
            interactiveConfig: { ...cfg, overlayImagePath: savedPath },
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

  useEffect(() => {
    queueMicrotask(() => {
      setAnswerError(null);
      setMapError(null);
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
        case "camera_overlay":
          if (!cfg.overlayImagePath) return "Camera overlay needs an overlay image.";
          if (a === "") return "Camera overlay needs an answer.";
          break;
        case "symbol_codex":
          if (cfg.symbols.length === 0) return "Symbol codex needs at least one symbol.";
          if (cfg.slotCount < 1) return "Symbol codex needs at least 1 slot.";
          if (cfg.answerArray.length !== cfg.slotCount) return "Answer array length must match slot count.";
          break;
        case "code_wheel":
          if (a === "") return "Code wheel needs an answer (the decoded word).";
          break;
        case "jigsaw":
          if (!cfg.imagePath) return "Jigsaw needs a source image path.";
          if (cfg.gridSize < 2 || cfg.gridSize > 6) return "Grid size must be between 2 and 6.";
          break;
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

    const next: PuzzleStep = {
      ...step,
      type: draft.type,
      content: draft.content,
      answer,
      multiple_choice_options,
      notes: draft.notes || null,
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

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Edit Step
      </Typography>
      <Divider />

      <Stack
        spacing={2}
        onFocusCapture={(e) => scrollFieldIntoView(e.target)}
      >
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
            overlayImagePath={overlayImagePath}
            getImageUrl={getImageUrl}
            onPickOverlayFile={async (file) => {
              await onSetOverlayImage({ stepId: step.id, file });
            }}
            onRemoveOverlayImage={() => {
              void onRemoveOverlayImage({ stepId: step.id });
            }}
            onUploadSymbolFiles={async (files) => {
              await onUploadSymbolImages({ stepId: step.id, files });
            }}
            onRemoveSymbolAtIndex={async (symbolIndex) => {
              await onRemoveSymbolImage({ stepId: step.id, symbolIndex });
            }}
          />
        )}

        <TextField
          label="Notes (admin-only)"
          value={draft.notes}
          onChange={(e) => setDraft({ notes: e.target.value })}
          multiline
          minRows={3}
          size="small"
          placeholder="e.g. QR is on blue door"
          {...mobileInputProps}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Image
          </Typography>
          <Stack spacing={1}>
            {stepImagePath ? (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <Box
                  component="img"
                  src={getImageUrl(stepImagePath)}
                  alt="Step image"
                  sx={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    borderRadius: 1,
                    mb: 1,
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  variant="text"
                  onClick={async () => {
                    await onRemoveImage({ stepId: step.id });
                  }}
                >
                  Remove image
                </Button>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No image yet.
              </Typography>
            )}

            <Button component="label" variant="outlined" size="small">
              {stepImagePath ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  await onSetImage({ stepId: step.id, file });
                }}
              />
            </Button>
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Map location
          </Typography>
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
              <Button
                variant="outlined"
                size="small"
                onClick={onStartPlacement}
              >
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
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Optional. Steps can omit coordinates; when set, the marker appears on the map trail.
          </Typography>
        </Box>

        {!!mapError && (
          <Typography variant="body2" color="error">
            {mapError}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1 }}>
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
      </Stack>
    </Box>
  );
}

