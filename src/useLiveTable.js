import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

/**
 * Loads a table ordered newest-first, subscribes to realtime changes,
 * and exposes an `add(row)` helper that inserts + optimistically prepends.
 * `mapRow` converts a raw Supabase row into the shape the UI expects
 * (e.g. renaming columns, turning ISO strings into Date objects).
 */
export function useLiveTable(table, { mapRow, orderBy = "created_at", limit = 200 } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const transform = useCallback((r) => (mapRow ? mapRow(r) : r), [mapRow]);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error: err } = await supabase
        .from(table)
        .select("*")
        .is("deleted_at", null)
        .order(orderBy, { ascending: false })
        .limit(limit);
      if (!active) return;
      if (err) setError(err);
      else setRows((data || []).map(transform));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`${table}-changes`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, (payload) => {
        setRows((prev) => [transform(payload.new), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table }, (payload) => {
        if (payload.new.deleted_at) {
          setRows((prev) => prev.filter((r) => r.id !== payload.new.id));
        } else {
          setRows((prev) => prev.map((r) => (r.id === payload.new.id ? transform(payload.new) : r)));
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [table, orderBy, limit, transform]);

  const add = useCallback(
    async (row) => {
      if (!supabase) {
        // No Supabase configured — fall back to local-only so the UI still works in dev.
        setRows((prev) => [{ id: `local-${Date.now()}`, ...row }, ...prev]);
        return;
      }
      const { data, error: err } = await supabase.from(table).insert(row).select().single();
      if (err) {
        setError(err);
        return;
      }
      // Realtime subscription above will also deliver this; de-dupe by id if it beats us to it.
      setRows((prev) => (prev.some((r) => r.id === data.id) ? prev : [transform(data), ...prev]));
    },
    [table, transform]
  );

  const update = useCallback(
    async (id, patch) => {
      if (!supabase) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        return;
      }
      const { data, error: err } = await supabase.from(table).update(patch).eq("id", id).select().single();
      if (err) {
        setError(err);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? transform(data) : r)));
    },
    [table, transform]
  );

  const remove = useCallback(
    async (id) => {
      if (!supabase) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      const { error: err } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (err) {
        setError(err);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    },
    [table]
  );

  return { rows, add, update, remove, loading, error };
}
