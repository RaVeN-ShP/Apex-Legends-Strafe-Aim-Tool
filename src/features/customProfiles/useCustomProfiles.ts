"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pattern, Gun } from "@/features/guns/types/gun";

export type CustomProfile = {
  id: string;
  name: string;
  strafePattern: Pattern[];
};

const STORAGE_KEY = "customPatterns"; // backward compatible key

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadProfilesFromStorage(): CustomProfile[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<unknown>(window.localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];
  return (parsed as unknown[]).filter((p): p is CustomProfile => {
    if (!p || typeof p !== 'object') return false;
    const obj = p as Record<string, unknown>;
    return typeof obj.id === 'string' && typeof obj.name === 'string' && Array.isArray(obj.strafePattern);
  });
}

function saveProfilesToStorage(profiles: CustomProfile[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

export function profileToGun(profile: CustomProfile): Gun {
  return {
    id: `custom:${profile.id}`,
    name: profile.name || "Custom",
    category: "custom",
    image: "/favicon.ico",
    pattern: { default: profile.strafePattern },
  };
}

function generateId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rand}`;
}

export function useCustomProfiles() {
  const [profiles, setProfiles] = useState<CustomProfile[]>([]);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // initial load
  useEffect(() => {
    const loaded = loadProfilesFromStorage();
    setProfiles(loaded);
    setHasLoaded(true);
  }, []);

  // persist only after initial load has occurred
  useEffect(() => {
    if (!hasLoaded) return;
    saveProfilesToStorage(profiles);
  }, [profiles, hasLoaded]);

  const addProfile = useCallback((p: Omit<CustomProfile, "id">): CustomProfile => {
    const created: CustomProfile = { id: generateId(), ...p };
    setProfiles((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProfile = useCallback((updated: CustomProfile) => {
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const copy = prev.slice();
      copy[idx] = updated;
      return copy;
    });
  }, []);

  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const gunsFromProfiles: Gun[] = useMemo(() => profiles.map(profileToGun), [profiles]);

  return { profiles, addProfile, updateProfile, removeProfile, gunsFromProfiles };
}


