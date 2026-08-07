const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

function normalizeApiUrl(value: string): string {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_API_URL must use http:// or https://.');
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be an origin without /api, a path, query, or fragment.',
    );
  }
  return parsed.origin;
}

if (!configuredApiUrl && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_API_URL is required for production builds. Set it to the public backend origin.',
  );
}

export const API_BASE_URL = normalizeApiUrl(
  configuredApiUrl || 'http://localhost:5000',
);
export const GOOGLE_AUTH_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID?.trim() || '';
