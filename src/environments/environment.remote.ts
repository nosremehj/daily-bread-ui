import { DEPLOYED_API_URL } from './deployed-api-url';

/** Dev local (`ng serve`) contra a API publicada (EasyPanel). */
export const environment = {
  production: false,
  apiUrl: DEPLOYED_API_URL,
};
