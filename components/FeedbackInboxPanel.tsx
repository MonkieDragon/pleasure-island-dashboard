import {
  Box,
  Button,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import type { FeedbackItem, FeedbackStatus, Region } from "@/types/database";
import FeedbackList from "./FeedbackList";

export type FeedbackStatusFilter = "new" | "open" | "all";

export type FeedbackFilter = {
  status: FeedbackStatusFilter;
  regionId: string;
  kind: string;
};

type Props = {
  feedback: FeedbackItem[];
  filter: FeedbackFilter;
  regionOptions: Region[];
  newCount: number;
  onFilterChange: (next: FeedbackFilter) => void;
  onSetStatus: (id: string, status: FeedbackStatus) => void;
  onMarkAllSeen: () => void;
  onOpenTarget: (item: FeedbackItem) => void;
};

export default function FeedbackInboxPanel({
  feedback,
  filter,
  regionOptions,
  newCount,
  onFilterChange,
  onSetStatus,
  onMarkAllSeen,
  onOpenTarget,
}: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter.status}
          onChange={(_, v: FeedbackStatusFilter | null) =>
            v && onFilterChange({ ...filter, status: v })
          }
        >
          <ToggleButton value="new">New ({newCount})</ToggleButton>
          <ToggleButton value="open">Not resolved</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          select
          size="small"
          label="Region"
          value={filter.regionId}
          onChange={(e) => onFilterChange({ ...filter, regionId: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All regions</MenuItem>
          {regionOptions.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Type"
          value={filter.kind}
          onChange={(e) => onFilterChange({ ...filter, kind: e.target.value })}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All types</MenuItem>
          <MenuItem value="problem">Problem</MenuItem>
          <MenuItem value="suggestion">Suggestion</MenuItem>
          <MenuItem value="rating">Rating</MenuItem>
          <MenuItem value="new_location">New spot</MenuItem>
        </TextField>
        <Button
          size="small"
          sx={{ ml: "auto" }}
          disabled={newCount === 0}
          onClick={onMarkAllSeen}
        >
          Mark all read
        </Button>
      </Box>

      <FeedbackList
        items={feedback}
        showWhere
        onSetStatus={onSetStatus}
        onOpenTarget={onOpenTarget}
        emptyText="No feedback matches these filters."
      />
    </Box>
  );
}
