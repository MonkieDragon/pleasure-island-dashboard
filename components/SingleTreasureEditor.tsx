import { useEffect, useMemo, useState } from "react";
import { Treasure } from "@/types/database";
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

const TREASURE_STATUSES = ["available", "assigned", "discovered"] as const;
type TreasureStatus = (typeof TREASURE_STATUSES)[number];

function isTreasureStatus(input: string): input is TreasureStatus {
  return (TREASURE_STATUSES as readonly string[]).includes(input);
}

type Draft = {
  description: string;
  notes: string;
  status: string;
  latText: string;
  lngText: string;
};

type Props = {
  treasure: Treasure | null;
  placementTreasureId: string | null;
  onStartPlacement: () => void;
  onCancelPlacement: () => void;
  onUpdate: (next: Treasure) => Promise<void> | void;
  onSetImage: (input: { treasureId: string; file: File }) => Promise<void> | void;
  onRemoveImage: (input: { treasureId: string }) => Promise<void> | void;
  getImageUrl: (path: string) => string;
  compactMobile?: boolean;
};

function parseOptionalNumber(input: string): number | null {
  const t = input.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toDraft(t: Treasure): Draft {
  return {
    description: t.description ?? "",
    notes: t.notes ?? "",
    status: t.status ?? "",
    latText: String(t.latitude),
    lngText: String(t.longitude),
  };
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function SingleTreasureEditor({
  treasure,
  placementTreasureId,
  onStartPlacement,
  onCancelPlacement,
  onUpdate,
  onSetImage,
  onRemoveImage,
  getImageUrl,
  compactMobile = false,
}: Props) {
  const [draftById, setDraftById] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);

  const draft = useMemo(() => {
    if (!treasure) return null;
    return draftById[treasure.id] ?? toDraft(treasure);
  }, [draftById, treasure]);

  useEffect(() => {
    if (!treasure) return;
    queueMicrotask(() => {
      setDraftById((prev) =>
        prev[treasure.id] ? prev : { ...prev, [treasure.id]: toDraft(treasure) },
      );
    });
  }, [treasure]);

  useEffect(() => {
    if (!treasure) return;
    queueMicrotask(() => {
      setDraftById((prev) => {
        const existing = prev[treasure.id];
        if (!existing) return prev;
        const nextLatText = String(treasure.latitude);
        const nextLngText = String(treasure.longitude);
        if (existing.latText === nextLatText && existing.lngText === nextLngText) {
          return prev;
        }
        return {
          ...prev,
          [treasure.id]: { ...existing, latText: nextLatText, lngText: nextLngText },
        };
      });
    });
  }, [treasure]);

  const dirty = useMemo(() => {
    if (!treasure || !draft) return false;
    const base = toDraft(treasure);
    return (
      base.description !== draft.description ||
      base.notes !== draft.notes ||
      base.status !== draft.status
    );
  }, [draft, treasure]);

  const setDraft = (patch: Partial<Draft>) => {
    if (!treasure || !draft) return;
    setDraftById((prev) => ({
      ...prev,
      [treasure.id]: { ...draft, ...patch },
    }));
  };

  const saveDetails = async () => {
    if (!treasure || !draft) return;
    setError(null);
    const nextStatusRaw = draft.status.trim();
    if (nextStatusRaw !== "" && !isTreasureStatus(nextStatusRaw)) {
      setError(`Status must be one of: ${TREASURE_STATUSES.join(", ")}.`);
      return;
    }
    const next: Treasure = {
      ...treasure,
      description: draft.description.trim() === "" ? null : draft.description.trim(),
      notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
      status: nextStatusRaw === "" ? treasure.status : nextStatusRaw,
    };
    await onUpdate(next);
  };

  const applyLatLng = async () => {
    if (!treasure || !draft) return;
    const lat = parseOptionalNumber(draft.latText);
    const lng = parseOptionalNumber(draft.lngText);
    if (lat === null || lng === null) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }
    setError(null);
    await onUpdate({ ...treasure, latitude: lat, longitude: lng });
  };

  if (!treasure || !draft) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Treasure editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a treasure to edit.
        </Typography>
      </Box>
    );
  }

  const imagePath = treasure.image_path || null;

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
        Edit treasure
      </Typography>
      <Divider />

      <Stack spacing={2} onFocusCapture={(e) => scrollFieldIntoView(e.target)}>
        <Typography variant="subtitle2" color="text.secondary">
          Assignment (read-only)
        </Typography>
        <Typography variant="body2">
          <Box component="span" sx={{ color: "text.secondary", display: "block", fontSize: 12 }}>
            Assigned to
          </Box>
          {treasure.assigned_to ?? "—"}
        </Typography>
        <Typography variant="body2">
          <Box component="span" sx={{ color: "text.secondary", display: "block", fontSize: 12 }}>
            Assigned at
          </Box>
          {formatTs(treasure.assigned_at)}
        </Typography>

        <FormControl size="small">
          <InputLabel id="treasure-status-label">Status</InputLabel>
          <Select
            labelId="treasure-status-label"
            label="Status"
            value={draft.status}
            onChange={(e) => setDraft({ status: String(e.target.value) })}
          >
            {TREASURE_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Choose one of the allowed statuses.</FormHelperText>
        </FormControl>

        <TextField
          label="Description"
          value={draft.description}
          onChange={(e) => setDraft({ description: e.target.value })}
          multiline
          minRows={4}
          size="small"
          {...mobileInputProps}
        />

        <TextField
          label="Notes (admin-only)"
          value={draft.notes}
          onChange={(e) => setDraft({ notes: e.target.value })}
          multiline
          minRows={3}
          size="small"
          {...mobileInputProps}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Image
          </Typography>
          <Stack spacing={1}>
            {imagePath ? (
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
                  src={getImageUrl(imagePath)}
                  alt="Treasure"
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
                    await onRemoveImage({ treasureId: treasure.id });
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
              {imagePath ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  await onSetImage({ treasureId: treasure.id, file });
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

            <Button variant="outlined" size="small" onClick={() => void applyLatLng()}>
              Apply lat/lon
            </Button>

            {placementTreasureId === treasure.id ? (
              <Button variant="outlined" color="warning" size="small" onClick={onCancelPlacement}>
                Cancel placement
              </Button>
            ) : (
              <Button variant="outlined" size="small" onClick={onStartPlacement}>
                Set location on map
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Drag the marker or click “Set location on map” and choose a point.
          </Typography>
        </Box>

        {!!error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        <Button variant="contained" onClick={() => void saveDetails()} disabled={!dirty} fullWidth>
          Update details
        </Button>
      </Stack>
    </Box>
  );
}
