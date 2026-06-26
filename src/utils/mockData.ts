import type {
  HeartRateSummary,
  SleepSummary,
  Activity,
  DailySummary,
  HeartRatePoint,
  WeightSummary,
  WeightEntry,
} from '../types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateHRTimeline(date: string): HeartRatePoint[] {
  const points: HeartRatePoint[] = [];
  const base = new Date(`${date}T00:00:00`);
  for (let m = 0; m < 24 * 60; m += 5) {
    const t = new Date(base.getTime() + m * 60000);
    const hour = t.getHours();
    let hr: number;
    if (hour >= 0 && hour < 6) hr = 55 + Math.random() * 10;
    else if (hour >= 6 && hour < 9) hr = 70 + Math.random() * 25;
    else if (hour >= 9 && hour < 12) hr = 65 + Math.random() * 20;
    else if (hour >= 12 && hour < 14) hr = 75 + Math.random() * 15;
    else if (hour >= 14 && hour < 17) hr = 68 + Math.random() * 18;
    else if (hour >= 17 && hour < 19) hr = 100 + Math.random() * 50; // workout
    else hr = 65 + Math.random() * 15;
    points.push({ timestamp: t.toISOString(), value: Math.round(hr) });
  }
  return points;
}

export function getMockHeartRate(date?: string): HeartRateSummary {
  const d = date ?? todayStr();
  const timeline = generateHRTimeline(d);
  const values = timeline.map((p) => p.value);
  return {
    date: d,
    restingHR: 58,
    maxHR: Math.max(...values),
    minHR: Math.min(...values),
    avgHR: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    timelinePoints: timeline,
    zones: [
      { zone: 'Rest', minBpm: 50, maxBpm: 100, minutes: 840 },
      { zone: 'Fat Burn', minBpm: 100, maxBpm: 140, minutes: 65 },
      { zone: 'Cardio', minBpm: 140, maxBpm: 170, minutes: 30 },
      { zone: 'Peak', minBpm: 170, maxBpm: 200, minutes: 5 },
    ],
  };
}

export function getMockSleep(date?: string): SleepSummary {
  const d = date ?? todayStr();
  return {
    date: d,
    totalSleepMinutes: 462,
    sleepScore: 82,
    startTime: `${d}T22:45:00`,
    endTime: `${d}T06:27:00`,
    stages: [
      { stage: 'light', startTime: `${d}T22:45:00`, endTime: `${d}T23:15:00`, durationMinutes: 30 },
      { stage: 'deep', startTime: `${d}T23:15:00`, endTime: `${d}T00:30:00`, durationMinutes: 75 },
      { stage: 'light', startTime: `${d}T00:30:00`, endTime: `${d}T01:10:00`, durationMinutes: 40 },
      { stage: 'rem', startTime: `${d}T01:10:00`, endTime: `${d}T02:00:00`, durationMinutes: 50 },
      { stage: 'light', startTime: `${d}T02:00:00`, endTime: `${d}T02:45:00`, durationMinutes: 45 },
      { stage: 'deep', startTime: `${d}T02:45:00`, endTime: `${d}T03:30:00`, durationMinutes: 45 },
      { stage: 'awake', startTime: `${d}T03:30:00`, endTime: `${d}T03:35:00`, durationMinutes: 5 },
      { stage: 'rem', startTime: `${d}T03:35:00`, endTime: `${d}T04:30:00`, durationMinutes: 55 },
      { stage: 'light', startTime: `${d}T04:30:00`, endTime: `${d}T05:15:00`, durationMinutes: 45 },
      { stage: 'deep', startTime: `${d}T05:15:00`, endTime: `${d}T05:45:00`, durationMinutes: 30 },
      { stage: 'rem', startTime: `${d}T05:45:00`, endTime: `${d}T06:22:00`, durationMinutes: 37 },
      { stage: 'awake', startTime: `${d}T06:22:00`, endTime: `${d}T06:27:00`, durationMinutes: 5 },
    ],
    deepMinutes: 150,
    lightMinutes: 160,
    remMinutes: 142,
    awakeMinutes: 10,
    timeToFallAsleepMinutes: 12,
    timesWoken: 2,
  };
}

