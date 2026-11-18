import { createPolar } from '@polar-sh/sdk/2026-10';

export function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN || '';
  const environment = process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

  return createPolar({
    accessToken,
    environment,
  });
}
