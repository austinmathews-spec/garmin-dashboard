// Vercel serverless function — GET /api/garmin/activities?limit=10
// Returns recent activities list

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // TODO: Replace with real garmin-connect fetch
    return res.status(200).json({
      limit,
      message: 'Activities endpoint ready — wire up garmin-connect',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
}
