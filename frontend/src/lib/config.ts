/** Central place for API base URL. Import instead of repeating the env lookup in every page. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
