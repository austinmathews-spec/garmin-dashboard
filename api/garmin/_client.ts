import { GarminConnect } from 'garmin-connect';

let cachedClient: GarminConnect | null = null;
let lastLoginTime = 0;
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

export async function getGarminClient(): Promise<GarminConnect> {
  const now = Date.now();

  if (cachedClient && now - lastLoginTime < SESSION_TTL) {
    return cachedClient;
  }

  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('GARMIN_EMAIL and GARMIN_PASSWORD environment variables are required');
  }

  const client = new GarminConnect({ username: email, password: password });
  await client.login();
  cachedClient = client;
  lastLoginTime = now;

  return client;
}
