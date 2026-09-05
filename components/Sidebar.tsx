import { formatSupabaseError } from "@/lib/supabaseError";
import ImageUploadBlock from "@/components/ImageUploadBlock";
import { puzzleStepTypeLabel } from "@/lib/stepLabels";
import type { InteractiveConfig } from "@/types/database";
import { getCountryById, type Country } from "@/lib/countries";
import {
  PuzzleChain,
  PuzzleStep,
  Region,
  Trail,
  TrailStop,
  Treasure,
} from "@/types/database";
import type { MapHover } from "@/types/mapUi";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
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
  MenuItem,
  Paper,
  Stack,
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
import TrailMetadataEditor from "./TrailMetadataEditor";
import EditorAccordion from "@/components/EditorAccordion";

type ChainSidebarSection = "details" | "steps";
type TrailSidebarSection = "details" | "stops";
type RegionSidebarSection = "details" | "locations" | "treasures" | "trails";

type Props = {
  countries: Country[];
  selectedCountryId: string | null;
  regions: Region[];
  chains: PuzzleChain[];
  steps: PuzzleStep[];
  treasures: Treasure[];
  trails: Trail[];
  trailStops: TrailStop[];
  selectedRegionId: string | null;
  selectedChainId: string | null;
  selectedStepId: string | null;
  selectedTreasureId: string | null;
  selectedTrailId: string | null;
  onZoomStepSpotlight: (lat: number, lng: number) => void;
  onHoverChange: (next: MapHover | null) => void;
  onBack: () => void;
  onSelectCountry: (id: string) => void;
  onSelectRegion: (id: string) => void;
  onSelectChain: (id: string) => void;
  onSelectTrail: (id: string) => void;
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
  onCreateTrail: (input: { title: string; regionId: string }) => Promise<void>;
  onCreateStep: (input: { chainId: string }) => Promise<void>;
  onSetRegionReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onSetChainReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onSetTrailReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onSetStepReadyToPublish: (id: string, ready: boolean) => Promise<void>;
  onZoomToRegion: () => void;
  onZoomToChain: () => void;
  onZoomToTrail: () => void;

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

  regionPlacementActive: boolean;
  onStartRegionPlacement: () => void;
  onCancelRegionPlacement: () => void;
  onUpdateRegionLocation: (
    regionId: string,
    lat: number,
    lng: number,
  ) => Promise<void>;

  onSetChainImage: (input: { chainId: string; file: File }) => Promise<void> | void;
  onRemoveChainImage: (input: { chainId: string }) => Promise<void> | void;
  onSetRegionImage: (input: { regionId: string; file: File }) => Promise<void> | void;
  onRemoveRegionImage: (input: { regionId: string }) => Promise<void> | void;
  onSetTrailImage: (input: { trailId: string; file: File }) => Promise<void> | void;
  onRemoveTrailImage: (input: { trailId: string }) => Promise<void> | void;
  getImageUrl: (path: string, cacheKey?: string) => string;
  /** When true, sidebar fills horizontal space (mobile list tab). */
  fullWidth?: boolean;
  /** When false, hide "Add region" (non-admin editors). */
  canCreateRegions?: boolean;
  /** When false, hide delete location (non-staff). */
  canDeleteChains?: boolean;
  onDeleteChain: (chainId: string) => Promise<void>;
  onDeleteTrail: (trailId: string) => Promise<void>;
  onRenameRegion: (regionId: string, name: string) => Promise<void>;
  onRenameChain: (chainId: string, title: string) => Promise<void>;
  onRenameTrail: (trailId: string, title: string) => Promise<void>;
  onSetChainOptional: (chainId: string, optional: boolean) => Promise<void>;
  onSetChainIsEatery: (chainId: string, isEatery: boolean) => Promise<void>;
  onUpdateTrailMetadata: (
    trailId: string,
    metadata: {
      description: string;
      durationMinutes: string;
      distanceKm: string;
      transportMode: "" | "walk" | "scooter";
      isFree: boolean;
    },
  ) => Promise<void>;
  onAddTrailStop: (input: { trailId: string; chainId: string }) => Promise<void>;
  onRemoveTrailStop: (stopId: string) => Promise<void>;
  onReorderTrailStops: (orderedStopIds: string[]) => Promise<void>;
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

function SortableTrailStopRow({
  id,
  stopNumber,
  title,
  onRemove,
  onSelectLocation,
}: {
  id: string;
  stopNumber: number;
  title: string;
  onRemove: () => void;
  onSelectLocation: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  } as const;

  return (
    <Box ref={setNodeRef} style={style}>
      <ListItemButton
        onClick={onSelectLocation}
        sx={{
          mb: 0.25,
          py: 1,
          borderRadius: 2,
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 0.75,
          pr: 0.5,
        }}
      >
        <IconButton
          size="small"
          aria-label="Drag to reorder stop"
          sx={{ cursor: "grab", touchAction: "none" }}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            fontSize: 13,
            bgcolor: "primary.main",
          }}
        >
          {stopNumber}
        </Avatar>
        <ListItemText
          primary={
            <Typography noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </Typography>
          }
          sx={{ minWidth: 0, flex: 1 }}
        />
        <IconButton
          size="small"
          aria-label="Remove stop"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </ListItemButton>
    </Box>
  );
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
  trails,
  trailStops,
  selectedRegionId,
  selectedChainId,
  selectedStepId,
  selectedTreasureId,
  selectedTrailId,
  onZoomStepSpotlight,
  onHoverChange,
  onBack,
  onSelectCountry,
  onSelectRegion,
  onSelectChain,
  onSelectTrail,
  onSelectStep,
  onSelectTreasure,
  onReorderSteps,
  onStepsOrderDraftChange,
  onCreateRegion,
  onCreateChain,
  onCreateTrail,
  onSetRegionReadyToPublish,
  onSetChainReadyToPublish,
  onSetTrailReadyToPublish,
  onSetStepReadyToPublish,
  onCreateStep,
  onZoomToRegion,
  onZoomToChain,
  onZoomToTrail,
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
  regionPlacementActive,
  onStartRegionPlacement,
  onCancelRegionPlacement,
  onUpdateRegionLocation,
  onSetChainImage,
  onRemoveChainImage,
  onSetRegionImage,
  onRemoveRegionImage,
  onSetTrailImage,
  onRemoveTrailImage,
  getImageUrl,
  fullWidth = false,
  canCreateRegions = true,
  canDeleteChains = false,
  onDeleteChain,
  onDeleteTrail,
  onRenameRegion,
  onRenameChain,
  onRenameTrail,
  onSetChainOptional,
  onSetChainIsEatery,
  onUpdateTrailMetadata,
  onAddTrailStop,
  onRemoveTrailStop,
  onReorderTrailStops,
}: Props) {
  const selectedCountry = getCountryById(selectedCountryId);
  const selectedRegion = selectedRegionId
    ? regions.find((r) => r.id === selectedRegionId) || null
    : null;

  const selectedChain = selectedChainId
    ? chains.find((c) => c.id === selectedChainId) || null
    : null;

  const selectedTrail = selectedTrailId
    ? trails.find((t) => t.id === selectedTrailId) || null
    : null;

  const headerLabel =
    selectedChain?.title ||
    selectedTrail?.title ||
    selectedRegion?.name ||
    selectedCountry?.name ||
    "Countries";

  const showBack = selectedCountryId !== null;

  const regionChains = selectedRegionId
    ? chains.filter((c) => c.region_id === selectedRegionId)
    : [];

  const regionTrails = selectedRegionId
    ? trails.filter((t) => t.region_id === selectedRegionId)
    : [];

  const sortedTrailStops = useMemo(() => {
    if (!selectedTrailId) return [];
    return trailStops
      .filter((s) => s.trail_id === selectedTrailId)
      .slice()
      .sort((a, b) => a.order_index - b.order_index);
  }, [trailStops, selectedTrailId]);

  const chainIdsOnAnyTrail = useMemo(
    () => new Set(trailStops.map((s) => s.chain_id)),
    [trailStops],
  );

  const availableLocationsForTrail = useMemo(() => {
    if (!selectedRegionId) return [];
    return regionChains.filter((c) => !chainIdsOnAnyTrail.has(c.id));
  }, [regionChains, chainIdsOnAnyTrail, selectedRegionId]);

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
  const [draftOrderedStopIds, setDraftOrderedStopIds] = useState<string[]>([]);

  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [deleteChainDialogOpen, setDeleteChainDialogOpen] = useState(false);
  const [deleteTrailDialogOpen, setDeleteTrailDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [flagBusy, setFlagBusy] = useState(false);
  const [regionName, setRegionName] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const chainTitle = newChainDraft.title;
  const chainLat = newChainDraft.lat;
  const chainLng = newChainDraft.lng;
  const [createLocationMode, setCreateLocationMode] = useState(false);
  const [createTrailMode, setCreateTrailMode] = useState(false);
  const [newTrailTitle, setNewTrailTitle] = useState("");
  const [addStopChainId, setAddStopChainId] = useState("");

  const treasureLat = newTreasureDraft.lat;
  const treasureLng = newTreasureDraft.lng;
  const [createTreasureMode, setCreateTreasureMode] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedChainSection, setExpandedChainSection] = useState<
    ChainSidebarSection | false
  >("steps");
  const [expandedTrailSection, setExpandedTrailSection] = useState<
    TrailSidebarSection | false
  >("stops");
  const [expandedRegionSection, setExpandedRegionSection] = useState<
    RegionSidebarSection | false
  >("locations");
  const [regionLatText, setRegionLatText] = useState("");
  const [regionLngText, setRegionLngText] = useState("");
  const [regionMapError, setRegionMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChainId) return;
    queueMicrotask(() => {
      setExpandedChainSection("steps");
    });
  }, [selectedChainId]);

  useEffect(() => {
    if (!selectedTrailId) return;
    queueMicrotask(() => {
      setExpandedTrailSection("stops");
      setAddStopChainId("");
    });
  }, [selectedTrailId]);

  useEffect(() => {
    if (!selectedRegionId || selectedChainId || selectedTrailId) return;
    queueMicrotask(() => {
      setExpandedRegionSection("locations");
      setRegionMapError(null);
    });
  }, [selectedRegionId, selectedChainId, selectedTrailId]);

  useEffect(() => {
    if (!selectedRegion) return;
    setRegionLatText(
      selectedRegion.latitude == null ? "" : String(selectedRegion.latitude),
    );
    setRegionLngText(
      selectedRegion.longitude == null ? "" : String(selectedRegion.longitude),
    );
  }, [
    selectedRegion?.id,
    selectedRegion?.latitude,
    selectedRegion?.longitude,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      setDraftOrderedStopIds(sortedTrailStops.map((s) => s.id));
    });
  }, [sortedTrailStops]);

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

  const chainDetailsSubtitle = selectedChain
    ? [
        selectedChain.image_path ? "Has image" : "No image",
        selectedChain.ready_to_publish ? "Live" : "Draft",
      ].join(" · ")
    : undefined;

  const chainStepsSubtitle = isDirty
    ? `${draftSteps.length} steps · unsaved order`
    : `${draftSteps.length} steps · ${stepsWithCoordsCount} on map`;

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
    const current =
      selectedChain?.title ?? selectedTrail?.title ?? selectedRegion?.name ?? "";
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
      } else if (selectedTrailId) {
        await onRenameTrail(selectedTrailId, renameValue);
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

  const submitTrail = async () => {
    if (!selectedRegionId) return;
    const title = newTrailTitle.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onCreateTrail({ title, regionId: selectedRegionId });
      setNewTrailTitle("");
      setCreateTrailMode(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const confirmDeleteTrail = async () => {
    if (!selectedTrailId) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onDeleteTrail(selectedTrailId);
      setDeleteTrailDialogOpen(false);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const onTrailStopDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draftOrderedStopIds.indexOf(String(active.id));
    const newIndex = draftOrderedStopIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(draftOrderedStopIds, oldIndex, newIndex);
    setDraftOrderedStopIds(next);
    try {
      await onReorderTrailStops(next);
    } catch (e) {
      setCreateError(formatSupabaseError(e));
      setDraftOrderedStopIds(sortedTrailStops.map((s) => s.id));
    }
  };

  const addSelectedStop = async () => {
    if (!selectedTrailId || !addStopChainId) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      await onAddTrailStop({ trailId: selectedTrailId, chainId: addStopChainId });
      setAddStopChainId("");
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

      {selectedRegionId && !selectedChainId && !selectedTrailId && (
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
            ) : createTrailMode ? (
              <Box sx={{ px: 1 }}>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Create trail
                </Typography>
                <TextField
                  label="Title"
                  value={newTrailTitle}
                  onChange={(e) => setNewTrailTitle(e.target.value)}
                  fullWidth
                  autoFocus
                  size="small"
                  sx={{ mt: 1 }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={createBusy}
                    onClick={() => {
                      setCreateError(null);
                      setNewTrailTitle("");
                      setCreateTrailMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={createBusy || !newTrailTitle.trim()}
                    onClick={() => void submitTrail()}
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
            ) : (
              <>
                <EditorAccordion
                  section="details"
                  expandedSection={expandedRegionSection}
                  onExpand={setExpandedRegionSection}
                  title="Region details"
                  subtitle={selectedRegion?.name ?? ""}
                >
                  <Stack spacing={2}>
                    {selectedRegion && !selectedRegion.ready_to_publish ? (
                      <Alert severity="info">
                        This region is not published. Trails and locations inside it
                        are hidden from players until the region is marked live.
                      </Alert>
                    ) : null}

                    <Button size="small" variant="outlined" onClick={openRenameDialog}>
                      Rename
                    </Button>

                    {selectedRegion ? (
                      <ImageUploadBlock
                        label="Region card image"
                        imagePath={selectedRegion.image_path}
                        imageCacheKey={
                          selectedRegion.image_path
                            ? `region-image:${selectedRegion.id}`
                            : undefined
                        }
                        getImageUrl={getImageUrl}
                        emptyLabel="No region card image yet."
                        uploadLabel="Upload region card"
                        replaceLabel="Replace region card"
                        removeLabel="Remove image"
                        fullWidth
                        maxHeight={140}
                        onPickFile={async (file) => {
                          await onSetRegionImage({ regionId: selectedRegion.id, file });
                        }}
                        onRemove={async () => {
                          await onRemoveRegionImage({ regionId: selectedRegion.id });
                        }}
                      />
                    ) : null}

                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Map position (browse hub pin)
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                          label="Latitude"
                          value={regionLatText}
                          onChange={(e) => setRegionLatText(e.target.value)}
                          size="small"
                          fullWidth
                          inputMode="decimal"
                        />
                        <TextField
                          label="Longitude"
                          value={regionLngText}
                          onChange={(e) => setRegionLngText(e.target.value)}
                          size="small"
                          fullWidth
                          inputMode="decimal"
                        />
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={createBusy || !selectedRegion}
                        onClick={async () => {
                          if (!selectedRegion) return;
                          const lat = Number(regionLatText.trim());
                          const lng = Number(regionLngText.trim());
                          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                            setRegionMapError("Provide both latitude and longitude.");
                            return;
                          }
                          setRegionMapError(null);
                          setCreateBusy(true);
                          try {
                            await onUpdateRegionLocation(selectedRegion.id, lat, lng);
                            onCancelRegionPlacement();
                          } catch (e) {
                            setRegionMapError(formatSupabaseError(e));
                          } finally {
                            setCreateBusy(false);
                          }
                        }}
                      >
                        Apply lat/lon
                      </Button>
                      <Button
                        fullWidth
                        variant={regionPlacementActive ? "contained" : "outlined"}
                        color={regionPlacementActive ? "warning" : "primary"}
                        size="small"
                        onClick={() => {
                          setRegionMapError(null);
                          if (regionPlacementActive) onCancelRegionPlacement();
                          else onStartRegionPlacement();
                        }}
                      >
                        {regionPlacementActive
                          ? "Click the map to set coordinates…"
                          : "Pick on map"}
                      </Button>
                      {regionMapError ? (
                        <Typography variant="body2" color="error">
                          {regionMapError}
                        </Typography>
                      ) : null}
                    </Stack>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={onZoomToRegion}
                    >
                      Zoom to region
                    </Button>
                  </Stack>
                </EditorAccordion>

                <EditorAccordion
                  section="locations"
                  expandedSection={expandedRegionSection}
                  onExpand={setExpandedRegionSection}
                  title="Locations"
                  subtitle={`${regionChains.length}`}
                >
                  <Stack spacing={1}>
                    <List dense sx={{ py: 0 }}>
                      {regionChains.map((c) => (
                        <ListItemButton
                          key={c.id}
                          selected={selectedChainId === c.id}
                          onClick={() => onSelectChain(c.id)}
                          onMouseEnter={() =>
                            onHoverChange({ kind: "chain", id: c.id })
                          }
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
                              <Typography
                                noWrap
                                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {c.title}
                              </Typography>
                            }
                            secondary={
                              chainIdsOnAnyTrail.has(c.id)
                                ? "On a trail"
                                : "Unassigned"
                            }
                            sx={{ minWidth: 0, mr: 1 }}
                          />
                          <ReadyToPublishControl
                            ready={c.ready_to_publish}
                            entityLabel="location"
                            onChange={(ready) =>
                              onSetChainReadyToPublish(c.id, ready)
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                    {regionChains.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        No locations in this region.
                      </Typography>
                    )}
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCreateError(null);
                        onNewChainDraftChange({ title: "", lat: "", lng: "" });
                        setCreateLocationMode(true);
                      }}
                    >
                      Add location
                    </Button>
                  </Stack>
                </EditorAccordion>

                <EditorAccordion
                  section="treasures"
                  expandedSection={expandedRegionSection}
                  onExpand={setExpandedRegionSection}
                  title="Treasures"
                  subtitle={`${treasures.length}`}
                >
                  <Stack spacing={1}>
                    <List dense sx={{ py: 0 }}>
                      {treasures.map((t) => (
                        <ListItemButton
                          key={t.id}
                          selected={selectedTreasureId === t.id}
                          onClick={() => onSelectTreasure(t.id)}
                          onMouseEnter={() =>
                            onHoverChange({ kind: "treasure", id: t.id })
                          }
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
                      <Typography variant="caption" color="text.secondary">
                        No treasures in this region.
                      </Typography>
                    )}
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCreateError(null);
                        onNewTreasureDraftChange({ lat: "", lng: "" });
                        setCreateTreasureMode(true);
                      }}
                    >
                      Add treasure
                    </Button>
                  </Stack>
                </EditorAccordion>

                <EditorAccordion
                  section="trails"
                  expandedSection={expandedRegionSection}
                  onExpand={setExpandedRegionSection}
                  title="Trails"
                  subtitle={`${regionTrails.length}`}
                >
                  <Stack spacing={1}>
                    <List dense sx={{ py: 0 }}>
                      {regionTrails.map((t) => (
                        <ListItemButton
                          key={t.id}
                          selected={selectedTrailId === t.id}
                          onClick={() => onSelectTrail(t.id)}
                          onMouseEnter={() =>
                            onHoverChange({ kind: "trail", id: t.id })
                          }
                          onMouseLeave={() => onHoverChange(null)}
                          sx={{
                            minWidth: 0,
                            opacity:
                              t.ready_to_publish && selectedRegion?.ready_to_publish
                                ? 1
                                : 0.72,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                noWrap
                                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {t.title}
                              </Typography>
                            }
                            sx={{ minWidth: 0, mr: 1 }}
                          />
                          <ReadyToPublishControl
                            ready={t.ready_to_publish}
                            entityLabel="trail"
                            onChange={(ready) =>
                              onSetTrailReadyToPublish(t.id, ready)
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                    {regionTrails.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        No trails yet. Players will see an empty list until you add
                        one.
                      </Typography>
                    )}
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCreateError(null);
                        setNewTrailTitle("");
                        setCreateTrailMode(true);
                      }}
                    >
                      Add trail
                    </Button>
                  </Stack>
                </EditorAccordion>
              </>
            )}
          </Box>
        </Box>
      )}

      {selectedRegionId && selectedTrailId && !selectedChainId && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box sx={{ p: 1, overflowY: "auto", overflowX: "hidden", flex: 1 }}>
            <EditorAccordion
              section="details"
              expandedSection={expandedTrailSection}
              onExpand={setExpandedTrailSection}
              title="Trail details"
              subtitle={selectedTrail?.title ?? ""}
            >
              <Stack spacing={2}>
                {selectedRegion && !selectedRegion.ready_to_publish ? (
                  <Alert severity="info">
                    This region is not published. This trail is hidden from players
                    until the region is marked live.
                  </Alert>
                ) : selectedTrail && !selectedTrail.ready_to_publish ? (
                  <Alert severity="info">
                    This trail is a draft and is hidden from players until marked live.
                  </Alert>
                ) : null}

                {selectedTrail ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" onClick={openRenameDialog}>
                      Rename
                    </Button>
                    <ReadyToPublishControl
                      ready={selectedTrail.ready_to_publish}
                      entityLabel="trail"
                      onChange={(ready) =>
                        onSetTrailReadyToPublish(selectedTrail.id, ready)
                      }
                    />
                  </Box>
                ) : null}

                {selectedTrail ? (
                  <ImageUploadBlock
                    label="Trail cover image"
                    imagePath={selectedTrail.image_path}
                    imageCacheKey={
                      selectedTrail.image_path
                        ? `trail-image:${selectedTrail.id}`
                        : undefined
                    }
                    getImageUrl={getImageUrl}
                    emptyLabel="No trail image yet."
                    uploadLabel="Upload trail image"
                    replaceLabel="Replace trail image"
                    removeLabel="Remove image"
                    fullWidth
                    maxHeight={140}
                    onPickFile={async (file) => {
                      await onSetTrailImage({ trailId: selectedTrail.id, file });
                    }}
                    onRemove={async () => {
                      await onRemoveTrailImage({ trailId: selectedTrail.id });
                    }}
                  />
                ) : null}

                {selectedTrail ? (
                  <TrailMetadataEditor
                    trail={selectedTrail}
                    onSave={async (metadata) => {
                      await onUpdateTrailMetadata(selectedTrail.id, metadata);
                    }}
                  />
                ) : null}

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={onZoomToTrail}
                >
                  Zoom to trail
                </Button>
              </Stack>
            </EditorAccordion>

            <EditorAccordion
              section="stops"
              expandedSection={expandedTrailSection}
              onExpand={setExpandedTrailSection}
              title="Stops"
              subtitle={`${sortedTrailStops.length} location${sortedTrailStops.length === 1 ? "" : "s"}`}
            >
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Drag to reorder. Each location can only be on one trail.
                </Typography>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => void onTrailStopDragEnd(e)}
                >
                  <SortableContext
                    items={draftOrderedStopIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <List dense sx={{ pb: 0 }}>
                      {draftOrderedStopIds.map((stopId, idx) => {
                        const stop = sortedTrailStops.find((s) => s.id === stopId);
                        if (!stop) return null;
                        const chain = chains.find((c) => c.id === stop.chain_id);
                        return (
                          <SortableTrailStopRow
                            key={stop.id}
                            id={stop.id}
                            stopNumber={idx + 1}
                            title={chain?.title ?? "Unknown location"}
                            onRemove={() => void onRemoveTrailStop(stop.id)}
                            onSelectLocation={() => onSelectChain(stop.chain_id)}
                          />
                        );
                      })}
                    </List>
                  </SortableContext>
                </DndContext>

                {sortedTrailStops.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No stops yet. Add a location from this region.
                  </Typography>
                )}

                <TextField
                  select
                  size="small"
                  label="Add location"
                  value={addStopChainId}
                  onChange={(e) => setAddStopChainId(e.target.value)}
                  fullWidth
                  disabled={availableLocationsForTrail.length === 0}
                >
                  {availableLocationsForTrail.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.title}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!addStopChainId || createBusy}
                  onClick={() => void addSelectedStop()}
                >
                  Add stop
                </Button>
                {availableLocationsForTrail.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    All locations in this region are already on a trail (or none exist).
                  </Typography>
                )}
                {createError && (
                  <Typography variant="body2" color="error">
                    {createError}
                  </Typography>
                )}
              </Stack>
            </EditorAccordion>
          </Box>
          <Box sx={{ p: 1, borderTop: 1, borderColor: "divider" }}>
            <Button
              fullWidth
              color="error"
              variant="outlined"
              onClick={() => {
                setCreateError(null);
                setDeleteTrailDialogOpen(true);
              }}
            >
              Delete trail
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
            <EditorAccordion
              section="details"
              expandedSection={expandedChainSection}
              onExpand={setExpandedChainSection}
              title="Location details"
              subtitle={chainDetailsSubtitle}
            >
              <Stack spacing={2}>
                {selectedRegion && !selectedRegion.ready_to_publish ? (
                  <Alert severity="info">
                    This region is not published. This location is hidden from players
                    until the region is marked live.
                  </Alert>
                ) : selectedChain && !selectedChain.ready_to_publish ? (
                  <Alert severity="info">
                    This location is a draft and is hidden from players until marked
                    live.
                  </Alert>
                ) : null}

                {selectedChain ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" onClick={openRenameDialog}>
                      Rename
                    </Button>
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
                  </Box>
                ) : null}

                {selectedChain ? (
                  <ImageUploadBlock
                    label="Chain image"
                    imagePath={selectedChain.image_path}
                    imageCacheKey={
                      selectedChain.image_path
                        ? `chain-image:${selectedChain.id}`
                        : undefined
                    }
                    getImageUrl={getImageUrl}
                    emptyLabel="No chain image yet."
                    uploadLabel="Upload chain image"
                    replaceLabel="Replace chain image"
                    removeLabel="Remove image"
                    fullWidth
                    maxHeight={140}
                    onPickFile={async (file) => {
                      await onSetChainImage({ chainId: selectedChain.id, file });
                    }}
                    onRemove={async () => {
                      await onRemoveChainImage({ chainId: selectedChain.id });
                    }}
                  />
                ) : null}

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={onZoomToChain}
                >
                  Zoom to location
                </Button>
              </Stack>
            </EditorAccordion>

            <EditorAccordion
              section="steps"
              expandedSection={expandedChainSection}
              onExpand={setExpandedChainSection}
              title="Steps"
              subtitle={chainStepsSubtitle}
            >
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Drag handle to reorder. Steps with coordinates: {stepsWithCoordsCount}/
                  {draftSteps.length}
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
                    <List dense sx={{ pb: 0 }}>
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

                <Button
                  fullWidth
                  variant="outlined"
                  disabled={createBusy}
                  onClick={addStep}
                >
                  Add step
                </Button>

                {createError && !regionDialogOpen ? (
                  <Typography variant="body2" color="error">
                    {createError}
                  </Typography>
                ) : null}

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
              </Stack>
            </EditorAccordion>
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
            {canDeleteChains ? (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={createBusy}
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
          {selectedChainId
            ? "Rename location"
            : selectedTrailId
              ? "Rename trail"
              : "Rename region"}
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
        open={deleteTrailDialogOpen}
        onClose={() => !createBusy && setDeleteTrailDialogOpen(false)}
      >
        <DialogTitle>Delete trail</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {selectedTrail
              ? `Delete trail “${selectedTrail.title}”? Locations on it are not deleted.`
              : "Delete this trail?"}
          </Typography>
          {createError && deleteTrailDialogOpen ? (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTrailDialogOpen(false)}
            disabled={createBusy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void confirmDeleteTrail()}
            disabled={createBusy || !selectedTrailId}
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
