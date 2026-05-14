"use client";

import { useMemo, useState } from "react";
import { formatSupabaseError } from "@/lib/supabaseError";
import type { Region } from "@/types/database";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export type AdminProfileRow = {
  id: string;
  role: string;
  email: string | null;
};

export type AdminGrantRow = {
  user_id: string;
  region_id: string;
};

type Props = {
  profiles: AdminProfileRow[];
  regions: Region[];
  grants: AdminGrantRow[];
  currentUserId: string;
  onSaveRole: (userId: string, role: "player" | "editor" | "admin") => Promise<void>;
  onSaveRegions: (userId: string, regionIds: string[]) => Promise<void>;
};

export default function AdminAccessPanel({
  profiles,
  regions,
  grants,
  currentUserId,
  onSaveRole,
  onSaveRegions,
}: Props) {
  const grantsByUser = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const g of grants) {
      if (!m.has(g.user_id)) m.set(g.user_id, new Set());
      m.get(g.user_id)!.add(g.region_id);
    }
    return m;
  }, [grants]);

  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [draftRegions, setDraftRegions] = useState<Record<string, Set<string>>>(
    {},
  );
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleFor = (p: AdminProfileRow) =>
    draftRoles[p.id] !== undefined ? draftRoles[p.id] : p.role;

  const regionsFor = (userId: string) => {
    if (draftRegions[userId]) return draftRegions[userId]!;
    return new Set(grantsByUser.get(userId) ?? []);
  };

  const toggleRegion = (userId: string, regionId: string) => {
    setDraftRegions((prev) => {
      const cur = new Set(prev[userId] ?? grantsByUser.get(userId) ?? []);
      if (cur.has(regionId)) cur.delete(regionId);
      else cur.add(regionId);
      return { ...prev, [userId]: cur };
    });
  };

  const saveRegions = async (userId: string) => {
    setError(null);
    setSavingUserId(userId);
    try {
      const ids = Array.from(regionsFor(userId));
      await onSaveRegions(userId, ids);
      setDraftRegions((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setSavingUserId(null);
    }
  };

  const saveRole = async (userId: string) => {
    const r = roleFor(profiles.find((x) => x.id === userId)!);
    if (r !== "player" && r !== "editor" && r !== "admin") return;
    setError(null);
    setSavingUserId(userId);
    try {
      await onSaveRole(userId, r);
      setDraftRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Assign editor roles and which regions each editor may change.
        </Typography>
      </Box>
      {error ? (
        <Typography color="error" variant="body2" sx={{ px: 2, pb: 1 }}>
          {error}
        </Typography>
      ) : null}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 1, pb: 2 }}>
        <Table size="small" component={Paper} variant="outlined">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Regions (editors)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId;
              const r = roleFor(p);
              const busy = savingUserId === p.id;
              return (
                <TableRow key={p.id}>
                  <TableCell sx={{ maxWidth: 200, verticalAlign: "top" }}>
                    <Typography variant="body2" noWrap title={p.email ?? p.id}>
                      {p.email ?? p.id}
                    </Typography>
                    {isSelf ? (
                      <Typography variant="caption" color="text.secondary">
                        You
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <FormControl size="small" fullWidth disabled={isSelf || busy}>
                      <InputLabel id={`role-${p.id}`}>Role</InputLabel>
                      <Select
                        labelId={`role-${p.id}`}
                        label="Role"
                        value={r}
                        onChange={(e) =>
                          setDraftRoles((prev) => ({
                            ...prev,
                            [p.id]: String(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="player">player</MenuItem>
                        <MenuItem value="editor">editor</MenuItem>
                        <MenuItem value="admin">admin</MenuItem>
                      </Select>
                    </FormControl>
                    {!isSelf && (draftRoles[p.id] !== undefined && draftRoles[p.id] !== p.role) ? (
                      <Button
                        size="small"
                        sx={{ mt: 1, display: "block" }}
                        variant="contained"
                        disabled={busy}
                        onClick={() => void saveRole(p.id)}
                      >
                        Save role
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {r === "editor" ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        {regions.map((reg) => (
                          <label
                            key={reg.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: busy ? "default" : "pointer",
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={regionsFor(p.id).has(reg.id)}
                              disabled={busy}
                              onChange={() => toggleRegion(p.id, reg.id)}
                            />
                            <Typography variant="body2">{reg.name}</Typography>
                          </label>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Only editors use region access.
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: "top" }}>
                    {r === "editor" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => void saveRegions(p.id)}
                      >
                        Save regions
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
