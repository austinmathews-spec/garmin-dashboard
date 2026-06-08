// Vercel serverless function — GET /api/garmin/today
// Returns daily summary: steps, calories, HR, stress, body battery

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Replace with real garmin-connect fetch once credentials are wired up
    // const GarminConnect = require('garmin-connect').GarminConnect;
    // const client = new GarminConnect({ username: process.env.GARMIN_EMAIL, password: process.env.GARMIN_PASSWORD });
    // await client.login();
    // const summary = await client.getDailySteps();

    const mockData = {
      date: new Date().toISOString().split('T')[0],
      steps: 8432,
      stepsGoal: 10000,
      calories: 2150,
      activeMinutes: 68,
      restingHR: 58,
      maxHR: 178,
      stressLevel: 32,
      bodyBattery: 72,
    };

    return res.status(200).json(mockData);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Garmin data' });
  }
}
