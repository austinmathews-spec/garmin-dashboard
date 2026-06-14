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
    const sleep = await client.getSleepData(date);
    const dto = sleep.dailySleepDTO;

    const totalSleepMinutes = Math.round(dto.sleepTimeSeconds / 60);
    const deepMinutes = Math.round(dto.deepSleepSeconds / 60);
    const lightMinutes = Math.round(dto.lightSleepSeconds / 60);
    const remMinutes = Math.round(dto.remSleepSeconds / 60);
    const awakeMinutes = Math.round(dto.awakeSleepSeconds / 60);
    const sleepScore = dto.sleepScores?.overall?.value ?? 0;

    const stages = (sleep.sleepLevels ?? []).map((level) => {
      const stageMap: Record<number, string> = {
        0: 'awake',
        1: 'light',
        2: 'deep',
        3: 'light',
        4: 'rem',
        5: 'awake',
      };
      const stageName = stageMap[level.activityLevel] ?? 'light';
      const startMs = new Date(level.startGMT).getTime();
      const endMs = new Date(level.endGMT).getTime();
      const durationMinutes = Math.round((endMs - startMs) / 60000);

      return {
        stage: stageName,
        startTime: level.startGMT,
        endTime: level.endGMT,
        durationMinutes: Math.max(durationMinutes, 1),
      };
    });

    return res.status(200).json({
      date: dto.calendarDate,
      totalSleepMinutes,
      deepMinutes,
      lightMinutes,
      remMinutes,
      awakeMinutes,
      sleepScore,
      startTime: new Date(dto.sleepStartTimestampLocal).toISOString(),
      endTime: new Date(dto.sleepEndTimestampLocal).toISOString(),
      awakeCount: dto.awakeCount,
      restingHeartRate: sleep.restingHeartRate,
      avgOvernightHrv: sleep.avgOvernightHrv,
      stages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sleep fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch sleep data', details: message });
  }
}
