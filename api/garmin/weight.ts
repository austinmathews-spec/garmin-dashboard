import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGarminClient } from './_client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dateStr = req.query.date as string | undefined;
    const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();

    const client = await getGarminClient();
    const data = await client.getDailyWeightData(date);

    const entries = (data.dateWeightList ?? []).map((entry: { calendarDate: string; weight: number; bmi: number | null; bodyFat: number | null; bodyWater: number | null; muscleMass: number | null; boneMass: number | null; visceralFat: number | null; metabolicAge: number | null; timestampGMT: number }) => ({
      date: entry.calendarDate,
      weightKg: Math.round((entry.weight / 1000) * 100) / 100,
      weightLbs: Math.round((entry.weight / 1000) * 2.20462 * 10) / 10,
      bmi: entry.bmi != null ? Math.round(entry.bmi * 10) / 10 : null,
      bodyFatPct: entry.bodyFat != null ? Math.round(entry.bodyFat * 10) / 10 : null,
      bodyWaterPct: entry.bodyWater != null ? Math.round(entry.bodyWater * 10) / 10 : null,
      muscleMassKg: entry.muscleMass != null ? Math.round((entry.muscleMass / 1000) * 100) / 100 : null,
      boneMassKg: entry.boneMass != null ? Math.round((entry.boneMass / 1000) * 100) / 100 : null,
      visceralFat: entry.visceralFat,
      metabolicAge: entry.metabolicAge,
      timestamp: new Date(entry.timestampGMT).toISOString(),
    }));

    const avg = data.totalAverage;

    return res.status(200).json({
      startDate: data.startDate,
      endDate: data.endDate,
      entries,
      average: avg ? {
        weightKg: Math.round((avg.weight / 1000) * 100) / 100,
        weightLbs: Math.round((avg.weight / 1000) * 2.20462 * 10) / 10,
        bmi: avg.bmi != null ? Math.round(avg.bmi * 10) / 10 : null,
        bodyFatPct: avg.bodyFat != null ? Math.round(avg.bodyFat * 10) / 10 : null,
        muscleMassKg: avg.muscleMass != null ? Math.round((avg.muscleMass / 1000) * 100) / 100 : null,
      } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weight fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch weight data', details: message });
  }
}
