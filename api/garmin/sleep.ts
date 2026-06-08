// Vercel serverless function — GET /api/garmin/sleep?date=YYYY-MM-DD
// Returns sleep data for a given night

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const date = (req.query.date as string) ?? new Date().toISOString().split('T')[0];

    // TODO: Replace with real garmin-connect fetch
    return res.status(200).json({
      date,
      message: 'Sleep endpoint ready — wire up garmin-connect',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
}
