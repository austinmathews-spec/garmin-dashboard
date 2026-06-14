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

    const points = (hr.heartRateValues ?? [])
      .flat()
      .filter((entry: { heartrate: number; timestamp: number }) => entry.heartrate > 0)
      .map((entry: { heartrate: number; timestamp: number }) => ({
        timestamp: new Date(entry.timestamp).toISOString(),
        value: entry.heartrate,
      }));

    return res.status(200).json({
      date: hr.calendarDate,
      restingHeartRate: hr.restingHeartRate,
      maxHeartRate: hr.maxHeartRate,
      minHeartRate: hr.minHeartRate,
      lastSevenDaysAvgRestingHeartRate: hr.lastSevenDaysAvgRestingHeartRate,
      points,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Heart rate fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch heart rate data', details: message });
  }
}
