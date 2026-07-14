const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export interface ApiError {
  message: string;
  status?: number;
  validationErrors?: Record<string, string>;
}

export async function normalizeError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    if (data && data.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI 422 ValidationError validation fields format
        const validationErrors: Record<string, string> = {};
        data.detail.forEach((err: any) => {
          const field = err.loc[err.loc.length - 1];
          validationErrors[field] = err.msg;
        });
        return {
          message: "Erro de validação nos campos informados.",
          status: response.status,
          validationErrors,
        };
      }
      return {
        message: typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail),
        status: response.status,
      };
    }
    return {
      message: data.message || `Erro do servidor (${response.status})`,
      status: response.status,
    };
  } catch {
    return {
      message: `Erro de comunicação com o servidor (${response.status})`,
      status: response.status,
    };
  }
}

export const tokenStorage = {
  getAccessToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  },
  getRefreshToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refresh_token");
  },
  setTokens: (access: string, refresh: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clearTokens: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

let onAuthFailureCallback: (() => void) | null = null;
export function registerAuthFailureHandler(callback: () => void) {
  onAuthFailureCallback = callback;
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error("Refresh failed");
    }

    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      tokenStorage.setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    }
    return null;
  } catch (err) {
    tokenStorage.clearTokens();
    if (onAuthFailureCallback) {
      onAuthFailureCallback();
    }
    return null;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest(path: string, options: RequestOptions = {}): Promise<any> {
  const { skipAuth, ...fetchOptions } = options;
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  fetchOptions.headers = headers;

  const makeRequest = () => fetch(url, fetchOptions);

  let response = await makeRequest();

  if (response.status === 401 && !skipAuth) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          headers.set("Authorization", `Bearer ${newToken}`);
          makeRequest()
            .then(async (res) => {
              if (!res.ok) {
                reject(await normalizeError(res));
              } else {
                resolve(res.status === 204 ? null : await res.json());
              }
            })
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    const newAccessToken = await performRefresh();
    isRefreshing = false;

    if (newAccessToken) {
      onRefreshed(newAccessToken);
      headers.set("Authorization", `Bearer ${newAccessToken}`);
      response = await makeRequest();
    } else {
      tokenStorage.clearTokens();
      if (onAuthFailureCallback) {
        onAuthFailureCallback();
      }
      throw { message: "Sessão expirada. Faça login novamente.", status: 401 } as ApiError;
    }
  }

  if (!response.ok) {
    throw await normalizeError(response);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
