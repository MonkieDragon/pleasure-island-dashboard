import { useEffect, useMemo, useState } from "react";
import { PuzzleStep, PuzzleStepType, isPuzzleStepType } from "@/types/database";
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
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

function toDraft(step: PuzzleStep): Draft {
  const type: PuzzleStepType = isPuzzleStepType(step.type) ? step.type : "text";
  const rawAnswer = step.answer;

  const answerText = rawAnswer == null ? "" : String(rawAnswer);
  const optionsText = Array.isArray(step.multiple_choice_options)
    ? step.multiple_choice_options.join("\n")
    : "";
  return {
    type,
    content: step.content ?? "",
    notes: step.notes ?? "",
    answerText,
    multipleChoiceOptionsText: optionsText,
    latText: step.latitude == null ? "" : String(step.latitude),
    lngText: step.longitude == null ? "" : String(step.longitude),
  };
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
}: Props) {
  const [draftByStepId, setDraftByStepId] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);

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
    if (!step || !draft) return;
    // #region agent log
    fetch('http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'790358'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H4_editor_draft_stale',location:'components/SingleStepEditor.tsx:draft_vs_step',message:'Step coords vs draft coords',data:{stepId:step.id,stepLat:step.latitude,stepLng:step.longitude,draftLat:draft.latText,draftLng:draft.lngText},timestamp:Date.now()})}).catch(()=>{});
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H4_editor_draft_stale',location:'components/SingleStepEditor.tsx:draft_vs_step:relay',message:'Step coords vs draft coords (relay)',data:{stepId:step.id,stepLat:step.latitude,stepLng:step.longitude,draftLat:draft.latText,draftLng:draft.lngText},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [draft, step]);

  const dirty = useMemo(() => {
    if (!step || !draft) return false;
    const base = toDraft(step);
    return (
      base.type !== draft.type ||
      base.content !== draft.content ||
      base.notes !== draft.notes ||
      base.answerText !== draft.answerText ||
      base.multipleChoiceOptionsText !== draft.multipleChoiceOptionsText
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
      // Accept integers/decimals, optional leading minus.
      if (a === "") return "Number steps need an answer.";
      if (!/^-?\d+(\.\d+)?$/.test(a)) {
        return "Answer must be numeric.";
      }
    }
    if (draft.type === "text") {
      if (a === "") return "Text steps need an answer.";
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
    return null;
  };

  const save = async () => {
    if (!step || !draft) return;
    const validationError = validate();
    setError(validationError);
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

    const next: PuzzleStep = {
      ...step,
      type: draft.type,
      content: draft.content,
      answer,
      multiple_choice_options,
      notes: draft.notes || null,
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

  const stepImagePath = step.image_url || null;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Edit Step
      </Typography>
      <Divider />

      <Stack spacing={2}>
        <FormControl size="small">
          <InputLabel id="step-type-label">Type</InputLabel>
          <Select
            labelId="step-type-label"
            label="Type"
            value={draft.type}
            onChange={(e) => setDraft({ type: e.target.value as PuzzleStepType })}
          >
            <MenuItem value="info">info</MenuItem>
            <MenuItem value="text">text</MenuItem>
            <MenuItem value="number">number</MenuItem>
            <MenuItem value="qr">qr-code</MenuItem>
            <MenuItem value="multiple_choice">multiple-choice</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Content"
          value={draft.content}
          onChange={(e) => setDraft({ content: e.target.value })}
          multiline
          minRows={4}
          size="small"
        />

        {(draft.type === "number" ||
          draft.type === "multiple_choice" ||
          draft.type === "text" ||
          draft.type === "qr") && (
          <FormControl
            size="small"
            error={
              !!error &&
              (draft.type === "number" ||
                draft.type === "text" ||
                draft.type === "qr" ||
                draft.type === "multiple_choice")
            }
          >
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
              error={
                !!error &&
                (draft.type === "number" ||
                  draft.type === "text" ||
                  draft.type === "qr" ||
                  draft.type === "multiple_choice")
              }
            />
            {!!error &&
              (draft.type === "number" ||
                draft.type === "text" ||
                draft.type === "qr" ||
                draft.type === "multiple_choice") && (
              <FormHelperText>{error}</FormHelperText>
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
              />
              <TextField
                label="Longitude"
                value={draft.lngText}
                onChange={(e) => setDraft({ lngText: e.target.value })}
                size="small"
                fullWidth
                inputMode="decimal"
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
                  setError("The first info step must have latitude and longitude.");
                  return;
                }
                if ((lat === null) !== (lng === null)) {
                  setError("Provide both latitude and longitude (or clear both).");
                  return;
                }
                setError(null);
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

        {!!error && draft.type !== "number" && (
          <Typography variant="body2" color="error">
            {error}
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

