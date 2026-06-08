// ── Garmin Health Data Types ──

export interface HeartRatePoint {
  timestamp: string; // ISO 8601
  value: number;     // bpm
}

export interface HeartRateSummary {
  date: string;
  restingHR: number;
  maxHR: number;
  minHR: number;
  avgHR: number;
  timelinePoints: HeartRatePoint[];
  zones: HeartRateZone[];
}

export interface HeartRateZone {
  zone: string;       // "Rest", "Fat Burn", "Cardio", "Peak"
  minBpm: number;
  maxBpm: number;
  minutes: number;
}

export interface SleepStage {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface SleepSummary {
  date: string;
  totalSleepMinutes: number;
  sleepScore: number;
  startTime: string;
  endTime: string;
  stages: SleepStage[];
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  timeToFallAsleepMinutes: number;
  timesWoken: number;
}

export interface Activity {
  id: string;
  type: string;        // "Running", "Cycling", "Swimming", etc.
  name: string;
  date: string;
  durationMinutes: number;
  distanceKm: number;
  avgHeartRate: number;
  maxHeartRate: number;
  calories: number;
  avgPace?: string;    // "5:30 /km"
  heartRateTimeline?: HeartRatePoint[];
  splits?: ActivitySplit[];
}

export interface ActivitySplit {
  index: number;
  distanceKm: number;
  pace: string;
  avgHR: number;
}

export interface DailySummary {
  date: string;
  steps: number;
  stepsGoal: number;
  calories: number;
  activeMinutes: number;
  restingHR: number;
  maxHR: number;
  stressLevel: number;   // 0-100
  bodyBattery: number;   // 0-100
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'All';
