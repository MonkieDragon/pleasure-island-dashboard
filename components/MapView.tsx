// Clean MapView implementation (avoids duplicate-file issue).
"use client";

import { PuzzleChain, PuzzleStep, Region, Treasure } from "@/types/database";
import type { MapHover } from "@/types/mapUi";
import type { Country } from "@/lib/countries";
import {
  MapContainer,
  CircleMarker,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { Alert, Box, Fab, Snackbar, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickChainIcon } from "@/lib/chainMapIcons";

const ICON_SIZE: [number, number] = [36, 36];
const ICON_ANCHOR: [number, number] = [18, 36];

const iconDefault = L.icon({
  iconUrl: "/map-icons/map-icon.png",
  iconSize: ICON_SIZE,
  iconAnchor: ICON_ANCHOR,
});

const iconHover = L.icon({
  iconUrl: "/map-icons/map-icon-hover.png",
  iconSize: ICON_SIZE,
  iconAnchor: ICON_ANCHOR,
});

const iconSelected = L.icon({
  iconUrl: "/map-icons/map-icon-selected.png",
  iconSize: ICON_SIZE,
  iconAnchor: ICON_ANCHOR,
});

const iconTreasure = L.icon({
  iconUrl: "/map-icons/map-icon-treasure.png",
  iconSize: ICON_SIZE,
  iconAnchor: ICON_ANCHOR,
});

const iconTreasureSelected = L.icon({
  iconUrl: "/map-icons/map-icon-treasure-selected.png",
  iconSize: ICON_SIZE,
  iconAnchor: ICON_ANCHOR,
});

function hoverMatch(
  h: MapHover | null,
  kind: MapHover["kind"],
  id: string,
) {
  return h?.kind === kind && h.id === id;
}

function pickStandardIcon(selected: boolean, hovered: boolean) {
  if (hovered) return iconHover;
  if (selected) return iconSelected;
  return iconDefault;
}

function pickTreasureIcon(selected: boolean, hovered: boolean) {
  if (hovered) return iconHover;
  if (selected) return iconTreasureSelected;
  return iconTreasure;
}

type Props = {
  countries: Country[];
  regions: Region[];
  chains: PuzzleChain[];
  steps: PuzzleStep[];
  /** Loaded for region context; map uses `steps` for the selected chain. */
  regionSteps: PuzzleStep[];
  treasures: Treasure[];
  focusToken: number;
  selectedCountryId: string | null;
  selectedRegionId: string | null;
  selectedChainId: string | null;
  /** True once the steps fetch for the selected chain has completed. */
  chainStepsReady: boolean;
  selectedStepId: string | null;
  selectedTreasureId: string | null;
  mapHover: MapHover | null;
  onHoverChange: (next: MapHover | null) => void;
  placement:
    | null
    | { kind: "step"; stepId: string }
    | { kind: "newChain"; regionId: string }
    | { kind: "newTreasure"; regionId: string }
    | { kind: "treasure"; treasureId: string };
  onPlacementMapClick: (lat: number, lng: number) => void;
  onCancelPlacement: () => void;
  onSelectCountry: (id: string) => void;
  onSelectRegion: (id: string) => void;
  onSelectChain: (id: string) => void;
  onSelectStep: (id: string) => void;
  onSelectTreasure: (id: string) => void;
  onMoveStep: (id: string, lat: number, lng: number) => void;
  onMoveTreasure: (id: string, lat: number, lng: number) => void;

  newChainDraftLatLng: [number, number] | null;
  newTreasureDraftLatLng: [number, number] | null;
  onSetNewChainDraftLatLng: (lat: number, lng: number) => void;
  onSetNewTreasureDraftLatLng: (lat: number, lng: number) => void;

  /** Sidebar "zoom to step" — recenters map without changing chain fit key. */
  stepSpotlightToken: number;
  stepSpotlightCenter: [number, number] | null;

  /** When false, no geolocation UI or API calls (desktop). */
  enableUserLocation: boolean;
  /** Bumped when map container size may change (e.g. mobile layout). */
  invalidateSizeKey?: number;
};

type LatLng = [number, number];

/** Drop invalid coords; ignore (0,0) which often indicates missing data. */
function sanitizeLatLngPoints(points: LatLng[]): LatLng[] {
  return points.filter(
    ([lat, lng]) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0),
  );
}

