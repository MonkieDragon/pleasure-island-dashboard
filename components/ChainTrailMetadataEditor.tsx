import { useEffect, useState } from "react";
import type { PuzzleChain } from "@/types/database";
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

export type ChainTrailMetadata = {
  description: string;
  durationMinutes: string;
  distanceKm: string;
  transportMode: "" | "walk" | "scooter";
  isFree: boolean;
};

type Props = {
  chain: PuzzleChain;
  onSave: (metadata: ChainTrailMetadata) => Promise<void> | void;
};

function toDraft(chain: PuzzleChain): ChainTrailMetadata {
  return {
    description: chain.description ?? "",
    durationMinutes:
      chain.duration_minutes == null ? "" : String(chain.duration_minutes),
    distanceKm: chain.distance_km == null ? "" : String(chain.distance_km),
    transportMode:
      chain.transport_mode === "walk" || chain.transport_mode === "scooter"
        ? chain.transport_mode
        : "",
    isFree: chain.is_free ?? true,
  };
}

export default function ChainTrailMetadataEditor({ chain, onSave }: Props) {
  const [draft, setDraft] = useState<ChainTrailMetadata>(() => toDraft(chain));

  useEffect(() => {
    setDraft(toDraft(chain));
  }, [chain.id, chain.description, chain.duration_minutes, chain.distance_km, chain.transport_mode, chain.is_free]);

  return (
    <Box sx={{ px: 1, mb: 2 }}>
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
          onChange={(e) => setDraft((d) => ({ ...d, durationMinutes: e.target.value }))}
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
          <InputLabel id="transport-mode-label">Transport</InputLabel>
          <Select
            labelId="transport-mode-label"
            label="Transport"
            value={draft.transportMode}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                transportMode: e.target.value as ChainTrailMetadata["transportMode"],
              }))
            }
          >
            <MenuItem value="">Not set</MenuItem>
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
