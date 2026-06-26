import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGarminClient } from './_client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dateStr = req.query.date as string | undefined;
    const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();

    const client = await getGarminClient();
    const hr = await client.getHeartRate(date);

    const rawSample = (hr.heartRateValues ?? []).slice(0, 5);
    const firstEntry = rawSample[0];

    return res.status(200).json({
      type: typeof firstEntry,
      isArray: Array.isArray(firstEntry),
      sample: rawSample,
      keys: firstEntry && typeof firstEntry === 'object' ? Object.keys(firstEntry) : null,
      totalEntries: (hr.heartRateValues ?? []).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
