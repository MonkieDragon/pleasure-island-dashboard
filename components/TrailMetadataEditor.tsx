import { useEffect, useState } from "react";
import type { Trail } from "@/types/database";
import {
  Box,
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
};

type Props = {
  trail: Trail;
  onSave: (metadata: TrailMetadataDraft) => Promise<void> | void;
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
  };
}

export default function TrailMetadataEditor({ trail, onSave }: Props) {
  const [draft, setDraft] = useState<TrailMetadataDraft>(() => toDraft(trail));

  useEffect(() => {
    setDraft(toDraft(trail));
  }, [
    trail.id,
    trail.description,
    trail.duration_minutes,
    trail.distance_km,
    trail.transport_mode,
    trail.is_free,
  ]);

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
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.isFree}
              onChange={(_, checked) => setDraft((d) => ({ ...d, isFree: checked }))}
            />
          }
          label="Free trail"
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => void onSave(draft)}
        >
          Save trail details
        </Typography>
      </Stack>
    </Box>
  );
}
