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
    const hr = await client.getHeartRate(date);

    const rawValues = hr.heartRateValues ?? [];
    const points: { timestamp: string; value: number }[] = [];

    for (const entry of rawValues) {
      if (entry == null) continue;
      if (Array.isArray(entry)) {
        const [ts, val] = entry as [number, number | null];
        if (val != null && val > 0) {
          points.push({ timestamp: new Date(ts).toISOString(), value: val });
        }
      }
    }

    return res.status(200).json({
      date: hr.calendarDate,
      restingHeartRate: hr.restingHeartRate ?? null,
      maxHeartRate: hr.maxHeartRate ?? null,
      minHeartRate: hr.minHeartRate ?? null,
      lastSevenDaysAvgRestingHeartRate: hr.lastSevenDaysAvgRestingHeartRate ?? null,
      points,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Heart rate fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch heart rate data', details: message });
  }
}
