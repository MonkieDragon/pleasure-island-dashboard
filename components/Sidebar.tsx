import { formatSupabaseError } from "@/lib/supabaseError";
import { puzzleStepTypeLabel } from "@/lib/stepLabels";
import type { InteractiveConfig } from "@/types/database";
import { getCountryById, type Country } from "@/lib/countries";
import {
  PuzzleChain,
  PuzzleStep,
  Region,
  Treasure,
} from "@/types/database";
import type { MapHover } from "@/types/mapUi";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LockIcon from "@mui/icons-material/Lock";
import ZoomInMapIcon from "@mui/icons-material/ZoomInMap";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";

type Props = {
  countries: Country[];
  selectedCountryId: string | null;
  regions: Region[];
  chains: PuzzleChain[];
  steps: PuzzleStep[];
  treasures: Treasure[];
  selectedRegionId: string | null;
  selectedChainId: string | null;
  selectedStepId: string | null;
  selectedTreasureId: string | null;
  onZoomStepSpotlight: (lat: number, lng: number) => void;
  onHoverChange: (next: MapHover | null) => void;
  onBack: () => void;
  onSelectCountry: (id: string) => void;
  onSelectRegion: (id: string) => void;
  onSelectChain: (id: string) => void;
  onSelectStep: (id: string) => void;
  onSelectTreasure: (id: string) => void;
  onReorderSteps: (orderedStepIds: string[]) => void;
  onStepsOrderDraftChange: (draft: {
    chainId: string;
    orderedStepIds: string[];
    isDirty: boolean;
  }) => void;
  onCreateRegion: (input: { name: string; slug?: string }) => Promise<void>;
  onCreateChain: (input: {
    title: string;
    regionId: string;
    latitude: number;
    longitude: number;
  }) => Promise<void>;
  onCreateStep: (input: { chainId: string }) => Promise<void>;
  onSetRegionReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onSetChainReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onSetStepReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onZoomToRegion: () => void;
  onZoomToChain: () => void;

  newChainDraft: { title: string; lat: string; lng: string };
  onNewChainDraftChange: (next: { title: string; lat: string; lng: string }) => void;
  onStartNewChainPlacement: () => void;
  onCancelNewChainPlacement: () => void;
  newChainPlacementActive: boolean;

  newTreasureDraft: { lat: string; lng: string };
  onNewTreasureDraftChange: (next: { lat: string; lng: string }) => void;
  onStartNewTreasurePlacement: () => void;
  onCancelNewTreasurePlacement: () => void;
  newTreasurePlacementActive: boolean;
  onCreateTreasure: (input: {
    regionId: string;
    latitude: number;
    longitude: number;
  }) => Promise<void>;

  onSetChainImage: (input: { chainId: string; file: File }) => Promise<void> | void;
  onRemoveChainImage: (input: { chainId: string }) => Promise<void> | void;
  getImageUrl: (path: string, cacheKey?: string) => string;
  /** When true, sidebar fills horizontal space (mobile list tab). */
  fullWidth?: boolean;
  /** When false, hide "Add region" (non-admin editors). */
  canCreateRegions?: boolean;
  /** When false, hide delete location (non-staff). */
  canDeleteChains?: boolean;
  onDeleteChain: (chainId: string) => Promise<void>;
  onRenameRegion: (regionId: string, name: string) => Promise<void>;
  onRenameChain: (chainId: string, title: string) => Promise<void>;
  onSetChainOptional: (chainId: string, optional: boolean) => Promise<void>;
  onSetChainIsEatery: (chainId: string, isEatery: boolean) => Promise<void>;
};

function stepContentPreview(content: string | null): string {
  const t = content?.replace(/\s+/g, " ").trim();
  return t ?? "";
}

