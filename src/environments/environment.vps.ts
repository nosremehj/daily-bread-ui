import { DEPLOYED_API_URL } from './deployed-api-url';

/**
 * Build Docker/VPS (EasyPanel): mesma API pública que `environment.prod.ts`.
 * Garanta CORS no backend para a origem do front.
 */
export const environment = {
  production: true,
  apiUrl: DEPLOYED_API_URL,
};
