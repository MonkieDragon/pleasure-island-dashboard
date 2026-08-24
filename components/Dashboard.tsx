"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/supabaseError";
import {
  fileExtensionFromName,
  removeStorageImage,
  uploadStorageImage,
} from "@/lib/storageImage";
import { withImageCacheBust } from "@/lib/storageImageUrl";

import {
  COUNTRIES,
  getCountryById,
  normalizeCountryId,
  type Country,
} from "@/lib/countries";
import {
  PuzzleChain,
  PuzzleStep,
  Region,
  Trail,
  TrailStop,
  Treasure,
  parseStepHint,
  serializeStepHint,
  type CameraOverlayConfig,
  type InteractiveConfig,
  type JigsawConfig,
  type SymbolCodexConfig,
} from "@/types/database";
import type { MapHover } from "@/types/mapUi";

import Sidebar from "./Sidebar";
import SingleStepEditor from "./SingleStepEditor";
import SingleTreasureEditor from "./SingleTreasureEditor";
import AdminAccessPanel from "./AdminAccessPanel";
import dynamic from "next/dynamic";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
});

type AccessState = "loading" | "denied" | "staff" | "no_regions";

type StaffRole = "editor" | "admin";

export default function Dashboard() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("loading");
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  /** null = admin (all regions); Set for editors */
  const [editorRegionIds, setEditorRegionIds] = useState<Set<string> | null>(
    null,
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [adminProfiles, setAdminProfiles] = useState<
    { id: string; role: string; email: string | null }[]
  >([]);
  const [adminGrants, setAdminGrants] = useState<
    { user_id: string; region_id: string }[]
  >([]);
  const [desktopSidebarSection, setDesktopSidebarSection] = useState<
    "game" | "admin"
  >("game");

  useEffect(() => {
    let cancelled = false;

    async function applySession(
      session: import("@supabase/supabase-js").Session | null,
    ) {
      if (cancelled) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      setSessionUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const role = profile?.role;
      if (role !== "editor" && role !== "admin") {
        setStaffRole(null);
        setEditorRegionIds(null);
        setAccess("denied");
        return;
      }
      setStaffRole(role);
      if (role === "admin") {
        setEditorRegionIds(null);
        setAccess("staff");
        return;
      }
      const { data: grants, error: grantsErr } = await supabase
        .from("editor_region_access")
        .select("region_id")
        .eq("user_id", session.user.id);
      if (cancelled) return;
      if (grantsErr) {
        setStaffRole(null);
        setEditorRegionIds(null);
        setAccess("denied");
        return;
      }
      const ids = new Set(
        (grants || []).map((g) => g.region_id).filter(Boolean) as string[],
      );
      setEditorRegionIds(ids);
      setAccess(ids.size === 0 ? "no_regions" : "staff");
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const accessOk = access === "staff";
  const isAdmin = staffRole === "admin";

  type Placement =
    | null
    | { kind: "step"; stepId: string }
    | { kind: "newChain"; regionId: string }
    | { kind: "newTreasure"; regionId: string }
    | { kind: "treasure"; treasureId: string };

  const [regions, setRegions] = useState<Region[]>([]);
  const [chains, setChains] = useState<PuzzleChain[]>([]);
  const [steps, setSteps] = useState<PuzzleStep[]>([]);
  const [regionSteps, setRegionSteps] = useState<PuzzleStep[]>([]);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [trailStops, setTrailStops] = useState<TrailStop[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(
    null,
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(
    null,
  );
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);

  const accessibleRegions = useMemo(() => {
    if (!accessOk) return [];
    if (isAdmin || editorRegionIds === null) return regions;
    return regions.filter((r) => editorRegionIds.has(r.id));
  }, [accessOk, isAdmin, editorRegionIds, regions]);

  const visibleRegions = useMemo(() => {
    if (!selectedCountryId) return [];
    return accessibleRegions.filter(
      (r) => normalizeCountryId(r.country) === selectedCountryId,
    );
  }, [accessibleRegions, selectedCountryId]);

  const sidebarCountries = useMemo((): Country[] => {
    if (!accessOk) return [];
    if (isAdmin) return [...COUNTRIES];
    const ids = new Set(
      accessibleRegions.map((r) => normalizeCountryId(r.country)).filter(Boolean),
    );
    return COUNTRIES.filter((c) => ids.has(c.id));
  }, [accessOk, isAdmin, accessibleRegions]);

  const visibleChains = useMemo(() => {
    if (!accessOk) return [];
    if (isAdmin || editorRegionIds === null) return chains;
    return chains.filter(
      (c) => c.region_id != null && editorRegionIds.has(c.region_id),
    );
  }, [accessOk, isAdmin, editorRegionIds, chains]);

  const visibleTrails = useMemo(() => {
    if (!accessOk) return [];
    if (isAdmin || editorRegionIds === null) return trails;
    return trails.filter((t) => editorRegionIds.has(t.region_id));
  }, [accessOk, isAdmin, editorRegionIds, trails]);

  const reloadAdminData = useCallback(async () => {
    const [pr, gr] = await Promise.all([
      supabase.from("profiles").select("id, role, email").order("email"),
      supabase.from("editor_region_access").select("user_id, region_id"),
    ]);
    if (pr.error) throw new Error(formatSupabaseError(pr.error));
    if (gr.error) throw new Error(formatSupabaseError(gr.error));
    setAdminProfiles((pr.data || []) as { id: string; role: string; email: string | null }[]);
    setAdminGrants(
      (gr.data || []) as { user_id: string; region_id: string }[],
    );
  }, []);

  useEffect(() => {
    if (!accessOk || !isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        await reloadAdminData();
      } catch {
        if (!cancelled) {
          setAdminProfiles([]);
          setAdminGrants([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessOk, isAdmin, reloadAdminData]);

  useEffect(() => {
    if (!accessOk || isAdmin || !selectedRegionId) return;
    if (!visibleRegions.some((r) => r.id === selectedRegionId)) {
      setSelectedRegionId(null);
      setSelectedChainId(null);
      setSelectedStepId(null);
      setSelectedTreasureId(null);
      setSelectedTrailId(null);
      setSteps([]);
      setRegionSteps([]);
      setTreasures([]);
      setTrailStops([]);
    }
  }, [accessOk, isAdmin, selectedRegionId, visibleRegions]);

  const [stepOrderDraft, setStepOrderDraft] = useState<{
    chainId: string;
    orderedStepIds: string[];
    isDirty: boolean;
  } | null>(null);

  const [pendingNav, setPendingNav] = useState<
    | null
    | { type: "backToRoot" }
    | { type: "backOneLevel" }
    | { type: "selectCountry"; countryId: string }
    | { type: "selectRegion"; regionId: string }
    | { type: "selectChain"; chainId: string }
    | { type: "selectTrail"; trailId: string }
  >(null);

  const [mapHover, setMapHover] = useState<MapHover | null>(null);
  const [placement, setPlacement] = useState<Placement>(null);
  const [mapFocusToken, setMapFocusToken] = useState(0);
  const [stepSpotlightToken, setStepSpotlightToken] = useState(0);
  const [stepSpotlightCenter, setStepSpotlightCenter] = useState<
    [number, number] | null
  >(null);
  /** Bumped after storage upload/remove so preview URLs bypass browser cache. */
  const [imageCacheVersion, setImageCacheVersion] = useState<Record<string, number>>({});
  const [stepsLoadedForChainId, setStepsLoadedForChainId] = useState<
    string | null
  >(null);

  /** In-memory steps per chain — revisit without refetch until this session mutates. */
  const stepsCacheRef = useRef<Record<string, PuzzleStep[]>>({});

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileLowerTab, setMobileLowerTab] = useState(0);
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

  const [newChainDraft, setNewChainDraft] = useState<{
    title: string;
    lat: string;
    lng: string;
  }>({ title: "", lat: "", lng: "" });

  const [newTreasureDraft, setNewTreasureDraft] = useState<{
    lat: string;
    lng: string;
  }>({ lat: "", lng: "" });

  const placementStepId =
    placement?.kind === "step" ? placement.stepId : null;
  const placementTreasureId =
    placement?.kind === "treasure" ? placement.treasureId : null;
  const newChainPlacementActive = placement?.kind === "newChain";
  const newTreasurePlacementActive = placement?.kind === "newTreasure";

  const isStepOrderDirty = !!stepOrderDraft?.isDirty;
  const canSaveDraft = useMemo(() => {
    return (
      isStepOrderDirty &&
      !!stepOrderDraft?.chainId &&
      stepOrderDraft.orderedStepIds.length > 0
    );
  }, [isStepOrderDirty, stepOrderDraft]);

  const regionChainIdsKey = useMemo(() => {
    if (!selectedRegionId) return "";
    return visibleChains
      .filter((c) => c.region_id === selectedRegionId)
      .map((c) => c.id)
      .sort()
      .join(",");
  }, [visibleChains, selectedRegionId]);

  const regionTrailIdsKey = useMemo(() => {
    if (!selectedRegionId) return "";
    return visibleTrails
      .filter((t) => t.region_id === selectedRegionId)
      .map((t) => t.id)
      .sort()
      .join(",");
  }, [visibleTrails, selectedRegionId]);

  const orderedStepIdsForNav = useMemo(
    () => [...steps].sort((a, b) => a.order_index - b.order_index).map((s) => s.id),
    [steps],
  );
  const stepNavIndex =
    selectedStepId && !selectedTreasureId
      ? orderedStepIdsForNav.indexOf(selectedStepId)
      : -1;

  // This is a client component; render the map immediately.

  // ----------------------------
  // LOAD REGIONS (once)
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    supabase
      .from("regions")
      .select("*")
      .then(({ data }) => {
        setRegions((data || []) as Region[]);
      });
  }, [accessOk]);

  // ----------------------------
  // LOAD CHAINS (once)
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    supabase
      .from("puzzle_chains")
      .select("*")
      .then(({ data }) => setChains((data || []) as PuzzleChain[]));
  }, [accessOk]);

  // ----------------------------
  // LOAD TRAILS (once)
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    supabase
      .from("trails")
      .select("*")
      .then(({ data }) => setTrails((data || []) as Trail[]));
  }, [accessOk]);

  // ----------------------------
  // LOAD STEPS (when chain changes; reuse in-memory cache when revisiting)
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    if (!selectedChainId) {
      queueMicrotask(() => {
        setSteps([]);
        setStepsLoadedForChainId(null);
      });
      return;
    }

    const cached = stepsCacheRef.current[selectedChainId];
    if (cached) {
      queueMicrotask(() => {
        setSteps(cached);
        setStepsLoadedForChainId(selectedChainId);
      });
      return;
    }

    queueMicrotask(() => {
      setStepsLoadedForChainId(null);
    });

    supabase
      .from("puzzle_steps")
      .select("*")
      .eq("chain_id", selectedChainId)
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        const rows = (data || []) as PuzzleStep[];
        setSteps(rows);
        setStepsLoadedForChainId(selectedChainId);
        stepsCacheRef.current[selectedChainId] = rows;
      });
  }, [accessOk, selectedChainId]);

  // Keep cache aligned with current chain steps (mutations update `steps` state).
  useEffect(() => {
    if (!selectedChainId || stepsLoadedForChainId !== selectedChainId) return;
    stepsCacheRef.current[selectedChainId] = steps;
  }, [selectedChainId, steps, stepsLoadedForChainId]);

  // ----------------------------
  // LOAD REGION STEPS + TREASURES + TRAIL STOPS
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    const load = async () => {
      if (!selectedRegionId) {
        queueMicrotask(() => {
          setRegionSteps([]);
          setTreasures([]);
          setTrailStops([]);
        });
        return;
      }

      const regionChainIds =
        regionChainIdsKey === "" ? [] : regionChainIdsKey.split(",").filter(Boolean);

      if (regionChainIds.length === 0) {
        queueMicrotask(() => {
          setRegionSteps([]);
        });
      } else {
        const { data } = await supabase
          .from("puzzle_steps")
          .select("*")
          .in("chain_id", regionChainIds);
        queueMicrotask(() => {
          setRegionSteps((data || []) as PuzzleStep[]);
        });
      }

      const { data: treasureData } = await supabase
        .from("treasures")
        .select("*")
        .eq("region_id", selectedRegionId);
      queueMicrotask(() => {
        setTreasures((treasureData || []) as Treasure[]);
      });

      const regionTrailIds =
        regionTrailIdsKey === ""
          ? []
          : regionTrailIdsKey.split(",").filter(Boolean);
      if (regionTrailIds.length === 0) {
        queueMicrotask(() => {
          setTrailStops([]);
        });
      } else {
        const { data: stopData } = await supabase
          .from("trail_stops")
          .select("*")
          .in("trail_id", regionTrailIds)
          .order("order_index", { ascending: true });
        queueMicrotask(() => {
          setTrailStops((stopData || []) as TrailStop[]);
        });
      }
    };

    void load();
  }, [accessOk, selectedRegionId, regionChainIdsKey, regionTrailIdsKey]);

  const moveStep = async (id: string, lat: number, lng: number) => {
    const { error } = await supabase
      .from("puzzle_steps")
      .update({ latitude: lat, longitude: lng })
      .eq("id", id);
    if (error) throw new Error(formatSupabaseError(error));

    const movedStep = steps.find((s) => s.id === id) || null;

    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, latitude: lat, longitude: lng } : s)),
    );
    setRegionSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, latitude: lat, longitude: lng } : s)),
    );

    // Chain location is derived from the pinned first info step.
    if (movedStep?.type === "info" && movedStep.order_index === 0) {
      await supabase
        .from("puzzle_chains")
        .update({ latitude: lat, longitude: lng })
        .eq("id", movedStep.chain_id);

      setChains((prev) =>
        prev.map((c) =>
          c.id === movedStep.chain_id ? { ...c, latitude: lat, longitude: lng } : c,
        ),
      );
    }
  };

  const moveTreasure = async (id: string, lat: number, lng: number) => {
    await supabase
      .from("treasures")
      .update({ latitude: lat, longitude: lng })
      .eq("id", id);

    setTreasures((prev) =>
      prev.map((t) => (t.id === id ? { ...t, latitude: lat, longitude: lng } : t)),
    );
  };

  const updateTreasure = async (updated: Treasure) => {
    const { error } = await supabase
      .from("treasures")
      .update({
        description: updated.description,
        notes: updated.notes,
        status: updated.status,
        latitude: updated.latitude,
        longitude: updated.longitude,
        image_path: updated.image_path,
      })
      .eq("id", updated.id);
    if (error) throw new Error(formatSupabaseError(error));
    setTreasures((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const setTreasureImage = async (input: { treasureId: string; file: File }) => {
    const t = treasures.find((x) => x.id === input.treasureId) || null;
    if (!t) return;
    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `treasures/${input.treasureId}.${ext}`,
      previousPath: t.image_path,
    });
    await updateTreasure({ ...t, image_path: objectPath });
    bumpImageCache(`treasure-image:${input.treasureId}`);
  };

  const removeTreasureImage = async (input: { treasureId: string }) => {
    const t = treasures.find((x) => x.id === input.treasureId) || null;
    if (!t) return;
    if (t.image_path) {
      await removeStorageImage(supabase, t.image_path);
    }
    await updateTreasure({ ...t, image_path: null });
    bumpImageCache(`treasure-image:${input.treasureId}`);
  };

  // ----------------------------
  // UPDATE STEP
  // ----------------------------
  const updateStep = async (updated: PuzzleStep) => {
    const isPinnedInfo =
      updated.type === "info" && updated.order_index === 0;

    if (isPinnedInfo && (updated.latitude == null || updated.longitude == null)) {
      throw new Error("The first info step must have latitude and longitude.");
    }

    await supabase.from("puzzle_steps").update(updated).eq("id", updated.id);

    if (isPinnedInfo && updated.latitude != null && updated.longitude != null) {
      await supabase
        .from("puzzle_chains")
        .update({ latitude: updated.latitude, longitude: updated.longitude })
        .eq("id", updated.chain_id);

      setChains((prev) =>
        prev.map((c) =>
          c.id === updated.chain_id
            ? { ...c, latitude: updated.latitude!, longitude: updated.longitude! }
            : c,
        ),
      );
    }

    setPlacement((p) => {
      if (!p || p.kind !== "step") return p;
      if (p.stepId !== updated.id) return p;
      return updated.latitude === null && updated.longitude === null ? null : p;
    });

    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setRegionSteps((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  };

  const bumpImageCache = useCallback((cacheKey: string) => {
    setImageCacheVersion((prev) => ({ ...prev, [cacheKey]: Date.now() }));
  }, []);

  const getImageUrl = useCallback(
    (path: string, cacheKey?: string) => {
      const base = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
      const version = cacheKey ? imageCacheVersion[cacheKey] : undefined;
      return withImageCacheBust(base, version);
    },
    [imageCacheVersion],
  );

  const setChainImage = async (input: { chainId: string; file: File }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `chains/${chain.id}.${ext}`,
      previousPath: chain.image_path,
    });

    await supabase
      .from("puzzle_chains")
      .update({ image_path: objectPath })
      .eq("id", chain.id);

    setChains((prev) =>
      prev.map((c) => (c.id === chain.id ? { ...c, image_path: objectPath } : c)),
    );
    bumpImageCache(`chain-image:${chain.id}`);
  };

  const setRegionImage = async (input: { regionId: string; file: File }) => {
    const region = regions.find((r) => r.id === input.regionId) || null;
    if (!region) return;

    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `regions/${region.id}.${ext}`,
      previousPath: region.image_path,
    });

    await supabase
      .from("regions")
      .update({ image_path: objectPath })
      .eq("id", region.id);

    setRegions((prev) =>
      prev.map((r) => (r.id === region.id ? { ...r, image_path: objectPath } : r)),
    );
    bumpImageCache(`region-image:${region.id}`);
  };

  const removeRegionImage = async (input: { regionId: string }) => {
    const region = regions.find((r) => r.id === input.regionId) || null;
    if (!region) return;

    if (region.image_path) {
      await removeStorageImage(supabase, region.image_path);
    }

    await supabase.from("regions").update({ image_path: null }).eq("id", region.id);

    setRegions((prev) =>
      prev.map((r) => (r.id === region.id ? { ...r, image_path: null } : r)),
    );
    bumpImageCache(`region-image:${region.id}`);
  };

  const removeChainImage = async (input: { chainId: string }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    if (chain.image_path) {
      await removeStorageImage(supabase, chain.image_path);
    }

    await supabase.from("puzzle_chains").update({ image_path: null }).eq("id", chain.id);

    setChains((prev) =>
      prev.map((c) => (c.id === chain.id ? { ...c, image_path: null } : c)),
    );
    bumpImageCache(`chain-image:${chain.id}`);
  };

  const setStepImage = async (input: {
    stepId: string;
    file: File;
  }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `steps/${step.id}.${ext}`,
      previousPath: step.image_path,
    });

    await updateStep({ ...step, image_path: objectPath });
    bumpImageCache(`step-image:${step.id}`);
  };

  const removeStepImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    if (step.image_path) {
      await removeStorageImage(supabase, step.image_path);
    }
    await updateStep({ ...step, image_path: null });
    bumpImageCache(`step-image:${step.id}`);
  };

  const cameraOverlayConfigFromStep = (step: PuzzleStep): CameraOverlayConfig => {
    const raw = step.config;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj.subtype === "camera_overlay") {
        return {
          subtype: "camera_overlay",
          overlayImagePath:
            typeof obj.overlayImagePath === "string" ? obj.overlayImagePath : "",
          referenceImagePath:
            typeof obj.referenceImagePath === "string" ? obj.referenceImagePath : undefined,
          overlayOpacity:
            typeof obj.overlayOpacity === "number" ? obj.overlayOpacity : 0.5,
          answerInputMode: obj.answerInputMode === "number" ? "number" : "text",
        };
      }
    }
    return {
      subtype: "camera_overlay",
      overlayImagePath: "",
      overlayOpacity: 0.5,
    };
  };

  const setStepOverlayImage = async (input: { stepId: string; file: File }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = cameraOverlayConfigFromStep(step);
    const ext = fileExtensionFromName(input.file.name, "png");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `overlays/${step.id}.${ext}`,
      previousPath: prevConfig.overlayImagePath || null,
    });

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      overlayImagePath: objectPath,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-overlay:${step.id}`);
  };

  const removeStepOverlayImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = cameraOverlayConfigFromStep(step);
    if (prevConfig.overlayImagePath) {
      await removeStorageImage(supabase, prevConfig.overlayImagePath);
    }

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      overlayImagePath: "",
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-overlay:${step.id}`);
  };

  const setStepHintImage = async (input: { stepId: string; file: File }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const existing = parseStepHint(step.hints);
    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `hints/${step.id}.${ext}`,
      previousPath: existing?.image ?? null,
    });

    const nextHints = serializeStepHint({
      text: existing?.text ?? "",
      delaySeconds: existing?.delaySeconds ?? 30,
      imagePath: objectPath,
    });
    await updateStep({ ...step, hints: nextHints });
    bumpImageCache(`step-hint:${step.id}`);
  };

  const removeStepHintImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const existing = parseStepHint(step.hints);
    if (!existing?.image) return;

    await removeStorageImage(supabase, existing.image);

    const nextHints = serializeStepHint({
      text: existing.text,
      delaySeconds: existing.delaySeconds,
      imagePath: null,
    });
    await updateStep({ ...step, hints: nextHints });
    bumpImageCache(`step-hint:${step.id}`);
  };

  const setStepOverlayReferenceImage = async (input: { stepId: string; file: File }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = cameraOverlayConfigFromStep(step);
    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `overlays/${step.id}-reference.${ext}`,
      previousPath: prevConfig.referenceImagePath ?? null,
    });

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      referenceImagePath: objectPath,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-overlay-ref:${step.id}`);
  };

  const removeStepOverlayReferenceImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = cameraOverlayConfigFromStep(step);
    if (prevConfig.referenceImagePath) {
      await removeStorageImage(supabase, prevConfig.referenceImagePath);
    }

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      referenceImagePath: undefined,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-overlay-ref:${step.id}`);
  };

  const jigsawConfigFromStep = (step: PuzzleStep): JigsawConfig => {
    const raw = step.config;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj.subtype === "jigsaw") {
        return {
          subtype: "jigsaw",
          imagePath: typeof obj.imagePath === "string" ? obj.imagePath : "",
          gridSize:
            typeof obj.gridSize === "number" && obj.gridSize >= 2 && obj.gridSize <= 6
              ? obj.gridSize
              : 3,
        };
      }
    }
    return {
      subtype: "jigsaw",
      imagePath: "",
      gridSize: 3,
    };
  };

  const setStepJigsawImage = async (input: { stepId: string; file: File }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = jigsawConfigFromStep(step);
    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `jigsaw/${step.id}.${ext}`,
      previousPath: prevConfig.imagePath || null,
    });

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      imagePath: objectPath,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-jigsaw:${step.id}`);
  };

  const removeStepJigsawImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = jigsawConfigFromStep(step);
    if (prevConfig.imagePath) {
      await removeStorageImage(supabase, prevConfig.imagePath);
    }

    const nextConfig: InteractiveConfig = {
      ...prevConfig,
      imagePath: "",
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-jigsaw:${step.id}`);
  };

  const symbolCodexConfigFromStep = (step: PuzzleStep): SymbolCodexConfig => {
    const raw = step.config;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj.subtype === "symbol_codex") {
        const symbols = Array.isArray(obj.symbols)
          ? obj.symbols.filter((x): x is string => typeof x === "string")
          : [];
        const slotCount =
          typeof obj.slotCount === "number" && obj.slotCount >= 1
            ? obj.slotCount
            : 3;
        const answerArray = Array.isArray(obj.answerArray)
          ? obj.answerArray.filter((x): x is number => typeof x === "number")
          : [];
        return {
          subtype: "symbol_codex",
          symbols,
          slotCount,
          answerArray,
        };
      }
    }
    return {
      subtype: "symbol_codex",
      symbols: [],
      slotCount: 3,
      answerArray: [],
    };
  };

  const uploadSymbolImages = async (input: {
    stepId: string;
    files: File[];
  }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step || input.files.length === 0) return;

    const prevConfig = symbolCodexConfigFromStep(step);
    const nextSymbols = [...prevConfig.symbols];

    for (const file of input.files) {
      const ext =
        file.name && file.name.includes(".")
          ? file.name.split(".").pop()
          : "png";
      const objectPath = `symbols/${step.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(objectPath, file, { upsert: false });
      if (uploadError) throw new Error(formatSupabaseError(uploadError));

      nextSymbols.push(objectPath);
    }

    const nextConfig: SymbolCodexConfig = {
      ...prevConfig,
      symbols: nextSymbols,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-symbols:${step.id}`);
  };

  const removeSymbolImage = async (input: {
    stepId: string;
    symbolIndex: number;
  }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const prevConfig = symbolCodexConfigFromStep(step);
    const i = input.symbolIndex;
    if (i < 0 || i >= prevConfig.symbols.length) return;

    const removedPath = prevConfig.symbols[i];
    if (removedPath) {
      await supabase.storage.from("images").remove([removedPath]);
    }

    const nextSymbols = prevConfig.symbols.filter((_, idx) => idx !== i);
    const nextAnswerArray =
      nextSymbols.length === 0
        ? prevConfig.answerArray.map(() => 0)
        : prevConfig.answerArray.map((idx) => {
            if (idx < i) return idx;
            if (idx > i) return idx - 1;
            return Math.min(i, nextSymbols.length - 1);
          });

    const nextConfig: SymbolCodexConfig = {
      ...prevConfig,
      symbols: nextSymbols,
      answerArray: nextAnswerArray,
    };
    await updateStep({ ...step, config: nextConfig });
    bumpImageCache(`step-symbols:${step.id}`);
  };

  const reorderSteps = async (orderedStepIds: string[]) => {
    // Update order_index to match the new array order.
    const nextSteps = orderedStepIds
      .map((id, idx) => ({ id, order_index: idx }))
      .filter((x) => x.id);

    await Promise.all(
      nextSteps.map(({ id, order_index }) =>
        supabase.from("puzzle_steps").update({ order_index }).eq("id", id),
      ),
    );

    setSteps((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s] as const));
      return orderedStepIds
        .map((id, idx) => {
          const s = byId.get(id);
          return s ? ({ ...s, order_index: idx } as PuzzleStep) : null;
        })
        .filter((s): s is PuzzleStep => s !== null);
    });
  };

  const deleteStep = async (stepId: string) => {
    const step = steps.find((s) => s.id === stepId) || null;
    if (!step) return;
    if (step.type === "info" && step.order_index === 0) {
      throw new Error("The first info step is pinned and cannot be deleted.");
    }

    const remainingForChain = steps
      .filter((s) => s.chain_id === step.chain_id && s.id !== stepId)
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    const orderedRemainingIds = remainingForChain.map((s) => s.id);

    const { error } = await supabase.from("puzzle_steps").delete().eq("id", stepId);
    if (error) throw new Error(formatSupabaseError(error));

    // Renumber remaining steps for the chain.
    await Promise.all(
      orderedRemainingIds.map((id, order_index) =>
        supabase.from("puzzle_steps").update({ order_index }).eq("id", id),
      ),
    );

    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      const byId = new Map(filtered.map((s) => [s.id, s] as const));
      const updated = orderedRemainingIds.map((id, idx) => {
        const s = byId.get(id);
        return s ? ({ ...s, order_index: idx } as PuzzleStep) : null;
      });
      const untouched = filtered.filter((s) => s.chain_id !== step.chain_id);
      return [...untouched, ...updated.filter((x): x is PuzzleStep => x !== null)].sort(
        (a, b) => a.order_index - b.order_index,
      );
    });

    setRegionSteps((prev) => prev.filter((s) => s.id !== stepId));

    setSelectedStepId((prev) => (prev === stepId ? null : prev));
  };

  const applySelectCountry = (countryId: string) => {
    setPlacement(null);
    setSelectedCountryId(countryId);
    setSelectedRegionId(null);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSelectedTrailId(null);
    setSteps([]);
    setRegionSteps([]);
    setTreasures([]);
    setTrailStops([]);
    setMapFocusToken((n) => n + 1);
  };

  const applySelectRegion = (regionId: string) => {
    setPlacement(null);
    setSelectedRegionId(regionId);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSelectedTrailId(null);
    setSteps([]);
  };

  const applyBackToRoot = () => {
    setPlacement(null);
    setSelectedCountryId(null);
    setSelectedRegionId(null);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSelectedTrailId(null);
    setSteps([]);
    setRegionSteps([]);
    setTreasures([]);
    setTrailStops([]);
  };

  const applyBackToCountry = () => {
    setPlacement(null);
    setSelectedRegionId(null);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSelectedTrailId(null);
    setSteps([]);
    setRegionSteps([]);
    setTreasures([]);
    setTrailStops([]);
  };

  const applyBackOneLevel = () => {
    setPlacement(null);
    if (selectedChainId) {
      setSelectedChainId(null);
      setSelectedStepId(null);
      setSelectedTreasureId(null);
      setSteps([]);
      return;
    }
    if (selectedTrailId) {
      setSelectedTrailId(null);
      return;
    }
    if (selectedRegionId) {
      applyBackToCountry();
      return;
    }
    if (selectedCountryId) applyBackToRoot();
  };

  const applyNav = (nav: NonNullable<typeof pendingNav>) => {
    if (nav.type === "backToRoot") return applyBackToRoot();
    if (nav.type === "backOneLevel") return applyBackOneLevel();
    if (nav.type === "selectCountry") return applySelectCountry(nav.countryId);
    if (nav.type === "selectRegion") return applySelectRegion(nav.regionId);
    if (nav.type === "selectChain") {
      setSelectedStepId(null);
      setSelectedTreasureId(null);
      setSelectedTrailId(null);
      setSelectedChainId(nav.chainId);
    }
    if (nav.type === "selectTrail") {
      setSelectedChainId(null);
      setSelectedStepId(null);
      setSelectedTreasureId(null);
      setSteps([]);
      setSelectedTrailId(nav.trailId);
    }
  };

  const maybeNavigate = (nav: NonNullable<typeof pendingNav>) => {
    if (!isStepOrderDirty) {
      applyNav(nav);
      return;
    }
    setPendingNav(nav);
  };

  const closeNavDialog = () => setPendingNav(null);

  const discardDraftAndProceed = () => {
    setStepOrderDraft((prev) => (prev ? { ...prev, isDirty: false } : prev));
    if (!pendingNav) return;
    const nav = pendingNav;
    setPendingNav(null);
    applyNav(nav);
  };

  const saveDraftAndProceed = async () => {
    if (!stepOrderDraft || !canSaveDraft) return;
    await reorderSteps(stepOrderDraft.orderedStepIds);
    setStepOrderDraft((prev) => (prev ? { ...prev, isDirty: false } : prev));
    if (!pendingNav) return;
    const nav = pendingNav;
    setPendingNav(null);
    applyNav(nav);
  };

  const handleStepsOrderDraftChange = useCallback(
    (draft: {
      chainId: string;
      orderedStepIds: string[];
      isDirty: boolean;
    }) => {
      setStepOrderDraft(draft);
    },
    [],
  );

  useEffect(() => {
    if (!placement) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacement(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placement]);

  useEffect(() => {
    if (!selectedChainId) {
      queueMicrotask(() => setMobileLowerTab(0));
    }
  }, [selectedChainId]);

  useEffect(() => {
    if (!isMobile) {
      queueMicrotask(() => setKeyboardInsetPx(0));
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInsetPx(overlap > 72 ? overlap : 0);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isAdmin && desktopSidebarSection === "admin") {
      setDesktopSidebarSection("game");
    }
  }, [isAdmin, desktopSidebarSection]);

  useEffect(() => {
    if (mobileLowerTab > 1) setMobileLowerTab(0);
  }, [mobileLowerTab]);

  const signOut = () => {
    void supabase.auth.signOut().then(() => router.replace("/login"));
  };

  const toggleAdminMode = () => {
    setDesktopSidebarSection((prev) => (prev === "admin" ? "game" : "admin"));
  };

  const showAdminPanel = isAdmin && desktopSidebarSection === "admin";

  const defaultMapLat = 10.3157;
  const defaultMapLng = 123.8854;

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const createRegion = async (input: { name: string; slug?: string }) => {
    if (!isAdmin) {
      throw new Error("Only administrators can create new regions.");
    }
    if (!selectedCountryId) {
      throw new Error("Select a country before creating a region.");
    }
    const country = getCountryById(selectedCountryId);
    const latitude = country?.latitude ?? defaultMapLat;
    const longitude = country?.longitude ?? defaultMapLng;
    const slug = (input.slug?.trim() || slugify(input.name)) || "region";
    const { data, error } = await supabase
      .from("regions")
      .insert({
        name: input.name.trim(),
        slug,
        country: selectedCountryId,
        latitude,
        longitude,
        ready_to_publish: false,
      })
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const row = data as Region;
    setRegions((prev) =>
      [...prev, row].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const createChain = async (input: {
    title: string;
    regionId: string;
    latitude: number;
    longitude: number;
  }) => {
    const { data, error } = await supabase
      .from("puzzle_chains")
      .insert({
        title: input.title.trim(),
        region_id: input.regionId,
        latitude: input.latitude,
        longitude: input.longitude,
        ready_to_publish: false,
        optional: true,
        is_eatery: false,
      })
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const chain = data as PuzzleChain;
    setChains((prev) => [...prev, chain]);

    // Always create the pinned first step (info) for every chain.
    const { data: stepData, error: stepError } = await supabase
      .from("puzzle_steps")
      .insert({
        chain_id: chain.id,
        type: "info",
        order_index: 0,
        content: "",
        latitude: chain.latitude,
        longitude: chain.longitude,
        ready_to_publish: false,
      })
      .select()
      .single();

    if (stepError) {
      // Best-effort cleanup to avoid orphaned chains without an info step.
      await supabase.from("puzzle_chains").delete().eq("id", chain.id);
      setChains((prev) => prev.filter((c) => c.id !== chain.id));
      throw new Error(formatSupabaseError(stepError));
    }

    const row = stepData as PuzzleStep;
    setRegionSteps((prev) => [...prev, row]);
  };

  const setChainOptional = async (chainId: string, optional: boolean) => {
    const { error } = await supabase
      .from("puzzle_chains")
      .update({ optional })
      .eq("id", chainId);
    if (error) throw new Error(formatSupabaseError(error));
    setChains((prev) =>
      prev.map((c) => (c.id === chainId ? { ...c, optional } : c)),
    );
  };

  const setChainIsEatery = async (chainId: string, isEatery: boolean) => {
    const { error } = await supabase
      .from("puzzle_chains")
      .update({ is_eatery: isEatery })
      .eq("id", chainId);
    if (error) throw new Error(formatSupabaseError(error));
    setChains((prev) =>
      prev.map((c) => (c.id === chainId ? { ...c, is_eatery: isEatery } : c)),
    );
  };

  const updateTrailMetadata = async (
    trailId: string,
    metadata: {
      description: string;
      durationMinutes: string;
      distanceKm: string;
      transportMode: "" | "walk" | "scooter";
      isFree: boolean;
    },
  ) => {
    const durationRaw = metadata.durationMinutes.trim();
    const distanceRaw = metadata.distanceKm.trim();
    const duration_minutes =
      durationRaw === "" ? null : Math.max(0, parseInt(durationRaw, 10) || 0);
    const distance_km =
      distanceRaw === "" ? null : Math.max(0, Number(distanceRaw) || 0);
    const transport_mode =
      metadata.transportMode === "scooter" ? "scooter" : "walk";

    const { error } = await supabase
      .from("trails")
      .update({
        description: metadata.description.trim() || null,
        duration_minutes,
        distance_km,
        transport_mode,
        is_free: metadata.isFree,
      })
      .eq("id", trailId);
    if (error) throw new Error(formatSupabaseError(error));

    setTrails((prev) =>
      prev.map((t) =>
        t.id === trailId
          ? {
              ...t,
              description: metadata.description.trim() || null,
              duration_minutes,
              distance_km,
              transport_mode,
              is_free: metadata.isFree,
            }
          : t,
      ),
    );
  };

  const createTrail = async (input: { title: string; regionId: string }) => {
    const title = input.title.trim();
    if (!title) throw new Error("Title is required.");
    const { data, error } = await supabase
      .from("trails")
      .insert({
        title,
        region_id: input.regionId,
        transport_mode: "walk",
        is_free: true,
        ready_to_publish: false,
      })
      .select("*")
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const trail = data as Trail;
    setTrails((prev) => [...prev, trail]);
    setSelectedTrailId(trail.id);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSteps([]);
  };

  const renameTrail = async (trailId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Title is required.");
    const { error } = await supabase
      .from("trails")
      .update({ title: trimmed })
      .eq("id", trailId);
    if (error) throw new Error(formatSupabaseError(error));
    setTrails((prev) =>
      prev.map((t) => (t.id === trailId ? { ...t, title: trimmed } : t)),
    );
  };

  const setTrailReadyToPublish = async (trailId: string, ready: boolean) => {
    const { error } = await supabase
      .from("trails")
      .update({ ready_to_publish: ready })
      .eq("id", trailId);
    if (error) throw new Error(formatSupabaseError(error));
    setTrails((prev) =>
      prev.map((t) =>
        t.id === trailId ? { ...t, ready_to_publish: ready } : t,
      ),
    );
  };

  const setTrailImage = async (input: { trailId: string; file: File }) => {
    const trail = trails.find((t) => t.id === input.trailId) || null;
    if (!trail) return;
    const ext = fileExtensionFromName(input.file.name, "jpg");
    const objectPath = await uploadStorageImage(supabase, {
      file: input.file,
      objectPath: `trails/${trail.id}.${ext}`,
      previousPath: trail.image_path,
    });
    const { error } = await supabase
      .from("trails")
      .update({ image_path: objectPath })
      .eq("id", trail.id);
    if (error) throw new Error(formatSupabaseError(error));
    setTrails((prev) =>
      prev.map((t) => (t.id === trail.id ? { ...t, image_path: objectPath } : t)),
    );
    bumpImageCache(`trail-image:${trail.id}`);
  };

  const removeTrailImage = async (input: { trailId: string }) => {
    const trail = trails.find((t) => t.id === input.trailId) || null;
    if (!trail) return;
    if (trail.image_path) {
      await removeStorageImage(supabase, trail.image_path);
    }
    await supabase.from("trails").update({ image_path: null }).eq("id", trail.id);
    setTrails((prev) =>
      prev.map((t) => (t.id === trail.id ? { ...t, image_path: null } : t)),
    );
    bumpImageCache(`trail-image:${trail.id}`);
  };

  const deleteTrail = async (trailId: string) => {
    const trail = trails.find((t) => t.id === trailId) || null;
    if (!trail) return;
    if (trail.image_path) {
      await supabase.storage.from("images").remove([trail.image_path]);
    }
    const { error } = await supabase.from("trails").delete().eq("id", trailId);
    if (error) throw new Error(formatSupabaseError(error));
    setTrails((prev) => prev.filter((t) => t.id !== trailId));
    setTrailStops((prev) => prev.filter((s) => s.trail_id !== trailId));
    setSelectedTrailId((prev) => (prev === trailId ? null : prev));
  };

  const addTrailStop = async (input: { trailId: string; chainId: string }) => {
    const existing = trailStops.filter((s) => s.trail_id === input.trailId);
    const maxOrder = existing.reduce((m, s) => Math.max(m, s.order_index), -1);
    const { data, error } = await supabase
      .from("trail_stops")
      .insert({
        trail_id: input.trailId,
        chain_id: input.chainId,
        order_index: maxOrder + 1,
      })
      .select("*")
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    setTrailStops((prev) => [...prev, data as TrailStop]);
  };

  const removeTrailStop = async (stopId: string) => {
    const stop = trailStops.find((s) => s.id === stopId) || null;
    if (!stop) return;
    const remaining = trailStops
      .filter((s) => s.trail_id === stop.trail_id && s.id !== stopId)
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    const { error } = await supabase.from("trail_stops").delete().eq("id", stopId);
    if (error) throw new Error(formatSupabaseError(error));

    await Promise.all(
      remaining.map((s, order_index) =>
        supabase.from("trail_stops").update({ order_index }).eq("id", s.id),
      ),
    );

    setTrailStops((prev) => {
      const filtered = prev.filter((s) => s.id !== stopId);
      const byId = new Map(filtered.map((s) => [s.id, s] as const));
      const renumbered = remaining.map((s, idx) => {
        const row = byId.get(s.id);
        return row ? ({ ...row, order_index: idx } as TrailStop) : null;
      });
      const other = filtered.filter((s) => s.trail_id !== stop.trail_id);
      return [
        ...other,
        ...renumbered.filter((x): x is TrailStop => x !== null),
      ];
    });
  };

  const reorderTrailStops = async (orderedStopIds: string[]) => {
    if (!selectedTrailId) return;
    await Promise.all(
      orderedStopIds.map((id, order_index) =>
        supabase.from("trail_stops").update({ order_index }).eq("id", id),
      ),
    );
    setTrailStops((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s] as const));
      const updated = orderedStopIds.map((id, idx) => {
        const s = byId.get(id);
        return s ? ({ ...s, order_index: idx } as TrailStop) : null;
      });
      const other = prev.filter((s) => s.trail_id !== selectedTrailId);
      return [
        ...other,
        ...updated.filter((x): x is TrailStop => x !== null),
      ];
    });
  };

  const renameRegion = async (regionId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required.");
    const { error } = await supabase
      .from("regions")
      .update({ name: trimmed })
      .eq("id", regionId);
    if (error) throw new Error(formatSupabaseError(error));
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, name: trimmed } : r)),
    );
  };

  const renameChain = async (chainId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Title is required.");
    const { error } = await supabase
      .from("puzzle_chains")
      .update({ title: trimmed })
      .eq("id", chainId);
    if (error) throw new Error(formatSupabaseError(error));
    setChains((prev) =>
      prev.map((c) => (c.id === chainId ? { ...c, title: trimmed } : c)),
    );
  };

  const setRegionReadyToPublish = async (regionId: string, ready: boolean) => {
    const { error } = await supabase
      .from("regions")
      .update({ ready_to_publish: ready })
      .eq("id", regionId);
    if (error) throw new Error(formatSupabaseError(error));
    setRegions((prev) =>
      prev.map((r) =>
        r.id === regionId ? { ...r, ready_to_publish: ready } : r,
      ),
    );
  };

  const setChainReadyToPublish = async (chainId: string, ready: boolean) => {
    const { error } = await supabase
      .from("puzzle_chains")
      .update({ ready_to_publish: ready })
      .eq("id", chainId);
    if (error) throw new Error(formatSupabaseError(error));
    setChains((prev) =>
      prev.map((c) =>
        c.id === chainId ? { ...c, ready_to_publish: ready } : c,
      ),
    );

    // Location is master: going live also marks all existing steps live.
    if (ready) {
      const { error: stepsError } = await supabase
        .from("puzzle_steps")
        .update({ ready_to_publish: true })
        .eq("chain_id", chainId);
      if (stepsError) throw new Error(formatSupabaseError(stepsError));

      const markLive = (prev: PuzzleStep[]) =>
        prev.map((s) =>
          s.chain_id === chainId ? { ...s, ready_to_publish: true } : s,
        );
      setSteps(markLive);
      setRegionSteps(markLive);
      const cached = stepsCacheRef.current[chainId];
      if (cached) {
        stepsCacheRef.current[chainId] = cached.map((s) => ({
          ...s,
          ready_to_publish: true,
        }));
      }
    }
  };

  const setStepReadyToPublish = async (stepId: string, ready: boolean) => {
    const { error } = await supabase
      .from("puzzle_steps")
      .update({ ready_to_publish: ready })
      .eq("id", stepId);
    if (error) throw new Error(formatSupabaseError(error));
    const patch = (prev: PuzzleStep[]) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, ready_to_publish: ready } : s,
      );
    setSteps(patch);
    setRegionSteps(patch);
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      const cached = stepsCacheRef.current[step.chain_id];
      if (cached) {
        stepsCacheRef.current[step.chain_id] = cached.map((s) =>
          s.id === stepId ? { ...s, ready_to_publish: ready } : s,
        );
      }
    }
  };

  const deleteChain = async (chainId: string) => {
    const chain = chains.find((c) => c.id === chainId) || null;
    if (!chain) return;

    if (chain.image_path) {
      await supabase.storage.from("images").remove([chain.image_path]);
    }

    const { error } = await supabase
      .from("puzzle_chains")
      .delete()
      .eq("id", chainId);
    if (error) throw new Error(formatSupabaseError(error));

    delete stepsCacheRef.current[chainId];

    setChains((prev) => prev.filter((c) => c.id !== chainId));
    setRegionSteps((prev) => prev.filter((s) => s.chain_id !== chainId));
    setTrailStops((prev) => prev.filter((s) => s.chain_id !== chainId));
    setStepOrderDraft((prev) => (prev?.chainId === chainId ? null : prev));
    setPlacement((p) => {
      if (!p) return p;
      if (p.kind === "step") {
        const step = steps.find((s) => s.id === p.stepId);
        if (step?.chain_id === chainId) return null;
      }
      return p;
    });
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSteps([]);
    setStepsLoadedForChainId(null);
  };

  const createStep = async (input: { chainId: string }) => {
    const maxOrder = steps.reduce((m, s) => Math.max(m, s.order_index), -1);
    const order_index = maxOrder + 1;
    const { data, error } = await supabase
      .from("puzzle_steps")
      .insert({
        chain_id: input.chainId,
        type: "text",
        order_index,
        content: "",
        ready_to_publish: false,
      })
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const row = data as PuzzleStep;
    setSteps((prev) =>
      [...prev, row].sort((a, b) => a.order_index - b.order_index),
    );
    setRegionSteps((prev) => [...prev, row]);
  };

  const createTreasure = async (input: {
    regionId: string;
    latitude: number;
    longitude: number;
  }) => {
    const { data, error } = await supabase
      .from("treasures")
      .insert({
        region_id: input.regionId,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const row = data as Treasure;
    setTreasures((prev) => [...prev, row]);
  };

  const completePlacement = async (lat: number, lng: number) => {
    if (!placement) return;
    if (placement.kind === "step") {
      await moveStep(placement.stepId, lat, lng);
      setPlacement(null);
      return;
    }
    if (placement.kind === "newChain") {
      setNewChainDraft((prev) => ({
        ...prev,
        lat: String(lat),
        lng: String(lng),
      }));
      setPlacement(null);
      return;
    }
    if (placement.kind === "newTreasure") {
      setNewTreasureDraft((prev) => ({
        ...prev,
        lat: String(lat),
        lng: String(lng),
      }));
      setPlacement(null);
      return;
    }
    if (placement.kind === "treasure") {
      await moveTreasure(placement.treasureId, lat, lng);
      setPlacement(null);
    }
  };

  const parseDraftLatLng = (draft: { lat: string; lng: string }): [number, number] | null => {
    const lat = Number(draft.lat.trim());
    const lng = Number(draft.lng.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  };

  const newChainDraftLatLng = useMemo(() => parseDraftLatLng(newChainDraft), [newChainDraft]);
  const newTreasureDraftLatLng = useMemo(
    () => parseDraftLatLng(newTreasureDraft),
    [newTreasureDraft],
  );

  const onSelectStepFromUi = useCallback(
    (id: string) => {
      setSelectedTreasureId(null);
      setSelectedTrailId(null);
      setSelectedStepId(id);
      if (isMobile) setMobileLowerTab(1);
    },
    [isMobile],
  );

  const onSelectTreasureFromUi = useCallback(
    (id: string) => {
      setSelectedStepId(null);
      setSelectedChainId(null);
      setSelectedTrailId(null);
      setSteps([]);
      setSelectedTreasureId(id);
      if (isMobile) setMobileLowerTab(1);
    },
    [isMobile],
  );

  const mapInvalidateSizeKey = mobileLowerTab * 50_000 + Math.floor(keyboardInsetPx);

  const handleAdminSaveRole = async (
    userId: string,
    role: "player" | "editor" | "admin",
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) throw new Error(formatSupabaseError(error));
    await reloadAdminData();
  };

  const handleAdminSaveRegions = async (
    userId: string,
    regionIds: string[],
  ) => {
    const { error: delErr } = await supabase
      .from("editor_region_access")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw new Error(formatSupabaseError(delErr));
    if (regionIds.length > 0) {
      const { error: insErr } = await supabase
        .from("editor_region_access")
        .insert(
          regionIds.map((region_id) => ({ user_id: userId, region_id })),
        );
      if (insErr) throw new Error(formatSupabaseError(insErr));
    }
    await reloadAdminData();
  };

  const adminPanelEl =
    isAdmin && sessionUserId ? (
      <AdminAccessPanel
        profiles={adminProfiles}
        regions={regions}
        grants={adminGrants}
        currentUserId={sessionUserId}
        onSaveRole={handleAdminSaveRole}
        onSaveRegions={handleAdminSaveRegions}
      />
    ) : null;

  const renderSidebar = (fullWidth: boolean) => (
    <Sidebar
      countries={sidebarCountries}
      selectedCountryId={selectedCountryId}
      regions={visibleRegions}
      chains={visibleChains}
      steps={steps}
      treasures={treasures}
      trails={visibleTrails}
      trailStops={trailStops}
      selectedRegionId={selectedRegionId}
      selectedChainId={selectedChainId}
      selectedStepId={selectedStepId}
      selectedTreasureId={selectedTreasureId}
      selectedTrailId={selectedTrailId}
      onSetChainImage={setChainImage}
      onRemoveChainImage={removeChainImage}
      onSetRegionImage={setRegionImage}
      onRemoveRegionImage={removeRegionImage}
      onSetTrailImage={setTrailImage}
      onRemoveTrailImage={removeTrailImage}
      getImageUrl={getImageUrl}
      onZoomStepSpotlight={(lat, lng) => {
        setStepSpotlightCenter([lat, lng]);
        setStepSpotlightToken((n) => n + 1);
      }}
      onHoverChange={setMapHover}
      onBack={() => maybeNavigate({ type: "backOneLevel" })}
      onSelectCountry={(countryId) =>
        maybeNavigate({ type: "selectCountry", countryId })
      }
      onSelectRegion={(regionId) => maybeNavigate({ type: "selectRegion", regionId })}
      onSelectChain={(chainId) => maybeNavigate({ type: "selectChain", chainId })}
      onSelectTrail={(trailId) => maybeNavigate({ type: "selectTrail", trailId })}
      onSelectStep={onSelectStepFromUi}
      onSelectTreasure={onSelectTreasureFromUi}
      onReorderSteps={reorderSteps}
      onStepsOrderDraftChange={handleStepsOrderDraftChange}
      onCreateRegion={createRegion}
      onCreateChain={createChain}
      onCreateTrail={createTrail}
      onSetRegionReadyToPublish={setRegionReadyToPublish}
      onSetChainReadyToPublish={setChainReadyToPublish}
      onSetTrailReadyToPublish={setTrailReadyToPublish}
      onSetStepReadyToPublish={setStepReadyToPublish}
      onCreateStep={createStep}
      onZoomToRegion={() => setMapFocusToken((n) => n + 1)}
      onZoomToChain={() => setMapFocusToken((n) => n + 1)}
      onZoomToTrail={() => setMapFocusToken((n) => n + 1)}
      newChainDraft={newChainDraft}
      onNewChainDraftChange={setNewChainDraft}
      newChainPlacementActive={newChainPlacementActive}
      newTreasureDraft={newTreasureDraft}
      onNewTreasureDraftChange={setNewTreasureDraft}
      newTreasurePlacementActive={newTreasurePlacementActive}
      onStartNewTreasurePlacement={() => {
        if (!selectedRegionId) return;
        setPlacement({ kind: "newTreasure", regionId: selectedRegionId });
      }}
      onCancelNewTreasurePlacement={() => {
        setPlacement((p) => (p?.kind === "newTreasure" ? null : p));
      }}
      onCreateTreasure={createTreasure}
      onStartNewChainPlacement={() => {
        if (!selectedRegionId) return;
        setPlacement({ kind: "newChain", regionId: selectedRegionId });
      }}
      onCancelNewChainPlacement={() => {
        setPlacement((p) => (p?.kind === "newChain" ? null : p));
      }}
      canCreateRegions={isAdmin}
      canDeleteChains={accessOk}
      onDeleteChain={deleteChain}
      onDeleteTrail={deleteTrail}
      onRenameRegion={renameRegion}
      onRenameChain={renameChain}
      onRenameTrail={renameTrail}
      onSetChainOptional={setChainOptional}
      onSetChainIsEatery={setChainIsEatery}
      onUpdateTrailMetadata={updateTrailMetadata}
      onAddTrailStop={addTrailStop}
      onRemoveTrailStop={removeTrailStop}
      onReorderTrailStops={reorderTrailStops}
      fullWidth={fullWidth}
    />
  );

  const renderMapView = (enableUserLocation: boolean) => (
    <MapView
      countries={sidebarCountries}
      regions={visibleRegions}
      chains={visibleChains}
      steps={steps}
      regionSteps={regionSteps}
      treasures={treasures}
      trails={visibleTrails}
      trailStops={trailStops}
      focusToken={mapFocusToken}
      selectedCountryId={selectedCountryId}
      selectedRegionId={selectedRegionId}
      selectedChainId={selectedChainId}
      selectedTrailId={selectedTrailId}
      chainStepsReady={!!selectedChainId && stepsLoadedForChainId === selectedChainId}
      selectedStepId={selectedStepId}
      selectedTreasureId={selectedTreasureId}
      mapHover={mapHover}
      onHoverChange={setMapHover}
      placement={placement}
      onPlacementMapClick={completePlacement}
      onCancelPlacement={() => setPlacement(null)}
      onSelectCountry={(countryId) =>
        maybeNavigate({ type: "selectCountry", countryId })
      }
      onSelectRegion={(regionId) => maybeNavigate({ type: "selectRegion", regionId })}
      onSelectChain={(chainId) => maybeNavigate({ type: "selectChain", chainId })}
      onSelectTrail={(trailId) => maybeNavigate({ type: "selectTrail", trailId })}
      onSelectStep={onSelectStepFromUi}
      onSelectTreasure={onSelectTreasureFromUi}
      onMoveStep={moveStep}
      onMoveTreasure={moveTreasure}
      newChainDraftLatLng={newChainDraftLatLng}
      newTreasureDraftLatLng={newTreasureDraftLatLng}
      onSetNewChainDraftLatLng={(lat, lng) => {
        setNewChainDraft((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }));
      }}
      onSetNewTreasureDraftLatLng={(lat, lng) => {
        setNewTreasureDraft((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }));
      }}
      stepSpotlightToken={stepSpotlightToken}
      stepSpotlightCenter={stepSpotlightCenter}
      enableUserLocation={enableUserLocation}
      invalidateSizeKey={mapInvalidateSizeKey}
    />
  );

  const renderEditors = (compactMobile: boolean) =>
    selectedTreasureId ? (
      <SingleTreasureEditor
        treasure={treasures.find((x) => x.id === selectedTreasureId) || null}
        placementTreasureId={placementTreasureId}
        onStartPlacement={() => {
          if (selectedTreasureId) {
            setPlacement({ kind: "treasure", treasureId: selectedTreasureId });
          }
        }}
        onCancelPlacement={() => setPlacement(null)}
        onUpdate={async (next) => {
          await updateTreasure(next);
        }}
        onSetImage={setTreasureImage}
        onRemoveImage={removeTreasureImage}
        getImageUrl={getImageUrl}
        compactMobile={compactMobile}
      />
    ) : (
      <SingleStepEditor
        step={selectedStepId ? steps.find((s) => s.id === selectedStepId) || null : null}
        placementStepId={placementStepId}
        onStartPlacement={() => {
          if (selectedStepId) setPlacement({ kind: "step", stepId: selectedStepId });
        }}
        onCancelPlacement={() => setPlacement(null)}
        onUpdate={async (next) => {
          await updateStep(next);
        }}
        onDeleteStep={deleteStep}
        onSetImage={setStepImage}
        onRemoveImage={removeStepImage}
        onSetOverlayImage={setStepOverlayImage}
        onRemoveOverlayImage={removeStepOverlayImage}
        onSetOverlayReferenceImage={setStepOverlayReferenceImage}
        onRemoveOverlayReferenceImage={removeStepOverlayReferenceImage}
        onSetHintImage={setStepHintImage}
        onRemoveHintImage={removeStepHintImage}
        onSetJigsawImage={setStepJigsawImage}
        onRemoveJigsawImage={removeStepJigsawImage}
        onUploadSymbolImages={uploadSymbolImages}
        onRemoveSymbolImage={removeSymbolImage}
        getImageUrl={getImageUrl}
        compactMobile={compactMobile}
      />
    );

  const navDialog = (
    <Dialog open={!!pendingNav} onClose={closeNavDialog}>
      <DialogTitle>Unsaved step order</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          You have unsaved changes to the step order. Save before navigating away?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeNavDialog}>Cancel</Button>
        <Button onClick={discardDraftAndProceed} color="warning">
          Discard
        </Button>
        <Button
          onClick={saveDraftAndProceed}
          variant="contained"
          disabled={!canSaveDraft}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (access === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (access === "no_regions") {
    return (
      <Box sx={{ p: 4, maxWidth: 520 }}>
        <Typography variant="h6" gutterBottom>
          No regions assigned
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your editor account is not allowed to change any region yet. Ask an
          administrator to assign regions to your account in Admin.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            void supabase.auth
              .signOut()
              .then(() => router.replace("/login"));
          }}
        >
          Back to login
        </Button>
      </Box>
    );
  }

  if (access === "denied") {
    return (
      <Box sx={{ p: 4, maxWidth: 480 }}>
        <Typography variant="h6" gutterBottom>
          Access denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This dashboard is only available to editor or admin accounts. Ask an
          administrator to update your role in the database.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            void supabase.auth
              .signOut()
              .then(() => router.replace("/login"));
          }}
        >
          Back to login
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: { xs: "100dvh", sm: "100vh" },
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <AppBar
          position="static"
          color="default"
          elevation={0}
          sx={{
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 1, minHeight: 56 }}>
            <Typography
              variant="h6"
              sx={{ flex: 1, fontWeight: 700, fontSize: "1.05rem" }}
              noWrap
            >
              Puzzle Dashboard
            </Typography>
            {isAdmin ? (
              <Button
                size="small"
                variant={showAdminPanel ? "contained" : "outlined"}
                onClick={toggleAdminMode}
              >
                Admin
              </Button>
            ) : null}
            <Button size="small" variant="text" onClick={signOut}>
              Sign out
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {isMobile ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {!showAdminPanel ? (
                <Box
                  sx={{
                    flex: "0 0 42vh",
                    minHeight: 260,
                    maxHeight: "50vh",
                    p: 1,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Paper elevation={0} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                    {renderMapView(true)}
                  </Paper>
                </Box>
              ) : null}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  borderTop: showAdminPanel
                    ? undefined
                    : (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                {showAdminPanel ? (
                  <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1 }}>
                    {adminPanelEl}
                  </Box>
                ) : (
                  <>
                    <Tabs
                      value={mobileLowerTab}
                      onChange={(_, v) => setMobileLowerTab(v as number)}
                      variant="fullWidth"
                    >
                      <Tab label="List" />
                      <Tab label="Edit" />
                    </Tabs>
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "auto",
                        pb: `${keyboardInsetPx}px`,
                      }}
                    >
                      {mobileLowerTab === 0 ? (
                        renderSidebar(true)
                      ) : (
                        <>
                          {selectedStepId &&
                            !selectedTreasureId &&
                            orderedStepIdsForNav.length > 0 && (
                              <Toolbar
                                variant="dense"
                                sx={{
                                  gap: 1,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  borderBottom: (t) =>
                                    `1px solid ${t.palette.divider}`,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  aria-label="Previous step"
                                  disabled={stepNavIndex <= 0}
                                  onClick={() => {
                                    if (stepNavIndex <= 0) return;
                                    const prevId =
                                      orderedStepIdsForNav[stepNavIndex - 1];
                                    if (prevId) setSelectedStepId(prevId);
                                  }}
                                >
                                  <ChevronLeftIcon />
                                </IconButton>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ flex: 1, textAlign: "center" }}
                                >
                                  {stepNavIndex >= 0
                                    ? `Step ${stepNavIndex + 1} of ${orderedStepIdsForNav.length}`
                                    : "—"}
                                </Typography>
                                <IconButton
                                  size="small"
                                  aria-label="Next step"
                                  disabled={
                                    stepNavIndex < 0 ||
                                    stepNavIndex >=
                                      orderedStepIdsForNav.length - 1
                                  }
                                  onClick={() => {
                                    if (stepNavIndex < 0) return;
                                    if (
                                      stepNavIndex >=
                                      orderedStepIdsForNav.length - 1
                                    )
                                      return;
                                    const nextId =
                                      orderedStepIdsForNav[stepNavIndex + 1];
                                    if (nextId) setSelectedStepId(nextId);
                                  }}
                                >
                                  <ChevronRightIcon />
                                </IconButton>
                              </Toolbar>
                            )}
                          {renderEditors(true)}
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
              {showAdminPanel ? (
                <Box
                  sx={{
                    width: 360,
                    flexShrink: 0,
                    borderRight: (t) => `1px solid ${t.palette.divider}`,
                    overflow: "auto",
                  }}
                >
                  {adminPanelEl}
                </Box>
              ) : (
                renderSidebar(false)
              )}
              <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
                <Paper elevation={0} sx={{ height: "100%", overflow: "hidden" }}>
                  {renderMapView(false)}
                </Paper>
              </Box>
              {!showAdminPanel ? (
                <Box
                  sx={{
                    width: 380,
                    flexShrink: 0,
                    borderLeft: (t) => `1px solid ${t.palette.divider}`,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                    }}
                  >
                    {renderEditors(false)}
                  </Box>
                </Box>
              ) : null}
            </Box>
          )}
        </Box>
      </Box>
      {navDialog}
    </>
  );
}
