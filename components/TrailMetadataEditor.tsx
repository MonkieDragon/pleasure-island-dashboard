import { useEffect, useState } from "react";
import type { Trail } from "@/types/database";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";

export type TrailMetadataDraft = {
  description: string;
  durationMinutes: string;
  distanceKm: string;
  transportMode: "" | "walk" | "scooter";
  isFree: boolean;
  showTrail: boolean;
  isLoop: boolean;
  highlights: string[];
};

type RouteEstimate = {
  distanceKm: number;
  durationMinutes: number;
};

type Props = {
  trail: Trail;
  onSave: (metadata: TrailMetadataDraft) => Promise<void> | void;
  onEstimateRoute: (
    mode: "walk" | "scooter",
  ) => Promise<RouteEstimate>;
};

function toDraft(trail: Trail): TrailMetadataDraft {
  return {
    description: trail.description ?? "",
    durationMinutes:
      trail.duration_minutes == null ? "" : String(trail.duration_minutes),
    distanceKm: trail.distance_km == null ? "" : String(trail.distance_km),
    transportMode:
      trail.transport_mode === "walk" || trail.transport_mode === "scooter"
        ? trail.transport_mode
        : "walk",
    isFree: trail.is_free ?? true,
    showTrail: trail.show_trail ?? true,
    isLoop: trail.is_loop ?? false,
    highlights: Array.isArray(trail.highlights) ? [...trail.highlights] : [],
  };
}

export default function TrailMetadataEditor({
  trail,
  onSave,
  onEstimateRoute,
}: Props) {
  const [draft, setDraft] = useState<TrailMetadataDraft>(() => toDraft(trail));
  const [newHighlight, setNewHighlight] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(trail));
  }, [
    trail.id,
    trail.description,
    trail.duration_minutes,
    trail.distance_km,
    trail.transport_mode,
    trail.is_free,
    trail.show_trail,
    trail.is_loop,
    trail.highlights,
  ]);

  useEffect(() => {
    setEstimate(null);
    setEstimateError(null);
  }, [trail.id, draft.transportMode]);

  const base = toDraft(trail);
  const dirty =
    draft.description !== base.description ||
    draft.durationMinutes !== base.durationMinutes ||
    draft.distanceKm !== base.distanceKm ||
    draft.transportMode !== base.transportMode ||
    draft.isFree !== base.isFree ||
    draft.showTrail !== base.showTrail ||
    draft.isLoop !== base.isLoop ||
    draft.highlights.join("\n") !== base.highlights.join("\n");

  const transportLabel =
    draft.transportMode === "scooter" ? "scooter" : "walking";

  const handleEstimate = async () => {
    const mode = draft.transportMode === "scooter" ? "scooter" : "walk";
    setEstimating(true);
    setEstimateError(null);
    try {
      const result = await onEstimateRoute(mode);
      setEstimate(result);
    } catch (e) {
      setEstimate(null);
      setEstimateError(e instanceof Error ? e.message : "Estimate failed.");
    } finally {
      setEstimating(false);
    }
  };

  const addHighlight = () => {
    const t = newHighlight.trim();
    if (!t) return;
    setDraft((d) => ({ ...d, highlights: [...d.highlights, t] }));
    setNewHighlight("");
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Trail details (player-facing)
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <TextField
          label="Description"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          multiline
          minRows={2}
          size="small"
          fullWidth
        />
        <TextField
          label="Duration (minutes)"
          value={draft.durationMinutes}
          onChange={(e) =>
            setDraft((d) => ({ ...d, durationMinutes: e.target.value }))
          }
          size="small"
          type="number"
          fullWidth
        />
        <TextField
          label="Distance (km)"
          value={draft.distanceKm}
          onChange={(e) => setDraft((d) => ({ ...d, distanceKm: e.target.value }))}
          size="small"
          type="number"
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <InputLabel id="trail-transport-mode-label">Transport</InputLabel>
          <Select
            labelId="trail-transport-mode-label"
            label="Transport"
            value={draft.transportMode || "walk"}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                transportMode: e.target.value as TrailMetadataDraft["transportMode"],
              }))
            }
          >
            <MenuItem value="walk">Walking</MenuItem>
            <MenuItem value="scooter">Scooter</MenuItem>
          </Select>
        </FormControl>
        <Stack spacing={0.5}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            disabled={estimating}
            onClick={() => void handleEstimate()}
          >
            {estimating ? "Estimating…" : "Estimate from map"}
          </Button>
          {estimate ? (
            <Typography variant="caption" color="text.secondary">
              ~{estimate.distanceKm} km · ~{estimate.durationMinutes} min (
              {transportLabel}). Travel time only — excludes stops and looking
              around. Copy into the fields above if you want.
            </Typography>
          ) : null}
          {estimateError ? (
            <Typography variant="caption" color="error">
              {estimateError}
            </Typography>
          ) : null}
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.isFree}
              onChange={(_, checked) => setDraft((d) => ({ ...d, isFree: checked }))}
            />
          }
          label="Free trail"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.showTrail}
              onChange={(_, checked) =>
                setDraft((d) => ({ ...d, showTrail: checked }))
              }
            />
          }
          label="Show route line on map"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.isLoop}
              onChange={(_, checked) => setDraft((d) => ({ ...d, isLoop: checked }))}
            />
          }
          label="Loop (returns to start)"
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Highlights
          </Typography>
          <Stack spacing={1}>
            {draft.highlights.map((h, i) => (
              <Stack
                key={`${i}-${h.slice(0, 12)}`}
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "flex-start" }}
              >
                <TextField
                  value={h}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft((d) => {
                      const next = [...d.highlights];
                      next[i] = value;
                      return { ...d, highlights: next };
                    });
                  }}
                  size="small"
                  fullWidth
                  multiline
                />
                <IconButton
                  size="small"
                  aria-label="Remove highlight"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      highlights: d.highlights.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Stack direction="row" spacing={1}>
              <TextField
                label="New highlight"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                size="small"
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHighlight();
                  }
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={addHighlight}
                disabled={!newHighlight.trim()}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Button
          variant="contained"
          size="small"
          fullWidth
          disabled={!dirty}
          onClick={() => void onSave(draft)}
        >
          Save trail details
        </Button>
      </Stack>
    </Box>
  );
}
