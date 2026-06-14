import { useState, useEffect, useCallback } from 'react';
import { getMockHeartRate, getMockSleep, getMockActivities } from './mockData';
import { fetchHeartRate, fetchSleep, fetchActivities } from './garminApi';
import type { HeartRateSummary, SleepSummary, Activity } from '../types';

export type DataSource = 'mock' | 'live';

interface UseGarminDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHeartRateData(
  source: DataSource,
  date?: string,
): UseGarminDataResult<HeartRateSummary> {
  const [data, setData] = useState<HeartRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (source === 'mock') {
      const mock = getMockHeartRate(date);
      setData(mock);
      setLoading(false);
    } else {
      fetchHeartRate(date)
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
            const mock = getMockHeartRate(date);
            setData(mock);
          }
        });
    }

    return () => { cancelled = true; };
  }, [source, date, refreshKey]);

  return { data, loading, error, refresh };
}

export function useSleepData(
  source: DataSource,
  date?: string,
): UseGarminDataResult<SleepSummary> {
  const [data, setData] = useState<SleepSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (source === 'mock') {
      const mock = getMockSleep(date);
      setData(mock);
      setLoading(false);
    } else {
      fetchSleep(date)
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
            const mock = getMockSleep(date);
            setData(mock);
          }
        });
    }

    return () => { cancelled = true; };
  }, [source, date, refreshKey]);

  return { data, loading, error, refresh };
}

export function useActivitiesData(
  source: DataSource,
  limit = 10,
): UseGarminDataResult<Activity[]> {
  const [data, setData] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (source === 'mock') {
      const mock = getMockActivities();
      setData(mock);
      setLoading(false);
    } else {
      fetchActivities(limit)
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
            const mock = getMockActivities();
            setData(mock);
          }
        });
    }

    return () => { cancelled = true; };
  }, [source, limit, refreshKey]);

  return { data, loading, error, refresh };
}
