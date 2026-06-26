import type { HeartRatePoint, HeartRateSummary, HeartRateZone, SleepSummary, SleepStage, Activity } from '../types';

const API_BASE = '/api/garmin';

function computeZones(points: HeartRatePoint[], totalMinutes: number): HeartRateZone[] {
  const zones: HeartRateZone[] = [
    { zone: 'Rest', minBpm: 50, maxBpm: 100, minutes: 0 },
    { zone: 'Fat Burn', minBpm: 100, maxBpm: 140, minutes: 0 },
    { zone: 'Cardio', minBpm: 140, maxBpm: 170, minutes: 0 },
    { zone: 'Peak', minBpm: 170, maxBpm: 220, minutes: 0 },
  ];
  const minutesPerPoint = totalMinutes / Math.max(points.length - 1, 1);
  for (const p of points) {
    for (const z of zones) {
      if (p.value >= z.minBpm && p.value < z.maxBpm) {
        z.minutes += minutesPerPoint;
        break;
      }
    }
  }
  for (const z of zones) z.minutes = Math.round(z.minutes);
  return zones;
}

export async function fetchHeartRate(date?: string): Promise<HeartRateSummary> {
  const url = date ? `${API_BASE}/heartrate?date=${date}` : `${API_BASE}/heartrate`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HR fetch failed: ${res.status}`);
  let data = await res.json();

  // If today has no data, try yesterday
  if (!date && (data.points ?? []).length === 0 && data.restingHeartRate == null) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yRes = await fetch(`${API_BASE}/heartrate?date=${yesterday}`);
    if (yRes.ok) {
      const yData = await yRes.json();
      if ((yData.points ?? []).length > 0) data = yData;
    }
  }

  const points: HeartRatePoint[] = data.points ?? [];
  const values = points.map((p: HeartRatePoint) => p.value);
  const avgHR = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;

  return {
    date: data.date,
    restingHR: data.restingHeartRate ?? 0,
    maxHR: data.maxHeartRate ?? 0,
    minHR: data.minHeartRate ?? 0,
    avgHR,
    timelinePoints: points,
    zones: computeZones(points, 24 * 60),
  };
}

export async function fetchSleep(date?: string): Promise<SleepSummary> {
  const url = date ? `${API_BASE}/sleep?date=${date}` : `${API_BASE}/sleep`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sleep fetch failed: ${res.status}`);
  let data = await res.json();

  // If today has no sleep data, try yesterday
  if (!date && (data.totalSleepMinutes ?? 0) === 0) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yRes = await fetch(`${API_BASE}/sleep?date=${yesterday}`);
    if (yRes.ok) {
      const yData = await yRes.json();
      if ((yData.totalSleepMinutes ?? 0) > 0) data = yData;
    }
  }

  const stages: SleepStage[] = (data.stages ?? []).map((s: { stage: string; startTime: string; endTime: string; durationMinutes: number }) => ({
    stage: s.stage as SleepStage['stage'],
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
  }));

  return {
    date: data.date,
    totalSleepMinutes: data.totalSleepMinutes ?? 0,
    sleepScore: data.sleepScore ?? 0,
    startTime: data.startTime ?? '',
    endTime: data.endTime ?? '',
    stages,
    deepMinutes: data.deepMinutes ?? 0,
    lightMinutes: data.lightMinutes ?? 0,
    remMinutes: data.remMinutes ?? 0,
    awakeMinutes: data.awakeMinutes ?? 0,
    timeToFallAsleepMinutes: 0,
    timesWoken: data.awakeCount ?? 0,
  };
}

export async function fetchActivities(limit = 10): Promise<Activity[]> {
  const res = await fetch(`${API_BASE}/activities?limit=${limit}`);
  if (!res.ok) throw new Error(`Activities fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.activities ?? []).map((a: {
    id: string;
    name: string;
    type: string;
    date: string;
    durationMinutes: number;
    distanceKm: number;
    calories: number;
    avgHeartRate: number;
    maxHeartRate: number;
    avgPace?: string;
  }) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    date: a.date,
    durationMinutes: a.durationMinutes,
    distanceKm: a.distanceKm,
    calories: a.calories,
    avgHeartRate: a.avgHeartRate,
    maxHeartRate: a.maxHeartRate,
    avgPace: a.avgPace,
  }));
}