function ReadyToPublishControl({
  ready,
  onChange,
  disabled,
  entityLabel,
}: {
  ready: boolean;
  onChange: (ready: boolean) => Promise<void>;
  disabled?: boolean;
  /** e.g. "region", "location", "step" — used in confirm copy */
  entityLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nextReady = !ready;

  const confirm = async () => {
    setBusy(true);
    try {
      await onChange(nextReady);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Chip
        size="small"
        label={ready ? "Live" : "Draft"}
        clickable={!disabled && !busy}
        disabled={disabled || busy}
        onClick={() => {
          if (disabled || busy) return;
          setConfirmOpen(true);
        }}
        color="success"
        variant={ready ? "filled" : "outlined"}
        sx={
          ready
            ? undefined
            : {
                bgcolor: "#fff",
                borderColor: "success.main",
                color: "success.main",
                "&:hover": {
                  bgcolor: "rgba(46, 125, 50, 0.04)",
                  borderColor: "success.dark",
                },
              }
        }
      />
      <Dialog
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          {nextReady ? `Make ${entityLabel} live?` : `Take ${entityLabel} offline?`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {nextReady
              ? entityLabel === "location"
                ? "Players will be able to see this location (if its region is live). All existing steps in this location will also be marked live."
                : `Players will be able to see this ${entityLabel} (subject to parent region/location being live).`
              : `Players will no longer see this ${entityLabel}.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={nextReady ? "success" : "warning"}
            onClick={() => void confirm()}
            disabled={busy}
          >
            {nextReady ? "Make live" : "Take offline"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Same validity as map trail points: finite lat/lng, not (0,0). */
function hasValidMapCoords(s: PuzzleStep): boolean {
  const lat = s.latitude;
  const lng = s.longitude;
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return !(lat === 0 && lng === 0);
}

/** Walk backward from index for first step with valid map coordinates. */
function resolveTrailZoomCoords(
  orderedSteps: PuzzleStep[],
  index: number,
): [number, number] | null {
  for (let i = index; i >= 0; i--) {
    const s = orderedSteps[i];
    if (!hasValidMapCoords(s)) continue;
    return [s.latitude as number, s.longitude as number];
  }
  return null;
}

function SortableStepRow({
  id,
  stepNumber,
  stepType,
  stepConfig,
  stepContent,
  locked,
  selected,
  readyToPublish,
  onSetReadyToPublish,
  zoomDisabled,
  zoomTooltip,
  onZoomMap,
  onSelect,
  onHoverIn,
  onHoverOut,
}: {
  id: string;
  stepNumber: number;
  stepType: string;
  stepConfig?: InteractiveConfig | null;
  stepContent: string | null;
  locked: boolean;
  selected: boolean;
  readyToPublish: boolean;
  onSetReadyToPublish: (ready: boolean) => Promise<void>;
  zoomDisabled: boolean;
  zoomTooltip: string;
  onZoomMap: () => void;
  onSelect: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : readyToPublish ? 1 : 0.72,
  } as const;

  return (
    <Box ref={setNodeRef} style={style}>
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        onMouseEnter={onHoverIn}
        onMouseLeave={onHoverOut}
        sx={{
          mb: 0.25,
          py: 1,
          borderRadius: 2,
          userSelect: "none",
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          px: 0.75,
          pr: 0.5,
          minWidth: 0,
          overflowX: "hidden",
          bgcolor: selected ? "action.selected" : "transparent",
          "&:hover": {
            bgcolor: selected ? "action.selected" : "action.hover",
          },
        }}
      >
        <IconButton
          size="small"
          aria-label={locked ? "Step locked" : "Drag step"}
          edge="start"
          {...(locked ? {} : attributes)}
          {...(locked ? {} : listeners)}
          disabled={locked}
          sx={{
            mt: 0.125,
            cursor: locked ? "default" : "grab",
            touchAction: locked ? "auto" : "none",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {locked ? <LockIcon fontSize="small" /> : <DragIndicatorIcon fontSize="small" />}
        </IconButton>

        <Avatar
          sx={{
            width: 28,
            height: 28,
            fontSize: "0.75rem",
            fontWeight: 700,
            mt: 0.125,
            bgcolor: selected ? "primary.main" : "action.hover",
            color: selected ? "primary.contrastText" : "text.secondary",
          }}
        >
          {stepNumber}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }} noWrap>
            {stepContentPreview(stepContent) || "No content yet"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {puzzleStepTypeLabel(stepType, stepConfig)}
          </Typography>
        </Box>

        <Box sx={{ mt: 0.25 }}>
          <ReadyToPublishControl
            ready={readyToPublish}
            entityLabel="step"
            onChange={onSetReadyToPublish}
          />
        </Box>

        <Tooltip title={zoomTooltip}>
          <span>
            <IconButton
              size="small"
              aria-label="Zoom map to step location"
              edge="end"
              disabled={zoomDisabled}
              sx={{ mt: 0.125 }}
              onClick={(e) => {
                e.stopPropagation();
                onZoomMap();
              }}
            >
              <ZoomInMapIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </ListItemButton>
    </Box>
  );
}

export default function Sidebar({
  countries,
  selectedCountryId,
  regions,
  chains,
  steps,
  treasures,
  selectedRegionId,
  selectedChainId,
  selectedStepId,
  selectedTreasureId,
  onZoomStepSpotlight,
  onHoverChange,
  onBack,
  onSelectCountry,
  onSelectRegion,
  onSelectChain,
  onSelectStep,
  onSelectTreasure,
  onReorderSteps,
  onStepsOrderDraftChange,
  onCreateRegion,
  onCreateChain,
  onSetRegionReadyToPublish,
  onSetChainReadyToPublish,
  onSetStepReadyToPublish,
  onCreateStep,
  onZoomToRegion,
  onZoomToChain,
  newChainDraft,
  onNewChainDraftChange,
  onStartNewChainPlacement,
  onCancelNewChainPlacement,
  newChainPlacementActive,
  newTreasureDraft,
  onNewTreasureDraftChange,
  onStartNewTreasurePlacement,
  onCancelNewTreasurePlacement,
  newTreasurePlacementActive,
  onCreateTreasure,
  onSetChainImage,
  onRemoveChainImage,
  getImageUrl,
  fullWidth = false,
  canCreateRegions = true,
  canDeleteChains = false,
  onDeleteChain,
  onRenameRegion,
  onRenameChain,
  onSetChainOptional,
  onSetChainIsEatery,
}: Props) {
  const selectedCountry = getCountryById(selectedCountryId);
  const selectedRegion = selectedRegionId
    ? regions.find((r) => r.id === selectedRegionId) || null
    : null;

  const selectedChain = selectedChainId
    ? chains.find((c) => c.id === selectedChainId) || null
    : null;

  const headerLabel =
    selectedChain?.title ||
    selectedRegion?.name ||
    selectedCountry?.name ||
    "Countries";

  const showBack = selectedCountryId !== null;

  const regionChains = selectedRegionId
    ? chains.filter((c) => c.region_id === selectedRegionId)
    : [];

  const sortedSteps = useMemo(
    () => steps.slice().sort((a, b) => a.order_index - b.order_index),
    [steps],
  );

  const serverOrderedStepIds = useMemo(
    () => sortedSteps.map((s) => s.id),
    [sortedSteps],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  const [draftOrderedStepIds, setDraftOrderedStepIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [deleteChainDialogOpen, setDeleteChainDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [flagBusy, setFlagBusy] = useState(false);
  const [regionName, setRegionName] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const chainTitle = newChainDraft.title;
  const chainLat = newChainDraft.lat;
  const chainLng = newChainDraft.lng;
  const [createLocationMode, setCreateLocationMode] = useState(false);

  const treasureLat = newTreasureDraft.lat;
  const treasureLng = newTreasureDraft.lng;
  const [createTreasureMode, setCreateTreasureMode] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChainId) return;
    queueMicrotask(() => {
      setDraftOrderedStepIds(serverOrderedStepIds);
      setIsDirty(false);
      onStepsOrderDraftChange({
        chainId: selectedChainId,
        orderedStepIds: serverOrderedStepIds,
        isDirty: false,
      });
    });
  }, [onStepsOrderDraftChange, selectedChainId, serverOrderedStepIds]);

  const draftSteps = useMemo(() => {
    const byId = new Map(sortedSteps.map((s) => [s.id, s] as const));
    return draftOrderedStepIds
      .map((id) => byId.get(id) || null)
      .filter((s): s is PuzzleStep => s !== null);
  }, [draftOrderedStepIds, sortedSteps]);

  const pinnedInfoStepId = useMemo(() => {
    const pinned = sortedSteps.find((s) => s.type === "info" && s.order_index === 0);
    return pinned ? pinned.id : null;
  }, [sortedSteps]);

  const stepsWithCoordsCount = useMemo(
    () => draftSteps.filter((s) => s.latitude != null && s.longitude != null).length,
    [draftSteps],
  );

  const onDragEnd = (event: DragEndEvent) => {
    if (!selectedChainId) return;

    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    // The first info step is pinned and cannot move, and nothing can be placed before it.
    if (pinnedInfoStepId) {
      if (activeId === pinnedInfoStepId) return;
      if (overId === pinnedInfoStepId) return;
    }

    const from = draftOrderedStepIds.indexOf(activeId);
    const to = draftOrderedStepIds.indexOf(overId);
    if (from === -1 || to === -1) return;

    const nextOrder = arrayMove(draftOrderedStepIds, from, to);
    if (pinnedInfoStepId && nextOrder[0] !== pinnedInfoStepId) return;
    const nextDirty =
      nextOrder.length !== serverOrderedStepIds.length ||
      nextOrder.some((id, i) => id !== serverOrderedStepIds[i]);

    setDraftOrderedStepIds(nextOrder);
    setIsDirty(nextDirty);
    onStepsOrderDraftChange({
      chainId: selectedChainId,
      orderedStepIds: nextOrder,
      isDirty: nextDirty,
    });
  };

  const discardDraft = () => {
    if (!selectedChainId) return;
    setDraftOrderedStepIds(serverOrderedStepIds);
    setIsDirty(false);
    onStepsOrderDraftChange({
      chainId: selectedChainId,
      orderedStepIds: serverOrderedStepIds,
      isDirty: false,
    });
  };

  const saveDraft = () => {
    if (!selectedChainId) return;
    if (pinnedInfoStepId && draftOrderedStepIds[0] !== pinnedInfoStepId) {
      setCreateError("The first info step is pinned and must stay first.");
      return;
    }
    onReorderSteps(draftOrderedStepIds);
    setIsDirty(false);
    onStepsOrderDraftChange({
      chainId: selectedChainId,
      orderedStepIds: draftOrderedStepIds,
      isDirty: false,
    });
  };

  const submitRegion = async () => {
    if (!regionName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onCreateRegion({
        name: regionName.trim(),
        slug: regionSlug.trim() || undefined,
      });
      setRegionDialogOpen(false);
      setRegionName("");
      setRegionSlug("");
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const submitChain = async () => {
    if (!selectedRegionId) {
      setCreateError("Select a region first.");
      return;
    }
    if (!chainTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (chainLat.trim() === "" || chainLng.trim() === "") {
      setCreateError("Latitude and longitude are required.");
      return;
    }
    const latitude = Number(chainLat.trim());
    const longitude = Number(chainLng.trim());
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setCreateError("Latitude/longitude must be valid numbers.");
      return;
    }
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onCreateChain({
        title: chainTitle.trim(),
        regionId: selectedRegionId,
        latitude,
        longitude,
      });
      onNewChainDraftChange({ title: "", lat: "", lng: "" });
      onCancelNewChainPlacement();
      setCreateLocationMode(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const submitTreasure = async () => {
    if (!selectedRegionId) {
      setCreateError("Select a region first.");
      return;
    }
    if (treasureLat.trim() === "" || treasureLng.trim() === "") {
      setCreateError("Latitude and longitude are required.");
      return;
    }
    const latitude = Number(treasureLat.trim());
    const longitude = Number(treasureLng.trim());
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setCreateError("Latitude/longitude must be valid numbers.");
      return;
    }
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onCreateTreasure({
        regionId: selectedRegionId,
        latitude,
        longitude,
      });
      onNewTreasureDraftChange({ lat: "", lng: "" });
      onCancelNewTreasurePlacement();
      setCreateTreasureMode(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const addStep = async () => {
    if (!selectedChainId) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onCreateStep({ chainId: selectedChainId });
    } catch (e) {
      const msg = formatSupabaseError(e);
      console.error("Failed to create step:", msg);
      setCreateError(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  const confirmDeleteChain = async () => {
    if (!selectedChainId) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onDeleteChain(selectedChainId);
      setDeleteChainDialogOpen(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const openRenameDialog = () => {
    const current = selectedChain?.title ?? selectedRegion?.name ?? "";
    setRenameValue(current);
    setCreateError(null);
    setRenameDialogOpen(true);
  };

  const submitRename = async () => {
    if (!renameValue.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreateError(null);
    setCreateBusy(true);
    try {
      if (selectedChainId) {
        await onRenameChain(selectedChainId, renameValue);
      } else if (selectedRegionId) {
        await onRenameRegion(selectedRegionId, renameValue);
      }
      setRenameDialogOpen(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const toggleOptional = async () => {
    if (!selectedChain) return;
    setFlagBusy(true);
    try {
      await onSetChainOptional(selectedChain.id, !selectedChain.optional);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setFlagBusy(false);
    }
  };

  const toggleEatery = async () => {
    if (!selectedChain) return;
    setFlagBusy(true);
    try {
      await onSetChainIsEatery(selectedChain.id, !selectedChain.is_eatery);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setFlagBusy(false);
    }
  };

  const treasureBlock = selectedRegionId && !selectedChainId ? (
    <Box sx={{ px: 1, py: 0.5 }}>
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Treasures
      </Typography>
      <List dense>
        {treasures.map((t) => (
          <ListItemButton
            key={t.id}
            selected={selectedTreasureId === t.id}
            onClick={() => onSelectTreasure(t.id)}
            onMouseEnter={() => onHoverChange({ kind: "treasure", id: t.id })}
            onMouseLeave={() => onHoverChange(null)}
          >
            <ListItemText
              primary={t.status}
              secondary={`${Number(t.latitude).toFixed(4)}, ${Number(t.longitude).toFixed(4)}`}
            />
          </ListItemButton>
        ))}
      </List>
      {treasures.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          No treasures in this region.
        </Typography>
      )}
    </Box>
  ) : null;

  const CreateOnMapForm = (input: {
    heading: string;
    title: string;
    lat: string;
    lng: string;
    placementActive: boolean;
    onChange: (next: { title: string; lat: string; lng: string }) => void;
    onPickOnMap: () => void;
    onCancel: () => void;
    onCreate: () => void;
    createDisabled: boolean;
  }) => {
    return (
      <Box sx={{ px: 1 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {input.heading}
        </Typography>

        <TextField
          label="Title"
          value={input.title}
          onChange={(e) => input.onChange({ title: e.target.value, lat: input.lat, lng: input.lng })}
          fullWidth
          autoFocus
          size="small"
          sx={{ mt: 1 }}
        />

        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <TextField
            label="Latitude"
            value={input.lat}
            onChange={(e) => input.onChange({ title: input.title, lat: e.target.value, lng: input.lng })}
            fullWidth
            size="small"
            inputMode="decimal"
          />
          <TextField
            label="Longitude"
            value={input.lng}
            onChange={(e) => input.onChange({ title: input.title, lat: input.lat, lng: e.target.value })}
            fullWidth
            size="small"
            inputMode="decimal"
          />
        </Box>

        <Button
          fullWidth
          variant={input.placementActive ? "contained" : "outlined"}
          color={input.placementActive ? "warning" : "primary"}
          size="small"
          sx={{ mt: 1 }}
          onClick={input.onPickOnMap}
        >
          {input.placementActive ? "Click the map to set coordinates…" : "Pick on map"}
        </Button>

        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button variant="outlined" fullWidth disabled={createBusy} onClick={input.onCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={createBusy || input.createDisabled}
            onClick={input.onCreate}
          >
            Create
          </Button>
        </Box>

        {createError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {createError}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: fullWidth ? "100%" : 320,
        borderRight: fullWidth ? "none" : (t) => `1px solid ${t.palette.divider}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {showBack && (
            <IconButton onClick={onBack} size="small" aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {headerLabel}
          </Typography>
        </Box>
        {selectedRegionId ? (
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={openRenameDialog}>
              Rename
            </Button>
            {selectedChain ? (
              <>
                <Chip
                  size="small"
                  label={selectedChain.optional !== false ? "Optional" : "Main"}
                  clickable={!flagBusy}
                  disabled={flagBusy}
                  onClick={toggleOptional}
                  color="primary"
                  variant={selectedChain.optional !== false ? "outlined" : "filled"}
                  sx={
                    selectedChain.optional !== false
                      ? undefined
                      : { fontWeight: 700 }
                  }
                />
                <Chip
                  size="small"
                  label={selectedChain.is_eatery ? "Eatery" : "Attraction"}
                  clickable={!flagBusy}
                  disabled={flagBusy}
                  onClick={toggleEatery}
                  color="default"
                  variant={selectedChain.is_eatery ? "filled" : "outlined"}
                />
              </>
            ) : null}
          </Box>
        ) : null}
      </Box>
      <Divider />

      {!selectedCountryId && (
        <>
          <List dense sx={{ p: 1, overflow: "auto", flex: 1 }}>
            {countries.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => onSelectCountry(c.id)}
                onMouseEnter={() => onHoverChange({ kind: "country", id: c.id })}
                onMouseLeave={() => onHoverChange(null)}
                sx={{ minWidth: 0 }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      noWrap
                      sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {c.name}
                    </Typography>
                  }
                  sx={{ minWidth: 0 }}
                />
              </ListItemButton>
            ))}
          </List>
          {countries.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 2 }}>
              No countries available for your account.
            </Typography>
          )}
        </>
      )}

      {selectedCountryId && !selectedRegionId && (
        <>
          <List dense sx={{ p: 1, overflow: "auto", flex: 1 }}>
            {regions.map((r) => (
              <ListItemButton
                key={r.id}
                onClick={() => onSelectRegion(r.id)}
                onMouseEnter={() => onHoverChange({ kind: "region", id: r.id })}
                onMouseLeave={() => onHoverChange(null)}
                sx={{
                  minWidth: 0,
                  opacity: r.ready_to_publish ? 1 : 0.72,
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      noWrap
                      sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {r.name}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {r.slug}
                    </Typography>
                  }
                  sx={{ minWidth: 0, mr: 1 }}
                />
                <ReadyToPublishControl
                  ready={r.ready_to_publish}
                  entityLabel="region"
                  onChange={(ready) => onSetRegionReadyToPublish(r.id, ready)}
                />
              </ListItemButton>
            ))}
          </List>
          {canCreateRegions ? (
          <Box sx={{ p: 1, borderTop: 1, borderColor: "divider" }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setCreateError(null);
                setRegionDialogOpen(true);
              }}
            >
              Add region
            </Button>
          </Box>
          ) : null}
        </>
      )}

      {selectedRegionId && !selectedChainId && (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <Box sx={{ p: 1, overflowY: "auto", overflowX: "hidden", flex: 1 }}>
            {createTreasureMode ? (
              <Box sx={{ px: 1 }}>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Create treasure
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField
                    label="Latitude"
                    value={treasureLat}
                    onChange={(e) =>
                      onNewTreasureDraftChange({
                        lat: e.target.value,
                        lng: treasureLng,
                      })
                    }
                    fullWidth
                    size="small"
                    inputMode="decimal"
                  />
                  <TextField
                    label="Longitude"
                    value={treasureLng}
                    onChange={(e) =>
                      onNewTreasureDraftChange({
                        lat: treasureLat,
                        lng: e.target.value,
                      })
                    }
                    fullWidth
                    size="small"
                    inputMode="decimal"
                  />
                </Box>
                <Button
                  fullWidth
                  variant={newTreasurePlacementActive ? "contained" : "outlined"}
                  color={newTreasurePlacementActive ? "warning" : "primary"}
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={onStartNewTreasurePlacement}
                >
                  {newTreasurePlacementActive
                    ? "Click the map to set coordinates…"
                    : "Pick on map"}
                </Button>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={createBusy}
                    onClick={() => {
                      setCreateError(null);
                      onNewTreasureDraftChange({ lat: "", lng: "" });
                      onCancelNewTreasurePlacement();
                      setCreateTreasureMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={
                      createBusy ||
                      treasureLat.trim() === "" ||
                      treasureLng.trim() === "" ||
                      !Number.isFinite(Number(treasureLat.trim())) ||
                      !Number.isFinite(Number(treasureLng.trim()))
                    }
                    onClick={submitTreasure}
                  >
                    Create
                  </Button>
                </Box>
                {createError && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {createError}
                  </Typography>
                )}
              </Box>
            ) : createLocationMode ? (
              CreateOnMapForm({
                heading: "Create location",
                title: chainTitle,
                lat: chainLat,
                lng: chainLng,
                placementActive: newChainPlacementActive,
                onChange: onNewChainDraftChange,
                onPickOnMap: onStartNewChainPlacement,
                onCancel: () => {
                  setCreateError(null);
                  onNewChainDraftChange({ title: "", lat: "", lng: "" });
                  onCancelNewChainPlacement();
                  setCreateLocationMode(false);
                },
                onCreate: submitChain,
                createDisabled:
                  !chainTitle.trim() ||
                  chainLat.trim() === "" ||
                  chainLng.trim() === "" ||
                  !Number.isFinite(Number(chainLat.trim())) ||
                  !Number.isFinite(Number(chainLng.trim())),
              })
            ) : (
              <>
                {selectedRegion && !selectedRegion.ready_to_publish ? (
                  <Alert severity="info" sx={{ mx: 1, mb: 1 }}>
                    This region is not published. Locations inside it are hidden
                    from players until the region is marked live.
                  </Alert>
                ) : null}
                <Typography variant="overline" sx={{ px: 1, color: "text.secondary" }}>
                  Locations
                </Typography>
                <List dense>
                  {regionChains.map((c) => (
                    <ListItemButton
                      key={c.id}
                      selected={selectedChainId === c.id}
                      onClick={() => onSelectChain(c.id)}
                      onMouseEnter={() => onHoverChange({ kind: "chain", id: c.id })}
                      onMouseLeave={() => onHoverChange(null)}
                      sx={{
                        minWidth: 0,
                        opacity:
                          c.ready_to_publish && selectedRegion?.ready_to_publish
                            ? 1
                            : 0.72,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.title}
                          </Typography>
                        }
                        sx={{ minWidth: 0, mr: 1 }}
                      />
                      <ReadyToPublishControl
                        ready={c.ready_to_publish}
                        entityLabel="location"
                        onChange={(ready) => onSetChainReadyToPublish(c.id, ready)}
                      />
                    </ListItemButton>
                  ))}
                </List>
                <Divider sx={{ my: 1 }} />
                {treasureBlock}
              </>
            )}
          </Box>
          <Box sx={{ p: 1, borderTop: 1, borderColor: "divider" }}>
            <Button
              fullWidth
              variant="text"
              sx={{ mb: 1 }}
              onClick={onZoomToRegion}
            >
              Zoom to region
            </Button>
            <Button
              fullWidth
              variant="outlined"
              disabled={createLocationMode || createTreasureMode}
              sx={{ mb: 1 }}
              onClick={() => {
                setCreateError(null);
                onNewTreasureDraftChange({ lat: "", lng: "" });
                setCreateTreasureMode(true);
              }}
            >
              Add treasure
            </Button>
            <Button
              fullWidth
              variant="outlined"
              disabled={createLocationMode || createTreasureMode}
              onClick={() => {
                setCreateError(null);
                onNewChainDraftChange({ title: "", lat: "", lng: "" });
                setCreateLocationMode(true);
              }}
            >
              Add location
            </Button>
          </Box>
        </Box>
      )}

      {selectedRegionId && selectedChainId && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box sx={{ p: 1, overflowY: "auto", overflowX: "hidden", flex: 1 }}>
            {selectedRegion && !selectedRegion.ready_to_publish ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                This region is not published. This location is hidden from players
                until the region is marked live.
              </Alert>
            ) : selectedChain && !selectedChain.ready_to_publish ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                This location is a draft and is hidden from players until marked
                live.
              </Alert>
            ) : null}
            {selectedChain && (
              <Box sx={{ px: 1, mb: 1 }}>
                {selectedChain.image_path ? (
                  <Box sx={{ mb: 1 }}>
                    <Box
                      component="img"
                      src={getImageUrl(selectedChain.image_path, `chain-image:${selectedChain.id}`)}
                      alt="Chain image"
                      sx={{
                        width: "100%",
                        borderRadius: 2,
                        maxHeight: 140,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      onClick={async () => {
                        await onRemoveChainImage({ chainId: selectedChain.id });
                      }}
                      sx={{ mt: 0.5 }}
                    >
                      Remove image
                    </Button>
                  </Box>
                ) : null}

                <Button component="label" variant="outlined" size="small" fullWidth>
                  {selectedChain.image_path ? "Replace chain image" : "Upload chain image"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      await onSetChainImage({ chainId: selectedChain.id, file });
                    }}
                  />
                </Button>
              </Box>
            )}

            <Typography variant="overline" sx={{ px: 1, color: "text.secondary" }}>
              Steps (drag handle to reorder)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: "block", mb: 1 }}>
              Steps with coordinates: {stepsWithCoordsCount}/{draftSteps.length}
            </Typography>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={draftOrderedStepIds}
                strategy={verticalListSortingStrategy}
              >
                <List dense sx={{ pb: 1 }}>
                  {draftSteps.map((s, idx) => {
                    const target = resolveTrailZoomCoords(draftSteps, idx);
                    const hasOwn = hasValidMapCoords(s);
                    const zoomDisabled = !target;
                    const zoomTooltip = !target
                      ? "No location on trail"
                      : hasOwn
                        ? "Zoom to this step"
                        : "No marker — zooming to previous step on the trail";
                    return (
                    <SortableStepRow
                      key={s.id}
                      id={s.id}
                      selected={selectedStepId === s.id}
                      stepNumber={idx + 1}
                      stepType={s.type}
                      stepConfig={s.config as InteractiveConfig | null}
                      stepContent={s.content}
                      locked={pinnedInfoStepId === s.id}
                      readyToPublish={s.ready_to_publish}
                      onSetReadyToPublish={(ready) =>
                        onSetStepReadyToPublish(s.id, ready)
                      }
                      zoomDisabled={zoomDisabled}
                      zoomTooltip={zoomTooltip}
                      onZoomMap={() => {
                        if (!target) return;
                        onZoomStepSpotlight(target[0], target[1]);
                      }}
                      onSelect={() => onSelectStep(s.id)}
                      onHoverIn={() => onHoverChange({ kind: "step", id: s.id })}
                      onHoverOut={() => onHoverChange(null)}
                    />
                    );
                  })}
                </List>
              </SortableContext>
            </DndContext>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              pt: 1,
              pb: 1,
              px: 1,
              bgcolor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              fullWidth
              variant="text"
              sx={{ mb: 1 }}
              onClick={onZoomToChain}
            >
              Zoom to location
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 1 }}
              disabled={createBusy}
              onClick={addStep}
            >
              Add step
            </Button>
            {createError && !regionDialogOpen && (
              <Typography
                variant="body2"
                color="error"
                sx={{ mb: 1, px: 0.5 }}
              >
                {createError}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                disabled={!isDirty}
                onClick={saveDraft}
              >
                Save order
              </Button>
              <Button
                variant="outlined"
                fullWidth
                disabled={!isDirty}
                onClick={discardDraft}
              >
                Discard
              </Button>
            </Box>
            {canDeleteChains ? (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={createBusy}
                sx={{ mt: 1 }}
                onClick={() => {
                  setCreateError(null);
                  setDeleteChainDialogOpen(true);
                }}
              >
                Delete chain
              </Button>
            ) : null}
          </Box>
        </Box>
      )}

      <Dialog
        open={renameDialogOpen}
        onClose={() => !createBusy && setRenameDialogOpen(false)}
      >
        <DialogTitle>
          {selectedChainId ? "Rename location" : "Rename region"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            fullWidth
            autoFocus
            size="small"
          />
          {createError && renameDialogOpen ? (
            <Typography variant="body2" color="error">
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            disabled={createBusy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitRename}
            disabled={createBusy || !renameValue.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteChainDialogOpen}
        onClose={() => !createBusy && setDeleteChainDialogOpen(false)}
      >
        <DialogTitle>Delete location</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {selectedChain
              ? `Are you SURE you want to delete location ${selectedChain.title} and its ${sortedSteps.length} ${sortedSteps.length === 1 ? "step" : "steps"}?`
              : "Are you SURE you want to delete this location?"}
          </Typography>
          {createError && deleteChainDialogOpen ? (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteChainDialogOpen(false)}
            disabled={createBusy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteChain}
            disabled={createBusy || !selectedChainId}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={regionDialogOpen}
        onClose={() => !createBusy && setRegionDialogOpen(false)}
      >
        <DialogTitle>New region</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Name"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            fullWidth
            autoFocus
            size="small"
          />
          <TextField
            label="Slug (optional)"
            value={regionSlug}
            onChange={(e) => setRegionSlug(e.target.value)}
            fullWidth
            size="small"
            helperText="Leave blank to derive from name."
          />
          {createError && (
            <Typography variant="body2" color="error">
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegionDialogOpen(false)} disabled={createBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitRegion} disabled={createBusy}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

    </Paper>
  );
}
