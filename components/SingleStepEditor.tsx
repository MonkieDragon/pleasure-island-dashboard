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
  type CodeWheelConfig,
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
  multipleChoiceOptionsText: string;
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
  getImageUrl: (path: string) => string;
  /** Larger inputs + scroll focused field into view (mobile editor panel). */
  compactMobile?: boolean;
};

function toLines(input: string): string[] {
  return input
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

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

function toDraft(step: PuzzleStep): Draft {
  const type: PuzzleStepType = isPuzzleStepType(step.type) ? step.type : "text";
  const rawAnswer = step.answer;

  const answerText = rawAnswer == null ? "" : String(rawAnswer);
  const optionsText = Array.isArray(step.multiple_choice_options)
    ? step.multiple_choice_options.join("\n")
    : "";

  const config = parseInteractiveConfig(step.config);

  return {
    type,
    content: step.content ?? "",
    notes: step.notes ?? "",
    answerText,
    multipleChoiceOptionsText: optionsText,
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
}: {
  config: InteractiveConfig;
  answerError: string | null;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
}) {
  const setSubtype = (subtype: InteractiveSubtype) => {
    switch (subtype) {
      case "camera_overlay":
        onChange({ subtype: "camera_overlay", overlayImagePath: "", overlayOpacity: 0.5 });
        break;
      case "symbol_codex":
        onChange({ subtype: "symbol_codex", symbols: [], slotCount: 3, solution: [] });
        break;
      case "code_wheel":
        onChange({ subtype: "code_wheel", rings: [{ symbols: [] }], solution: [0] });
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
        <CameraOverlayFields config={config} onChange={onChange} mobileInputProps={mobileInputProps} />
      )}
      {config.subtype === "symbol_codex" && (
        <SymbolCodexFields config={config} onChange={onChange} mobileInputProps={mobileInputProps} />
      )}
      {config.subtype === "code_wheel" && (
        <CodeWheelFields config={config} onChange={onChange} mobileInputProps={mobileInputProps} />
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
  mobileInputProps,
}: {
  config: CameraOverlayConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
}) {
  return (
    <>
      <TextField
        label="Overlay image path (Supabase storage)"
        value={config.overlayImagePath}
        onChange={(e) => onChange({ ...config, overlayImagePath: e.target.value })}
        size="small"
        fullWidth
        placeholder="e.g. overlays/skyline-cebu.png"
        {...mobileInputProps}
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

function SymbolCodexFields({
  config,
  onChange,
  mobileInputProps,
}: {
  config: SymbolCodexConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
}) {
  return (
    <>
      <TextField
        label="Symbols (one per line, image path or key)"
        value={config.symbols.join("\n")}
        onChange={(e) => {
          const symbols = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
          onChange({ ...config, symbols });
        }}
        multiline
        minRows={3}
        size="small"
        placeholder={"symbol-a\nsymbol-b\nsymbol-c"}
        {...mobileInputProps}
      />
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
        label="Solution (comma-separated symbol indices, 0-based)"
        value={config.solution.join(", ")}
        onChange={(e) => {
          const solution = e.target.value
            .split(",")
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n));
          onChange({ ...config, solution });
        }}
        size="small"
        placeholder="e.g. 0, 2, 1"
        {...mobileInputProps}
      />
    </>
  );
}

function CodeWheelFields({
  config,
  onChange,
  mobileInputProps,
}: {
  config: CodeWheelConfig;
  onChange: (next: InteractiveConfig) => void;
  mobileInputProps: Record<string, unknown>;
}) {
  const updateRing = (idx: number, symbols: string[]) => {
    const rings = [...config.rings];
    rings[idx] = { symbols };
    onChange({ ...config, rings });
  };

  const addRing = () => {
    const rings = [...config.rings, { symbols: [] }];
    const solution = [...config.solution, 0];
    onChange({ ...config, rings, solution });
  };

  const removeRing = (idx: number) => {
    const rings = config.rings.filter((_, i) => i !== idx);
    const solution = config.solution.filter((_, i) => i !== idx);
    onChange({ ...config, rings: rings.length ? rings : [{ symbols: [] }], solution: solution.length ? solution : [0] });
  };

  return (
    <>
      {config.rings.map((ring, idx) => (
        <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            label={`Ring ${idx + 1} symbols (comma-separated)`}
            value={ring.symbols.join(", ")}
            onChange={(e) => {
              const symbols = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              updateRing(idx, symbols);
            }}
            size="small"
            fullWidth
            placeholder="A, B, C, D"
            {...mobileInputProps}
          />
          {config.rings.length > 1 && (
            <Button size="small" color="error" onClick={() => removeRing(idx)} sx={{ minWidth: 0, mt: 0.5 }}>
              &times;
            </Button>
          )}
        </Box>
      ))}
      <Button size="small" variant="outlined" onClick={addRing}>
        Add ring
      </Button>
      <TextField
        label="Solution (comma-separated index per ring, 0-based)"
        value={config.solution.join(", ")}
        onChange={(e) => {
          const solution = e.target.value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
          onChange({ ...config, solution });
        }}
        size="small"
        placeholder="e.g. 2, 0, 3"
        {...mobileInputProps}
      />
    </>
  );
}

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
      base.multipleChoiceOptionsText !== draft.multipleChoiceOptionsText ||
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
      const options = toLines(draft.multipleChoiceOptionsText);
      if (options.length !== 4) return "Multiple choice steps need exactly 4 options.";
      if (a === "") return "Multiple choice steps need a correct answer.";
      if (!options.includes(a)) return "Correct answer must match one of the options exactly.";
    }
    if (draft.type === "interactive") {
      const cfg = draft.interactiveConfig;
      switch (cfg.subtype) {
        case "camera_overlay":
          if (!cfg.overlayImagePath) return "Camera overlay needs an overlay image path.";
          if (a === "") return "Camera overlay needs an answer.";
          break;
        case "symbol_codex":
          if (cfg.symbols.length === 0) return "Symbol codex needs at least one symbol.";
          if (cfg.slotCount < 1) return "Symbol codex needs at least 1 slot.";
          if (cfg.solution.length !== cfg.slotCount) return "Solution length must match slot count.";
          break;
        case "code_wheel":
          if (cfg.rings.length === 0) return "Code wheel needs at least one ring.";
          if (cfg.solution.length !== cfg.rings.length) return "Solution length must match number of rings.";
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
        ? (() => {
            const lines = toLines(draft.multipleChoiceOptionsText);
            return lines.length ? lines : null;
          })()
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
  const isQuestion = isQuestionStepType(draft.type);
  const isInteractive = draft.type === "interactive";
  const showAnswerRow =
    isQuestion ||
    draft.type === "multiple_choice" ||
    draft.type === "qr" ||
    (isInteractive && draft.interactiveConfig.subtype === "camera_overlay");

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
            {!!answerError &&
              (isQuestion || draft.type === "qr" || draft.type === "multiple_choice") && (
                <FormHelperText>{answerError}</FormHelperText>
              )}
          </FormControl>
        )}

        {draft.type === "multiple_choice" && (
          <TextField
            label="Multiple choice options (exactly 4, one per line)"
            value={draft.multipleChoiceOptionsText}
            onChange={(e) => setDraft({ multipleChoiceOptionsText: e.target.value })}
            placeholder={"Option A\nOption B\nOption C"}
            multiline
            minRows={4}
            size="small"
            {...mobileInputProps}
          />
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

