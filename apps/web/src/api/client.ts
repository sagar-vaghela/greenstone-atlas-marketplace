export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly kind: ApiErrorKind = classifyErrorKind(status),
  ) {
    super(message);
    this.name = "ApiError";
  }
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

export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
      ...options,
    });
  } catch {
    throw new ApiError("Unable to reach the marketplace service.", 0, "NETWORK_ERROR");
  }

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
      errorBody && "message" in errorBody && typeof errorBody.message === "string"
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
    );
  }

  return body as T;
}