type CameraTarget =
  | {
      kind: "fitBounds";
      points: LatLng[];
      paddingPx?: number;
      paddingRatio?: number;
      maxZoom?: number;
    }
  | {
      kind: "setView";
      center: LatLng;
      zoom: number;
    };

const CAMERA_ANIM = {
  animate: true,
  duration: 1.25,
  easeLinearity: 0.25,
} as const;

const CHAIN_FOCUS_ZOOM = 16;
const CHAIN_FIT_MAX_ZOOM = 18;

function CameraController({
  cameraKey,
  target,
}: {
  cameraKey: string;
  target: CameraTarget | null;
}) {
  const map = useMap();
  const lastAppliedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!target) return;
    if (lastAppliedKeyRef.current === cameraKey) return;
    lastAppliedKeyRef.current = cameraKey;

    if (target.kind === "setView") {
      map.setView(target.center, target.zoom, CAMERA_ANIM);
      return;
    }

    const clean = sanitizeLatLngPoints(target.points);
    if (clean.length === 0) return;
    const bounds = L.latLngBounds(clean);
    const size = map.getSize();
    const padding =
      target.paddingRatio != null
        ? L.point(size.x * target.paddingRatio, size.y * target.paddingRatio)
        : L.point(target.paddingPx ?? 30, target.paddingPx ?? 30);
    map.flyToBounds(bounds, {
      paddingTopLeft: padding,
      paddingBottomRight: padding,
      maxZoom: target.maxZoom,
      duration: CAMERA_ANIM.duration,
      easeLinearity: CAMERA_ANIM.easeLinearity,
    });
  }, [cameraKey, map, target]);

  return null;
}

function MapInvalidateSize({ token }: { token: number }) {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => cancelAnimationFrame(id);
  }, [map, token]);
  return null;
}

