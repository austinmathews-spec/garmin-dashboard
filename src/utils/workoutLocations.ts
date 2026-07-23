import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'garmin_workout_locations';

type LocationMap = Record<string, string>;

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function readLocations(): LocationMap {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocationMap) : {};
  } catch {
    return {};
  }
}

function writeLocations(map: LocationMap): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore write failures (e.g. private mode)
  }
}

/**
 * Persist a user-tagged location per workout, keyed by activity id.
 * Locations are stored locally in the browser (localStorage) since Garmin
 * activity data is read-only.
 */
export function useWorkoutLocations() {
  const [locations, setLocations] = useState<LocationMap>({});

  useEffect(() => {
    setLocations(readLocations());
  }, []);

  const setLocation = useCallback((activityId: string, location: string) => {
    setLocations((prev) => {
      const next = { ...prev };
      const trimmed = location.trim();
      if (trimmed) {
        next[activityId] = trimmed;
      } else {
        delete next[activityId];
      }
      writeLocations(next);
      return next;
    });
  }, []);

  return { locations, setLocation };
}
