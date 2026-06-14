import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGarminClient } from './_client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const client = await getGarminClient();
    const rawActivities = await client.getActivities(0, limit);

    const activities = rawActivities.map((a) => {
      const typeKey = a.activityType?.typeKey ?? 'other';
      const typeMap: Record<string, string> = {
        running: 'Running',
        street_running: 'Running',
        trail_running: 'Running',
        treadmill_running: 'Running',
        cycling: 'Cycling',
        indoor_cycling: 'Cycling',
        lap_swimming: 'Swimming',
        open_water_swimming: 'Swimming',
        strength_training: 'Strength',
        fitness_equipment: 'Strength',
        walking: 'Walking',
        hiking: 'Hiking',
      };
      const type = typeMap[typeKey] ?? typeKey;

      const durationMinutes = Math.round((a.duration ?? 0) / 60);
      const distanceKm = Math.round(((a.distance ?? 0) / 1000) * 10) / 10;
      const dateStr = a.startTimeLocal?.split(' ')[0] ?? '';

      let avgPace: string | undefined;
      if (type === 'Running' && a.averageSpeed && a.averageSpeed > 0) {
        const paceSecsPerKm = 1000 / a.averageSpeed;
        const paceMin = Math.floor(paceSecsPerKm / 60);
        const paceSec = Math.round(paceSecsPerKm % 60);
        avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
      }

      return {
        id: String(a.activityId),
        name: a.activityName ?? type,
        type,
        date: dateStr,
        durationMinutes,
        distanceKm,
        calories: a.calories ?? 0,
        avgHeartRate: a.averageHR ?? 0,
        maxHeartRate: a.maxHR ?? 0,
        avgPace,
      };
    });

    return res.status(200).json({ activities });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Activities fetch failed:', message);
    return res.status(500).json({ error: 'Failed to fetch activities', details: message });
  }
}
