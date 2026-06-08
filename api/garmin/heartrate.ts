// Vercel serverless function — GET /api/garmin/heartrate?date=YYYY-MM-DD
// Returns heart rate data for a given day

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const date = (req.query.date as string) ?? new Date().toISOString().split('T')[0];

    // TODO: Replace with real garmin-connect fetch
    // const GarminConnect = require('garmin-connect').GarminConnect;
    // const client = new GarminConnect({ username: process.env.GARMIN_EMAIL, password: process.env.GARMIN_PASSWORD });
    // await client.login();
    // const hr = await client.getHeartRate(date);

    return res.status(200).json({
      date,
      message: 'Heart rate endpoint ready — wire up garmin-connect',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch heart rate data' });
  }
}
