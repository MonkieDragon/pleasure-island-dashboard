"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/supabaseError";

import { PuzzleChain, PuzzleStep, Region, Treasure } from "@/types/database";
import type { MapHover } from "@/types/mapUi";

import Sidebar from "./Sidebar";
import SingleStepEditor from "./SingleStepEditor";
import SingleTreasureEditor from "./SingleTreasureEditor";
import AdminAccessPanel from "./AdminAccessPanel";
import dynamic from "next/dynamic";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
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

  const [selectedCountry] = useState<string>("Philippines");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(
    null,
  );

  const visibleRegions = useMemo(() => {
    if (!accessOk) return [];
    if (isAdmin || editorRegionIds === null) return regions;
    return regions.filter((r) => editorRegionIds.has(r.id));
  }, [accessOk, isAdmin, editorRegionIds, regions]);

  const visibleChains = useMemo(() => {
    if (!accessOk) return [];
    if (isAdmin || editorRegionIds === null) return chains;
    return chains.filter(
      (c) => c.region_id != null && editorRegionIds.has(c.region_id),
    );
  }, [accessOk, isAdmin, editorRegionIds, chains]);

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
      setSteps([]);
      setRegionSteps([]);
      setTreasures([]);
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
    | { type: "selectRegion"; regionId: string }
    | { type: "selectChain"; chainId: string }
  >(null);

  const [mapHover, setMapHover] = useState<MapHover | null>(null);
  const [placement, setPlacement] = useState<Placement>(null);
  const [mapFocusToken, setMapFocusToken] = useState(0);
  const [stepSpotlightToken, setStepSpotlightToken] = useState(0);
  const [stepSpotlightCenter, setStepSpotlightCenter] = useState<
    [number, number] | null
  >(null);
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
        const all = data || [];
        setRegions(
          all.filter(
            (r) => (r.country || "").toLowerCase() === "philippines",
          ) as Region[],
        );
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
  // LOAD REGION STEPS + TREASURES (when region or its chain id set changes)
  // ----------------------------
  useEffect(() => {
    if (!accessOk) return;
    const load = async () => {
      if (!selectedRegionId) {
        queueMicrotask(() => {
          setRegionSteps([]);
          setTreasures([]);
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
    };

    void load();
  }, [accessOk, selectedRegionId, regionChainIdsKey]);

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
    const ext =
      input.file.name && input.file.name.includes(".")
        ? input.file.name.split(".").pop()
        : "jpg";
    const objectPath = `treasures/${input.treasureId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(objectPath, input.file, { upsert: true });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));
    await updateTreasure({ ...t, image_path: objectPath });
  };

  const removeTreasureImage = async (input: { treasureId: string }) => {
    const t = treasures.find((x) => x.id === input.treasureId) || null;
    if (!t) return;
    if (t.image_path) {
      await supabase.storage.from("images").remove([t.image_path]);
    }
    await updateTreasure({ ...t, image_path: null });
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

  const getImageUrl = (path: string) => {
    return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
  };

  const setChainImage = async (input: { chainId: string; file: File }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    const ext =
      input.file.name && input.file.name.includes(".")
        ? input.file.name.split(".").pop()
        : "jpg";
    const objectPath = `chains/${chain.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(objectPath, input.file, { upsert: true });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));

    await supabase
      .from("puzzle_chains")
      .update({ image_path: objectPath })
      .eq("id", chain.id);

    setChains((prev) =>
      prev.map((c) => (c.id === chain.id ? { ...c, image_path: objectPath } : c)),
    );
  };

  const removeChainImage = async (input: { chainId: string }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    if (chain.image_path) {
      await supabase.storage.from("images").remove([chain.image_path]);
    }

    await supabase.from("puzzle_chains").update({ image_path: null }).eq("id", chain.id);

    setChains((prev) =>
      prev.map((c) => (c.id === chain.id ? { ...c, image_path: null } : c)),
    );
  };

  const setStepImage = async (input: {
    stepId: string;
    file: File;
  }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    const ext =
      input.file.name && input.file.name.includes(".")
        ? input.file.name.split(".").pop()
        : "jpg";
    const objectPath = `steps/${step.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(objectPath, input.file, { upsert: true });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));

    await updateStep({ ...step, image_path: objectPath });
  };

  const removeStepImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    if (step.image_path) {
      await supabase.storage.from("images").remove([step.image_path]);
    }
    await updateStep({ ...step, image_path: null });
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

  const applySelectRegion = (regionId: string) => {
    setPlacement(null);
    setSelectedRegionId(regionId);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSteps([]);
  };

  const applyBackToRoot = () => {
    setPlacement(null);
    setSelectedRegionId(null);
    setSelectedChainId(null);
    setSelectedStepId(null);
    setSelectedTreasureId(null);
    setSteps([]);
    setRegionSteps([]);
    setTreasures([]);
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
    if (selectedRegionId) applyBackToRoot();
  };

  const applyNav = (nav: NonNullable<typeof pendingNav>) => {
    if (nav.type === "backToRoot") return applyBackToRoot();
    if (nav.type === "backOneLevel") return applyBackOneLevel();
    if (nav.type === "selectRegion") return applySelectRegion(nav.regionId);
    if (nav.type === "selectChain") {
      setSelectedStepId(null);
      setSelectedTreasureId(null);
      setSelectedChainId(nav.chainId);
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
    if (!isAdmin && mobileLowerTab >= 2) {
      setMobileLowerTab(0);
    }
  }, [isAdmin, mobileLowerTab]);

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
    const slug = (input.slug?.trim() || slugify(input.name)) || "region";
    const { data, error } = await supabase
      .from("regions")
      .insert({
        name: input.name.trim(),
        slug,
        country: "philippines",
        latitude: defaultMapLat,
        longitude: defaultMapLng,
        ready_to_publish: false,
      })
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    const row = data as Region;
    if ((row.country || "").toLowerCase() === "philippines") {
      setRegions((prev) =>
        [...prev, row].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
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
      setSelectedStepId(id);
      if (isMobile) setMobileLowerTab(1);
    },
    [isMobile],
  );

  const onSelectTreasureFromUi = useCallback(
    (id: string) => {
      setSelectedStepId(null);
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
      countryName={selectedCountry}
      regions={visibleRegions}
      chains={visibleChains}
      steps={steps}
      treasures={treasures}
      selectedRegionId={selectedRegionId}
      selectedChainId={selectedChainId}
      selectedStepId={selectedStepId}
      selectedTreasureId={selectedTreasureId}
      onSetChainImage={setChainImage}
      onRemoveChainImage={removeChainImage}
      getImageUrl={getImageUrl}
      onZoomStepSpotlight={(lat, lng) => {
        setStepSpotlightCenter([lat, lng]);
        setStepSpotlightToken((n) => n + 1);
      }}
      onHoverChange={setMapHover}
      onBack={() => maybeNavigate({ type: "backOneLevel" })}
      onSelectRegion={(regionId) => maybeNavigate({ type: "selectRegion", regionId })}
      onSelectChain={(chainId) => maybeNavigate({ type: "selectChain", chainId })}
      onSelectStep={onSelectStepFromUi}
      onSelectTreasure={onSelectTreasureFromUi}
      onReorderSteps={reorderSteps}
      onStepsOrderDraftChange={handleStepsOrderDraftChange}
      onCreateRegion={createRegion}
      onCreateChain={createChain}
      onSetRegionReadyToPublish={setRegionReadyToPublish}
      onSetChainReadyToPublish={setChainReadyToPublish}
      onCreateStep={createStep}
      onZoomToRegion={() => setMapFocusToken((n) => n + 1)}
      onZoomToChain={() => setMapFocusToken((n) => n + 1)}
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
      sidebarSection={desktopSidebarSection}
      onSidebarSectionChange={setDesktopSidebarSection}
      adminContent={fullWidth ? undefined : adminPanelEl}
      onSignOut={() => {
        void supabase.auth.signOut().then(() => router.replace("/login"));
      }}
      fullWidth={fullWidth}
    />
  );

  const renderMapView = (enableUserLocation: boolean) => (
    <MapView
      regions={visibleRegions}
      chains={visibleChains}
      steps={steps}
      regionSteps={regionSteps}
      treasures={treasures}
      focusToken={mapFocusToken}
      selectedRegionId={selectedRegionId}
      selectedChainId={selectedChainId}
      chainStepsReady={!!selectedChainId && stepsLoadedForChainId === selectedChainId}
      selectedStepId={selectedStepId}
      selectedTreasureId={selectedTreasureId}
      mapHover={mapHover}
      onHoverChange={setMapHover}
      placement={placement}
      onPlacementMapClick={completePlacement}
      onCancelPlacement={() => setPlacement(null)}
      onSelectRegion={(regionId) => maybeNavigate({ type: "selectRegion", regionId })}
      onSelectChain={(chainId) => maybeNavigate({ type: "selectChain", chainId })}
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
      {isMobile ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: { xs: "100dvh", sm: "100vh" },
            minHeight: 0,
            overflow: "hidden",
          }}
        >
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
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderTop: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Tabs
              value={mobileLowerTab}
              onChange={(_, v) => {
                const n = v as number;
                if (!isAdmin && n >= 2) return;
                setMobileLowerTab(n);
              }}
              variant="fullWidth"
            >
              <Tab label="List" />
              <Tab label="Edit" />
              {isAdmin ? <Tab label="Admin" /> : null}
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
              ) : mobileLowerTab === 2 && isAdmin ? (
                adminPanelEl
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
                          borderBottom: (t) => `1px solid ${t.palette.divider}`,
                        }}
                      >
                        <IconButton
                          size="small"
                          aria-label="Previous step"
                          disabled={stepNavIndex <= 0}
                          onClick={() => {
                            if (stepNavIndex <= 0) return;
                            const prevId = orderedStepIdsForNav[stepNavIndex - 1];
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
                            stepNavIndex >= orderedStepIdsForNav.length - 1
                          }
                          onClick={() => {
                            if (stepNavIndex < 0) return;
                            if (stepNavIndex >= orderedStepIdsForNav.length - 1) return;
                            const nextId = orderedStepIdsForNav[stepNavIndex + 1];
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
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", height: "100vh", minHeight: 0 }}>
          {renderSidebar(false)}
          <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
            <Paper elevation={0} sx={{ height: "100%", overflow: "hidden" }}>
              {renderMapView(false)}
            </Paper>
          </Box>
          <Box
            sx={{
              width: 380,
              flexShrink: 0,
              borderLeft: (t) => `1px solid ${t.palette.divider}`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {renderEditors(false)}
          </Box>
        </Box>
      )}
      {navDialog}
    </>
  );
}
