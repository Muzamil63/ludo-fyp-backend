// One place that talks to the REST API. Adds the JWT, unwraps { success, data }, turns errors into ApiError.
import { DEFAULT_SERVER_URL, REQUEST_TIMEOUT_MS } from '../config';

let serverUrl = DEFAULT_SERVER_URL;
let authToken: string | null = null;

export function setServerUrl(url: string) {
  serverUrl = url.replace(/\/+$/, ''); // no trailing slash
}
export const getServerUrl = () => serverUrl;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${serverUrl}. Check it is running and the address in Settings.`, 0);
  } finally {
    clearTimeout(timer);
  }

  let json: { success: boolean; data?: T; message?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError('The server sent an unexpected answer. Is this the Ludo backend?', res.status);
  }
  if (!json.success) throw new ApiError(json.message || 'Something went wrong', res.status);
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// Short readable message for any error (used in toasts / alerts).
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