export function getMockActivities(): Activity[] {
  return [
    {
      id: '1',
      type: 'Running',
      name: 'Morning Run',
      date: todayStr(),
      durationMinutes: 42,
      distanceKm: 6.8,
      avgHeartRate: 152,
      maxHeartRate: 178,
      calories: 520,
      avgPace: '6:10 /km',
      splits: [
        { index: 1, distanceKm: 1, pace: '6:25', avgHR: 142 },
        { index: 2, distanceKm: 1, pace: '6:15', avgHR: 150 },
        { index: 3, distanceKm: 1, pace: '6:08', avgHR: 155 },
        { index: 4, distanceKm: 1, pace: '6:02', avgHR: 158 },
        { index: 5, distanceKm: 1, pace: '5:55', avgHR: 162 },
        { index: 6, distanceKm: 1, pace: '6:00', avgHR: 160 },
      ],
    },
    {
      id: '2',
      type: 'Cycling',
      name: 'Evening Ride',
      date: todayStr(),
      durationMinutes: 58,
      distanceKm: 22.4,
      avgHeartRate: 138,
      maxHeartRate: 165,
      calories: 480,
    },
    {
      id: '3',
      type: 'Strength',
      name: 'Upper Body',
      date: todayStr(),
      durationMinutes: 45,
      distanceKm: 0,
      avgHeartRate: 115,
      maxHeartRate: 148,
      calories: 280,
    },
    {
      id: '4',
      type: 'Running',
      name: 'Tempo Run',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      durationMinutes: 35,
      distanceKm: 5.5,
      avgHeartRate: 158,
      maxHeartRate: 182,
      calories: 450,
      avgPace: '6:22 /km',
    },
    {
      id: '5',
      type: 'Swimming',
      name: 'Pool Session',
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      durationMinutes: 40,
      distanceKm: 1.5,
      avgHeartRate: 128,
      maxHeartRate: 155,
      calories: 350,
    },
  ];
}

export function getMockDailySummary(date?: string): DailySummary {
  return {
    date: date ?? todayStr(),
    steps: 8432,
    stepsGoal: 10000,
    calories: 2150,
    activeMinutes: 68,
    restingHR: 58,
    maxHR: 178,
    stressLevel: 32,
    bodyBattery: 72,
  };
}

export function getMockWeeklyHR(): HeartRateSummary[] {
  const results: HeartRateSummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    results.push({
      ...getMockHeartRate(d),
      restingHR: 56 + Math.round(Math.random() * 6),
    });
  }
  return results;
}

export function getMockWeeklySleep(): SleepSummary[] {
  const results: SleepSummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const totalMin = 400 + Math.round(Math.random() * 120);
    results.push({
      ...getMockSleep(d),
      totalSleepMinutes: totalMin,
      sleepScore: 65 + Math.round(Math.random() * 30),
    });
  }
  return results;
}

export function getMockWeight(): WeightSummary {
  const entries: WeightEntry[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const baseWeight = 175 - (29 - i) * 0.1 + Math.random() * 2 - 1;
    const weightLbs = Math.round(baseWeight * 10) / 10;
    entries.push({
      date: d.toISOString().split('T')[0],
      weightLbs,
      weightKg: Math.round(weightLbs / 2.20462 * 100) / 100,
      bmi: Math.round((weightLbs / 2.20462 / (1.78 * 1.78)) * 10) / 10,
      bodyFatPct: Math.round((18 + Math.random() * 3) * 10) / 10,
      bodyWaterPct: Math.round((55 + Math.random() * 4) * 10) / 10,
      muscleMassKg: Math.round((35 + Math.random() * 2) * 100) / 100,
      boneMassKg: Math.round((3.1 + Math.random() * 0.2) * 100) / 100,
      visceralFat: Math.round(8 + Math.random() * 3),
      metabolicAge: 28 + Math.round(Math.random() * 3),
      timestamp: d.toISOString(),
    });
  }

  const latest = entries[entries.length - 1];
  const avgWeight = Math.round(entries.reduce((s, e) => s + e.weightLbs, 0) / entries.length * 10) / 10;
  const fatEntries = entries.filter(e => e.bodyFatPct != null);
  const avgFat = fatEntries.length > 0
    ? Math.round(fatEntries.reduce((s, e) => s + (e.bodyFatPct ?? 0), 0) / fatEntries.length * 10) / 10
    : null;
  const bmiEntries = entries.filter(e => e.bmi != null);
  const avgBmi = bmiEntries.length > 0
    ? Math.round(bmiEntries.reduce((s, e) => s + (e.bmi ?? 0), 0) / bmiEntries.length * 10) / 10
    : null;

  return {
    entries,
    latestEntry: latest,
    averageWeightLbs: avgWeight,
    averageBodyFatPct: avgFat,
    averageBmi: avgBmi,
  };
}
