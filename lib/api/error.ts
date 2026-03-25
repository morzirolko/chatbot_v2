export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function readJsonResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; code?: string })
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? "Request failed.",
      response.status,
      payload?.code,
    );
  }

  return payload as T;
}
