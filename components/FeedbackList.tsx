import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import type { FeedbackItem, FeedbackStatus } from "@/types/database";

const KIND_LABELS: Record<string, string> = {
  problem: "Problem",
  suggestion: "Suggestion",
  rating: "Rating",
  new_location: "New spot",
};

const KIND_COLORS: Record<string, "error" | "info" | "success" | "warning"> = {
  problem: "error",
  suggestion: "info",
  rating: "success",
  new_location: "warning",
};

export function feedbackWhere(item: FeedbackItem): string {
  const parts: string[] = [];
  if (item.regions?.name) parts.push(item.regions.name);
  if (item.trails?.title) parts.push(item.trails.title);
  if (item.puzzle_chains?.title) parts.push(item.puzzle_chains.title);
  if (item.puzzle_steps) parts.push(`Step ${item.puzzle_steps.order_index + 1}`);
  return parts.join(" > ");
}

function relativeTime(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

function answersText(answers: FeedbackItem["answers"]): string | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const would = (answers as Record<string, unknown>).would_do_another;
  return typeof would === "string" ? `Would do another trail: ${would}` : null;
}

type Props = {
  items: FeedbackItem[];
  /** Show the region > trail > location > step line (inbox). */
  showWhere?: boolean;
  onSetStatus: (id: string, status: FeedbackStatus) => void;
  onOpenTarget?: (item: FeedbackItem) => void;
  emptyText?: string;
};

export default function FeedbackList({
  items,
  showWhere = false,
  onSetStatus,
  onOpenTarget,
  emptyText = "No feedback.",
}: Props) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {items.map((item) => {
        const extra = answersText(item.answers);
        const isNew = item.status === "new";
        return (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{
              p: 1.25,
              borderLeft: 3,
              borderLeftColor: isNew ? "error.main" : "divider",
              opacity: item.status === "resolved" ? 0.7 : 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                color={KIND_COLORS[item.kind] ?? "default"}
                label={KIND_LABELS[item.kind] ?? item.kind}
              />
              {item.rating ? (
                <Rating value={item.rating} readOnly size="small" />
              ) : null}
              {isNew ? <Chip size="small" variant="outlined" color="error" label="New" /> : null}
              {item.status === "resolved" ? (
                <Chip size="small" variant="outlined" label="Resolved" />
              ) : null}
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                {relativeTime(item.created_at)}
              </Typography>
            </Box>

            {showWhere ? (
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                {feedbackWhere(item) || "Unknown"}
              </Typography>
            ) : null}

            {item.message ? (
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {item.message}
              </Typography>
            ) : null}
            {extra ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {extra}
              </Typography>
            ) : null}
            {item.latitude != null && item.longitude != null ? (
              <Link
                variant="caption"
                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Link>
            ) : null}

            <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
              {onOpenTarget ? (
                <Button size="small" onClick={() => onOpenTarget(item)}>
                  Open in editor
                </Button>
              ) : null}
              {isNew ? (
                <Button size="small" onClick={() => onSetStatus(item.id, "seen")}>
                  Mark read
                </Button>
              ) : null}
              {item.status !== "resolved" ? (
                <Button size="small" onClick={() => onSetStatus(item.id, "resolved")}>
                  Resolve
                </Button>
              ) : (
                <Button size="small" onClick={() => onSetStatus(item.id, "seen")}>
                  Reopen
                </Button>
              )}
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
