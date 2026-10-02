const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
export const API_BASE_URL =
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:3000" : "");

export type ApiErrorKind =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "server"
  | "network"
  | "unknown";

export type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly kind: ApiErrorKind = classifyErrorKind(status),
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function classifyErrorKind(status: number): ApiErrorKind {
  if (status === 0) return "network";
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}

function withTimeoutSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs?: number,
) {
  if (timeoutMs === undefined || timeoutMs <= 0) return signal ?? undefined;

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  const abortListener = () => {
    controller.abort();
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", abortListener);
  };

  signal?.addEventListener("abort", abortListener, { once: true });

  const cleanup = () => {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", abortListener);
  };

  return {
    signal: controller.signal,
    cleanup,
  };
}

export async function request<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const timeoutConfig = withTimeoutSignal(options?.signal, options?.timeoutMs);
  const requestSignal =
    timeoutConfig && "signal" in timeoutConfig
      ? timeoutConfig.signal
      : options?.signal;
  const normalizedBody =
    options?.body &&
    typeof options.body !== "string" &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof URLSearchParams)
      ? JSON.stringify(options.body)
      : options?.body;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(normalizedBody &&
        !(normalizedBody instanceof FormData) &&
        !(normalizedBody instanceof Blob) &&
        !(normalizedBody instanceof URLSearchParams)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options?.headers,
      },
      ...options,
      body: normalizedBody,
      signal: requestSignal,
    });
  } catch (error) {
    if (timeoutConfig && "cleanup" in timeoutConfig) timeoutConfig.cleanup();
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "The request took too long and was cancelled.",
        0,
        "REQUEST_TIMEOUT",
      );
    }
    throw new ApiError(
      "Unable to reach the marketplace service.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (timeoutConfig && "cleanup" in timeoutConfig) timeoutConfig.cleanup();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const errorBody =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null
        ? body.error
        : undefined;
    const message =
      errorBody &&
      "message" in errorBody &&
      typeof errorBody.message === "string"
        ? errorBody.message
        : "The marketplace service returned an error.";
    const code =
      errorBody && "code" in errorBody && typeof errorBody.code === "string"
        ? errorBody.code
        : undefined;

    throw new ApiError(
      message,
      response.status,
      code,
      classifyErrorKind(response.status),
      response.headers.get("x-request-id") ??
        (errorBody &&
        "requestId" in errorBody &&
        typeof errorBody.requestId === "string"
          ? errorBody.requestId
          : undefined),
    );
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST" }),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH" }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
