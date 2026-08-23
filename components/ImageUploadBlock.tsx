import { Box, Button, Stack, Typography } from "@mui/material";

export type ImageUploadBlockProps = {
  label: string;
  imagePath: string | null;
  imageCacheKey?: string;
  getImageUrl: (path: string, cacheKey?: string) => string;
  emptyLabel: string;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  caption?: string;
  objectFit?: "cover" | "contain";
  fullWidth?: boolean;
  maxHeight?: number;
  onPickFile: (file: File) => Promise<void> | void;
  onRemove: () => void;
};

export default function ImageUploadBlock({
  label,
  imagePath,
  imageCacheKey,
  getImageUrl,
  emptyLabel,
  uploadLabel,
  replaceLabel,
  removeLabel,
  caption,
  objectFit = "cover",
  fullWidth = false,
  maxHeight = 180,
  onPickFile,
  onRemove,
}: ImageUploadBlockProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
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
              key={`${imagePath}-${imageCacheKey ?? ""}`}
              src={getImageUrl(imagePath, imageCacheKey)}
              alt={label}
              sx={{
                width: "100%",
                maxHeight,
                objectFit,
                borderRadius: 1,
                mb: 1,
                ...(objectFit === "contain" ? { bgcolor: "action.hover" } : {}),
              }}
            />
            <Button size="small" color="error" variant="text" onClick={() => void onRemove()}>
              {removeLabel}
            </Button>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {emptyLabel}
          </Typography>
        )}

        <Button component="label" variant="outlined" size="small" fullWidth={fullWidth}>
          {imagePath ? replaceLabel : uploadLabel}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              await onPickFile(file);
            }}
          />
        </Button>
        {caption ? (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
