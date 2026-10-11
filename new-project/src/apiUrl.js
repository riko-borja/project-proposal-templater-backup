// Vue CLI injects VUE_APP_API_URL at build time. Set it to the backend origin.
const API_BASE_URL = (process.env.VUE_APP_API_URL || 'http://127.0.0.1:5001')
  .trim().replace(/\/+$/, '');

export function backendUrl(apiPath) {
  return API_BASE_URL + apiPath;
}