function PlacementClickHandler({
  active,
  onPlacementMapClick,
}: {
  active: boolean;
  onPlacementMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPlacementMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function UserLocationController({
  location,
  zoomToken,
}: {
  location: [number, number] | null;
  zoomToken: number;
}) {
  const map = useMap();
  const lastTokenRef = useRef<number>(-1);
  useEffect(() => {
    if (!location) return;
    if (lastTokenRef.current === zoomToken) return;
    lastTokenRef.current = zoomToken;
    map.setView(location, 16, CAMERA_ANIM);
  }, [location, map, zoomToken]);
  return null;
}

function StepSpotlightController({
  center,
  token,
}: {
  center: LatLng | null;
  token: number;
}) {
  const map = useMap();
  const lastTokenRef = useRef<number>(-1);
  useEffect(() => {
    if (!center) return;
    if (lastTokenRef.current === token) return;
    lastTokenRef.current = token;
    map.setView(center, CHAIN_FOCUS_ZOOM, CAMERA_ANIM);
  }, [center, map, token]);
  return null;
}

function placementHint(placement: Props["placement"]): string {
  if (!placement) return "";
  if (placement.kind === "newChain")
    return "Tap the map to set the new chain location. Press Esc to cancel.";
  if (placement.kind === "newTreasure")
    return "Tap the map to place the new treasure. Press Esc to cancel.";
  if (placement.kind === "treasure")
    return "Tap the map to set the treasure location. Press Esc to cancel.";
  return "Tap the map to place the step. Press Esc to cancel.";
}

export default function MapView(props: Props) {
  const {
    countries,
    regions,
    chains,
    steps,
    treasures,
    focusToken,
    selectedCountryId,
    selectedRegionId,
    selectedChainId,
    chainStepsReady,
    selectedStepId,
    selectedTreasureId,
    mapHover,
    onHoverChange,
    placement,
    onPlacementMapClick,
    onCancelPlacement,
    onSelectCountry,
    onSelectRegion,
    onSelectChain,
    onSelectStep,
    onSelectTreasure,
    onMoveStep,
    onMoveTreasure,
    newChainDraftLatLng,
    newTreasureDraftLatLng,
    onSetNewChainDraftLatLng,
    onSetNewTreasureDraftLatLng,
    stepSpotlightToken,
    stepSpotlightCenter,
    enableUserLocation,
    invalidateSizeKey = 0,
  } = props;

  const atCountriesRoot = !selectedCountryId;
  const atCountryLevel = !!selectedCountryId && !selectedRegionId;
  const showCountryMarkers = atCountriesRoot;
  const showRegionMarkers = atCountryLevel;
  const regionChains = useMemo(
    () =>
      selectedRegionId
        ? chains.filter((c) => c.region_id === selectedRegionId)
        : [],
    [chains, selectedRegionId],
  );

  const visibleSteps = steps.filter((s) => s.chain_id === selectedChainId);
  const visibleStepsWithCoords = visibleSteps.filter(
    (s): s is PuzzleStep & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null,
  );
  const showChainMarkers =
    !!selectedRegionId &&
    (!selectedChainId || visibleStepsWithCoords.length === 0);

  const trail = visibleStepsWithCoords
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((s) => [s.latitude, s.longitude] as [number, number]);

  const countryPoints: LatLng[] = useMemo(
    () =>
      countries.map(
        (c) => [c.latitude, c.longitude] as LatLng,
      ),
    [countries],
  );

  const countryLevelPoints: LatLng[] = useMemo(
    () =>
      regions
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r) => [r.latitude as number, r.longitude as number] as LatLng),
    [regions],
  );

  const regionPoints: LatLng[] = useMemo(
    () =>
      regionChains
        .filter((c) => c.latitude !== null && c.longitude !== null)
        .map(
          (c) =>
            [c.latitude as number, c.longitude as number] as LatLng,
        ),
    [regionChains],
  );

  const chainPoints: LatLng[] = useMemo(
    () => visibleStepsWithCoords.map((s) => [s.latitude, s.longitude] as LatLng),
    [visibleStepsWithCoords],
  );

  const selectedChain = useMemo(
    () =>
      selectedChainId
        ? regionChains.find((c) => c.id === selectedChainId) || null
        : null,
    [regionChains, selectedChainId],
  );

  const viewLevel: "countries" | "country" | "region" | "chain" = atCountriesRoot
    ? "countries"
    : atCountryLevel
      ? "country"
      : selectedChainId
        ? "chain"
        : "region";

  const chainAnchor: LatLng | null = useMemo(() => {
    if (
      !selectedChain ||
      selectedChain.latitude == null ||
      selectedChain.longitude == null
    ) {
      return null;
    }
    return [selectedChain.latitude, selectedChain.longitude] as LatLng;
  }, [selectedChain]);

  const chainStepPoints = chainPoints;

  const cameraTarget: CameraTarget | null = useMemo(() => {
    if (viewLevel === "countries") {
      const pts = sanitizeLatLngPoints(countryPoints);
      return pts.length >= 2
        ? { kind: "fitBounds", points: pts, paddingRatio: 0.2, maxZoom: 5 }
        : pts.length === 1
          ? { kind: "setView", center: pts[0], zoom: 5 }
          : null;
    }

    if (viewLevel === "country") {
      const pts = sanitizeLatLngPoints(countryLevelPoints);
      if (pts.length >= 2) {
        return { kind: "fitBounds", points: pts, paddingRatio: 0.12, maxZoom: 11 };
      }
      if (pts.length === 1) {
        return { kind: "setView", center: pts[0], zoom: 10 };
      }
      const selected = countries.find((c) => c.id === selectedCountryId);
      if (selected) {
        return {
          kind: "setView",
          center: [selected.latitude, selected.longitude],
          zoom: 6,
        };
      }
      return null;
    }

    if (viewLevel === "region") {
      const pts = sanitizeLatLngPoints(regionPoints);
      return pts.length >= 2
        ? { kind: "fitBounds", points: pts, paddingPx: 30, maxZoom: 15 }
        : pts.length === 1
          ? { kind: "setView", center: pts[0], zoom: 12 }
          : null;
    }

    if (!chainStepsReady) return null;

    const stepPts = sanitizeLatLngPoints(chainStepPoints);
    if (stepPts.length >= 2) {
      return {
        kind: "fitBounds",
        points: stepPts,
        paddingPx: 48,
        maxZoom: CHAIN_FIT_MAX_ZOOM,
      };
    }
    if (stepPts.length === 1) {
      return { kind: "setView", center: stepPts[0], zoom: CHAIN_FOCUS_ZOOM };
    }
    if (chainAnchor) {
      return { kind: "setView", center: chainAnchor, zoom: CHAIN_FOCUS_ZOOM };
    }
    return null;
  }, [
    chainAnchor,
    chainStepPoints,
    chainStepsReady,
    countries,
    countryLevelPoints,
    countryPoints,
    regionPoints,
    selectedCountryId,
    viewLevel,
  ]);

  const cameraKey = useMemo(() => {
    if (viewLevel === "countries") return "countries";
    if (viewLevel === "country")
      return `country:${selectedCountryId ?? "none"}:focus:${focusToken}`;
    if (viewLevel === "region")
      return `region:${selectedRegionId ?? "none"}:focus:${focusToken}`;
    return `chain:${selectedChainId ?? "none"}:ready:${chainStepsReady ? 1 : 0}:focus:${focusToken}`;
  }, [
    viewLevel,
    selectedCountryId,
    selectedRegionId,
    selectedChainId,
    chainStepsReady,
    focusToken,
  ]);

  const countryMarkers = countries.map((c) => ({
    country: c,
    position: [c.latitude, c.longitude] as [number, number],
  }));

  const regionMarkers = regions
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      region: r,
      position: [r.latitude as number, r.longitude as number] as [number, number],
    }));

  const regionChainsWithCoords = useMemo(
    () =>
      regionChains.filter(
        (c): c is PuzzleChain & { latitude: number; longitude: number } =>
          c.latitude !== null && c.longitude !== null,
      ),
    [regionChains],
  );

  const treasuresWithCoords = useMemo(
    () =>
      treasures.filter(
        (t): t is Treasure & { latitude: number; longitude: number } =>
          t.latitude != null && t.longitude != null,
      ),
    [treasures],
  );

  const placementActive = !!placement;
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [zoomToMeToken, setZoomToMeToken] = useState(0);

  return (
    <Box
      sx={{
        height: "100%",
        position: "relative",
        cursor: placementActive ? "crosshair" : "default",
      }}
    >
      <MapContainer
        center={[10.3157, 123.8854]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapInvalidateSize token={invalidateSizeKey} />

          <CameraController cameraKey={cameraKey} target={cameraTarget} />

          <StepSpotlightController
            center={stepSpotlightCenter}
            token={stepSpotlightToken}
          />

          <PlacementClickHandler
            active={placementActive}
            onPlacementMapClick={onPlacementMapClick}
          />

          {enableUserLocation && (
            <UserLocationController location={userLocation} zoomToken={zoomToMeToken} />
          )}

          {newChainDraftLatLng && (
            <Marker
              position={newChainDraftLatLng}
              icon={iconSelected}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onSetNewChainDraftLatLng(pos.lat, pos.lng);
                },
              }}
            />
          )}

          {newTreasureDraftLatLng && (
            <Marker
              position={newTreasureDraftLatLng}
              icon={iconTreasureSelected}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onSetNewTreasureDraftLatLng(pos.lat, pos.lng);
                },
              }}
            />
          )}

          {showCountryMarkers &&
            countryMarkers.map(({ country, position }) => {
              const hovered = hoverMatch(mapHover, "country", country.id);
              const icon = pickStandardIcon(false, hovered);
              return (
                <Marker
                  key={country.id}
                  position={position}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSelectCountry(country.id),
                    mouseover: () =>
                      onHoverChange({ kind: "country", id: country.id }),
                    mouseout: () => onHoverChange(null),
                  }}
                />
              );
            })}

          {showRegionMarkers &&
            regionMarkers.map(({ region, position }) => {
              const hovered = hoverMatch(mapHover, "region", region.id);
              const icon = pickStandardIcon(false, hovered);
              return (
                <Marker
                  key={region.id}
                  position={position}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSelectRegion(region.id),
                    mouseover: () =>
                      onHoverChange({ kind: "region", id: region.id }),
                    mouseout: () => onHoverChange(null),
                  }}
                />
              );
            })}

          {!!selectedRegionId &&
            showChainMarkers &&
            regionChainsWithCoords.map((c) => {
              const hovered = hoverMatch(mapHover, "chain", c.id);
              const selected = selectedChainId === c.id;
              const icon = pickChainIcon({
                isEatery: !!c.is_eatery,
                optional: c.optional !== false,
                readyToPublish: !!c.ready_to_publish,
                selected,
                hovered,
              });
              return (
                <Marker
                  key={c.id}
                  position={[c.latitude, c.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSelectChain(c.id),
                    mouseover: () =>
                      onHoverChange({ kind: "chain", id: c.id }),
                    mouseout: () => onHoverChange(null),
                  }}
                />
              );
            })}

          {visibleStepsWithCoords.map((s) => {
            const hovered = hoverMatch(mapHover, "step", s.id);
            const selected = selectedStepId === s.id;
            const icon = pickStandardIcon(selected, hovered);
            return (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                icon={icon}
                draggable={!placementActive}
                eventHandlers={{
                  click: () => {
                    onSelectChain(s.chain_id);
                    onSelectStep(s.id);
                  },
                  mouseover: () => onHoverChange({ kind: "step", id: s.id }),
                  mouseout: () => onHoverChange(null),
                  dragend: (e) => {
                    const pos = e.target.getLatLng();
                    onMoveStep(s.id, pos.lat, pos.lng);
                  },
                }}
              />
            );
          })}

          {trail.length > 1 && <Polyline positions={trail} />}

          {enableUserLocation && userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ color: "#1976d2", fillColor: "#1976d2", fillOpacity: 0.35 }}
            />
          )}

          {viewLevel === "region" &&
            selectedRegionId &&
            treasuresWithCoords.map((t) => {
              const hovered = hoverMatch(mapHover, "treasure", t.id);
              const selected = selectedTreasureId === t.id;
              const icon = pickTreasureIcon(selected, hovered);
              return (
                <Marker
                  key={t.id}
                  position={[t.latitude, t.longitude]}
                  icon={icon}
                  draggable={!placementActive}
                  eventHandlers={{
                    click: () => onSelectTreasure(t.id),
                    mouseover: () =>
                      onHoverChange({ kind: "treasure", id: t.id }),
                    mouseout: () => onHoverChange(null),
                    dragend: (e) => {
                      const pos = e.target.getLatLng();
                      onMoveTreasure(t.id, pos.lat, pos.lng);
                    },
                  }}
                />
              );
            })}
      </MapContainer>

      {placementActive && placement && (
        <Alert
          severity="info"
          onClose={onCancelPlacement}
          sx={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 8,
            zIndex: 1000,
            maxWidth: "calc(100% - 16px)",
          }}
        >
          <Typography variant="body2">{placementHint(placement)}</Typography>
        </Alert>
      )}

      {enableUserLocation && (
        <>
          <Fab
            color="primary"
            size="small"
            aria-label="Zoom to my location"
            sx={{ position: "absolute", bottom: placementActive ? 88 : 16, right: 16, zIndex: 1000 }}
            onClick={() => {
              setUserLocationError(null);
              if (!navigator.geolocation) {
                setUserLocationError("Geolocation is not supported in this browser.");
                return;
              }
              if (userLocation) {
                setZoomToMeToken((n) => n + 1);
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const next: LatLng = [pos.coords.latitude, pos.coords.longitude];
                  setUserLocation(next);
                  setZoomToMeToken((n) => n + 1);
                },
                (err) => {
                  setUserLocationError(err.message || "Failed to get location.");
                },
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
              );
            }}
          >
            <MyLocationIcon />
          </Fab>
          <Snackbar
            open={!!userLocationError}
            autoHideDuration={6000}
            onClose={() => setUserLocationError(null)}
            message={userLocationError}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          />
        </>
      )}
    </Box>
  );
}
