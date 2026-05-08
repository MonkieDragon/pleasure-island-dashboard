"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/supabaseError";
import type { PostgrestError } from "@supabase/supabase-js";

import { PuzzleChain, PuzzleStep, Region, Treasure } from "@/types/database";
import type { MapHover } from "@/types/mapUi";

import Sidebar from "./Sidebar";
import SingleStepEditor from "./SingleStepEditor";
import SingleTreasureEditor from "./SingleTreasureEditor";
import dynamic from "next/dynamic";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
});
console.log("DASHBOARD MODULE LOADED");
console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Dashboard() {
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
  const [stepsLoadedForChainId, setStepsLoadedForChainId] = useState<
    string | null
  >(null);

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

  // This is a client component; render the map immediately.

  // ----------------------------
  // LOAD REGIONS (once)
  // ----------------------------
  useEffect(() => {
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
  }, []);

  // ----------------------------
  // LOAD CHAINS (once)
  // ----------------------------
  useEffect(() => {
    supabase
      .from("puzzle_chains")
      .select("*")
      .then(({ data }) => setChains((data || []) as PuzzleChain[]));
  }, []);

  // ----------------------------
  // LOAD STEPS (when chain changes)
  // ----------------------------
  useEffect(() => {
    if (!selectedChainId) {
      queueMicrotask(() => {
        setSteps([]);
        setStepsLoadedForChainId(null);
      });
      return;
    }

    queueMicrotask(() => {
      setStepsLoadedForChainId(null);
    });

    // #region agent log
    fetch('http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'790358'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H2_reload_overwrites',location:'components/Dashboard.tsx:LOAD_STEPS',message:'Loading steps for chain',data:{selectedChainId},timestamp:Date.now()})}).catch(()=>{});
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H2_reload_overwrites',location:'components/Dashboard.tsx:LOAD_STEPS:relay',message:'Loading steps for chain (relay)',data:{selectedChainId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    supabase
      .from("puzzle_steps")
      .select("*")
      .eq("chain_id", selectedChainId)
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        // #region agent log
        fetch('http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'790358'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H2_reload_overwrites',location:'components/Dashboard.tsx:LOAD_STEPS_DONE',message:'Loaded steps count + first coords',data:{selectedChainId,count:(data||[]).length,first:(data||[])[0]?{id:(data||[])[0].id,order_index:(data||[])[0].order_index,type:(data||[])[0].type,lat:(data||[])[0].latitude,lng:(data||[])[0].longitude}:null},timestamp:Date.now()})}).catch(()=>{});
        fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H2_reload_overwrites',location:'components/Dashboard.tsx:LOAD_STEPS_DONE:relay',message:'Loaded steps count + first coords (relay)',data:{selectedChainId,count:(data||[]).length,first:(data||[])[0]?{id:(data||[])[0].id,order_index:(data||[])[0].order_index,type:(data||[])[0].type,lat:(data||[])[0].latitude,lng:(data||[])[0].longitude}:null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setSteps(data || []);
        setStepsLoadedForChainId(selectedChainId);
      });
  }, [selectedChainId]);

  // ----------------------------
  // LOAD REGION STEPS + TREASURES (when region changes)
  // ----------------------------
  useEffect(() => {
    const load = async () => {
      if (!selectedRegionId) {
        queueMicrotask(() => {
          setRegionSteps([]);
          setTreasures([]);
        });
        return;
      }

      const regionChainIds = chains
        .filter((c) => c.region_id === selectedRegionId)
        .map((c) => c.id);

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

      // Treasures are region-scoped.
      const { data: treasureData } = await supabase
        .from("treasures")
        .select("*")
        .eq("region_id", selectedRegionId);
      queueMicrotask(() => {
        setTreasures((treasureData || []) as Treasure[]);
      });
    };

    void load();
  }, [selectedRegionId, chains]);

  const moveStep = async (id: string, lat: number, lng: number) => {
    // #region agent log
    fetch('http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'790358'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H1_update_not_persisted',location:'components/Dashboard.tsx:moveStep:entry',message:'Attempt moveStep',data:{id,lat,lng},timestamp:Date.now()})}).catch(()=>{});
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H1_update_not_persisted',location:'components/Dashboard.tsx:moveStep:entry:relay',message:'Attempt moveStep (relay)',data:{id,lat,lng},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const { data: updatedRows, error } = await supabase
      .from("puzzle_steps")
      .update({ latitude: lat, longitude: lng })
      .eq("id", id)
      .select("id,latitude,longitude");

    const typedError = error as PostgrestError | null;
    const returnedFirst = Array.isArray(updatedRows) ? updatedRows[0] ?? null : null;

    // #region agent log
    fetch('http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'790358'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H1_update_not_persisted',location:'components/Dashboard.tsx:moveStep:supabase',message:'Supabase update result',data:{id,hasError:!!typedError,returnedCount:Array.isArray(updatedRows)?updatedRows.length:null,returnedFirst:returnedFirst?{id:returnedFirst.id,lat:returnedFirst.latitude,lng:returnedFirst.longitude}:null,errorMessage:typedError?.message??null,errorCode:typedError?.code??null},timestamp:Date.now()})}).catch(()=>{});
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'790358',runId:'pre-fix',hypothesisId:'H1_update_not_persisted',location:'components/Dashboard.tsx:moveStep:supabase:relay',message:'Supabase update result (relay)',data:{id,hasError:!!typedError,returnedCount:Array.isArray(updatedRows)?updatedRows.length:null,returnedFirst:returnedFirst?{id:returnedFirst.id,lat:returnedFirst.latitude,lng:returnedFirst.longitude}:null,errorMessage:typedError?.message??null,errorCode:typedError?.code??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
        image_url: updated.image_url,
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
    const objectPath = `treasures/${input.treasureId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("step-images")
      .upload(objectPath, input.file, { upsert: false });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));
    await updateTreasure({ ...t, image_url: objectPath });
  };

  const removeTreasureImage = async (input: { treasureId: string }) => {
    const t = treasures.find((x) => x.id === input.treasureId) || null;
    if (!t) return;
    if (t.image_url) {
      await supabase.storage.from("step-images").remove([t.image_url]);
    }
    await updateTreasure({ ...t, image_url: null });
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

  const getStepImageUrl = (path: string) => {
    return supabase.storage.from("step-images").getPublicUrl(path).data.publicUrl;
  };

  const setChainImage = async (input: { chainId: string; file: File }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    const ext =
      input.file.name && input.file.name.includes(".")
        ? input.file.name.split(".").pop()
        : "jpg";
    const objectPath = `${chain.id}/chain/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("step-images")
      .upload(objectPath, input.file, { upsert: false });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));

    await supabase.from("puzzle_chains").update({ image_url: objectPath }).eq("id", chain.id);

    setChains((prev) => prev.map((c) => (c.id === chain.id ? { ...c, image_url: objectPath } : c)));
  };

  const removeChainImage = async (input: { chainId: string }) => {
    const chain = chains.find((c) => c.id === input.chainId) || null;
    if (!chain) return;

    if (chain.image_url) {
      await supabase.storage.from("step-images").remove([chain.image_url]);
    }

    await supabase.from("puzzle_chains").update({ image_url: null }).eq("id", chain.id);

    setChains((prev) => prev.map((c) => (c.id === chain.id ? { ...c, image_url: null } : c)));
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
    const objectPath = `${step.chain_id}/${step.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("step-images")
      .upload(objectPath, input.file, { upsert: false });
    if (uploadError) throw new Error(formatSupabaseError(uploadError));

    await updateStep({ ...step, image_url: objectPath });
  };

  const removeStepImage = async (input: { stepId: string }) => {
    const step = steps.find((s) => s.id === input.stepId) || null;
    if (!step) return;

    if (step.image_url) {
      await supabase.storage.from("step-images").remove([step.image_url]);
    }
    await updateStep({ ...step, image_url: null });
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

  const defaultMapLat = 10.3157;
  const defaultMapLng = 123.8854;

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const createRegion = async (input: { name: string; slug?: string }) => {
    const slug = (input.slug?.trim() || slugify(input.name)) || "region";
    const { data, error } = await supabase
      .from("regions")
      .insert({
        name: input.name.trim(),
        slug,
        country: "philippines",
        latitude: defaultMapLat,
        longitude: defaultMapLng,
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

  const selectStep = (id: string) => {
    setSelectedTreasureId(null);
    setSelectedStepId(id);
  };

  const selectTreasure = (id: string) => {
    setSelectedStepId(null);
    setSelectedTreasureId(id);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar
        countryName={selectedCountry}
        regions={regions}
        chains={chains}
        steps={steps}
        treasures={treasures}
        selectedRegionId={selectedRegionId}
        selectedChainId={selectedChainId}
        selectedStepId={selectedStepId}
        selectedTreasureId={selectedTreasureId}
        placementStepId={placementStepId}
        onSetChainImage={setChainImage}
        onRemoveChainImage={removeChainImage}
        getImageUrl={getStepImageUrl}
        onStartStepPlacement={(stepId) => {
          setSelectedTreasureId(null);
          setSelectedStepId(stepId);
          setPlacement({ kind: "step", stepId });
        }}
        onHoverChange={setMapHover}
        onBack={() => maybeNavigate({ type: "backOneLevel" })}
        onSelectRegion={(regionId) =>
          maybeNavigate({ type: "selectRegion", regionId })
        }
        onSelectChain={(chainId) => maybeNavigate({ type: "selectChain", chainId })}
        onSelectStep={selectStep}
        onSelectTreasure={selectTreasure}
        onReorderSteps={reorderSteps}
        onStepsOrderDraftChange={handleStepsOrderDraftChange}
        onCreateRegion={createRegion}
        onCreateChain={createChain}
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
      />

      <Box sx={{ flex: 1, p: 2 }}>
        <Paper elevation={0} sx={{ height: "100%", overflow: "hidden" }}>
          <MapView
            regions={regions}
            chains={chains}
            steps={steps}
            regionSteps={regionSteps}
            treasures={treasures}
            focusToken={mapFocusToken}
            selectedRegionId={selectedRegionId}
            selectedChainId={selectedChainId}
            chainStepsReady={
              !!selectedChainId && stepsLoadedForChainId === selectedChainId
            }
            selectedStepId={selectedStepId}
            selectedTreasureId={selectedTreasureId}
            mapHover={mapHover}
            onHoverChange={setMapHover}
            placement={placement}
            onPlacementMapClick={completePlacement}
            onCancelPlacement={() => setPlacement(null)}
            onSelectRegion={(regionId) =>
              maybeNavigate({ type: "selectRegion", regionId })
            }
            onSelectChain={(chainId) =>
              maybeNavigate({ type: "selectChain", chainId })
            }
            onSelectStep={selectStep}
            onSelectTreasure={selectTreasure}
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
          />
        </Paper>
      </Box>

      <Box
        sx={{
          width: 380,
          borderLeft: (t) => `1px solid ${t.palette.divider}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {selectedTreasureId ? (
          <SingleTreasureEditor
            treasure={
              treasures.find((x) => x.id === selectedTreasureId) || null
            }
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
            getImageUrl={getStepImageUrl}
          />
        ) : (
          <SingleStepEditor
            step={
              selectedStepId
                ? steps.find((s) => s.id === selectedStepId) || null
                : null
            }
            placementStepId={placementStepId}
            onStartPlacement={() => {
              if (selectedStepId)
                setPlacement({ kind: "step", stepId: selectedStepId });
            }}
            onCancelPlacement={() => setPlacement(null)}
            onUpdate={async (next) => {
              await updateStep(next);
            }}
            onDeleteStep={deleteStep}
            onSetImage={setStepImage}
            onRemoveImage={removeStepImage}
            getImageUrl={getStepImageUrl}
          />
        )}
      </Box>

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
    </Box>
  );
}
