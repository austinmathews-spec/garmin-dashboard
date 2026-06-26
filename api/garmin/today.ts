import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGarminClient } from './_client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getGarminClient();
    const today = new Date();

    const [hr, steps, sleep] = await Promise.all([
      client.getHeartRate(today).catch(() => null),
      client.getSteps(today).catch(() => null),
      client.getSleepData(today).catch(() => null),
    ]);

    return res.status(200).json({
      date: today.toISOString().split('T')[0],
      steps: steps ?? null,
      restingHR: hr?.restingHeartRate ?? null,
      maxHR: hr?.maxHeartRate ?? null,
      minHR: hr?.minHeartRate ?? null,
      lastSevenDaysAvgRestingHR: hr?.lastSevenDaysAvgRestingHeartRate ?? null,
      sleepScore: sleep?.dailySleepDTO?.sleepScores?.overall?.value ?? null,
      sleepMinutes: sleep ? Math.round(sleep.dailySleepDTO.sleepTimeSeconds / 60) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Today summary fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch today summary', details: message });
  }
}
