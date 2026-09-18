import { useEffect, useState } from "react";
import type { Trail, TrailGroup } from "@/types/database";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";

export type TrailMetadataDraft = {
  description: string;
  durationMinutes: string;
  distanceKm: string;
  transportMode: "" | "walk" | "scooter";
  isFree: boolean;
  trailGroupId: string | null;
  variantLabel: string;
  variantSort: string;
};

type RouteEstimate = {
  distanceKm: number;
  durationMinutes: number;
};

type Props = {
  trail: Trail;
  trailGroups: TrailGroup[];
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
    trailGroupId: trail.trail_group_id,
    variantLabel: trail.variant_label ?? "",
    variantSort: String(trail.variant_sort ?? 0),
  };
}

export default function TrailMetadataEditor({
  trail,
  trailGroups,
  onSave,
  onEstimateRoute,
}: Props) {
  const [draft, setDraft] = useState<TrailMetadataDraft>(() => toDraft(trail));
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const regionGroups = trailGroups.filter((g) => g.region_id === trail.region_id);

  useEffect(() => {
    setDraft(toDraft(trail));
  }, [
    trail.id,
    trail.description,
    trail.duration_minutes,
    trail.distance_km,
    trail.transport_mode,
    trail.is_free,
    trail.trail_group_id,
    trail.variant_label,
    trail.variant_sort,
  ]);

  useEffect(() => {
    setEstimate(null);
    setEstimateError(null);
  }, [trail.id, draft.transportMode]);

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

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Trail details (player-facing)
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="trail-group-label">Trail group</InputLabel>
          <Select
            labelId="trail-group-label"
            label="Trail group"
            value={draft.trailGroupId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setDraft((d) => ({
                ...d,
                trailGroupId: value === "" ? null : value,
                variantLabel:
                  value === ""
                    ? ""
                    : d.variantLabel.trim() || "Classic",
              }));
            }}
          >
            <MenuItem value="">Standalone (no group)</MenuItem>
            {regionGroups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {draft.trailGroupId ? (
          <>
            <TextField
              label="Variant label"
              value={draft.variantLabel}
              onChange={(e) =>
                setDraft((d) => ({ ...d, variantLabel: e.target.value }))
              }
              size="small"
              fullWidth
              helperText="Shown when players pick a package (e.g. Classic)"
            />
            <TextField
              label="Variant sort"
              value={draft.variantSort}
              onChange={(e) =>
                setDraft((d) => ({ ...d, variantSort: e.target.value }))
              }
              size="small"
              type="number"
              fullWidth
            />
          </>
        ) : null}
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
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={() => void onSave(draft)}
        >
          Save trail details
        </Button>
      </Stack>
    </Box>
  );
}
