/**
 * Build para VPS / Docker: API no mesmo host, servida pelo proxy em /api (Nginx/Caddy).
 * `apiUrl` vazio faz as chamadas usarem caminhos relativos (/api/v1/...).
 */
export const environment = {
  production: true,
  apiUrl: '',
};
