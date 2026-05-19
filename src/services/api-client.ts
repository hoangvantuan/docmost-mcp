import axios, { AxiosInstance, AxiosError } from "axios";
import { REQUEST_TIMEOUT } from "../constants.js";

const SESSION_TTL = 30 * 60 * 1000;

interface CachedClient {
  client: DocmostClient;
  expiry: number;
}

const cache = new Map<string, CachedClient>();

export class DocmostClient {
  private http: AxiosInstance;

  private constructor(http: AxiosInstance) {
    this.http = http;
  }

  static async create(url: string, email: string, password: string): Promise<DocmostClient> {
    const baseURL = `${url.replace(/\/$/, "")}/api`;

    const http = axios.create({
      baseURL,
      timeout: REQUEST_TIMEOUT,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      maxRedirects: 0,
    });

    const loginRes = await http.post(
      "/auth/login",
      { email, password },
      { validateStatus: (s) => s < 400 },
    );

    let authCookie: string | null = null;
    const cookies = loginRes.headers["set-cookie"];
    if (cookies) {
      for (const c of cookies) {
        if (c.startsWith("authToken=")) {
          authCookie = c.split(";")[0];
          break;
        }
      }
    }

    if (!authCookie) {
      throw new Error("Login succeeded but no authToken cookie received.");
    }

    http.defaults.headers.common["Cookie"] = authCookie;
    await http.post("/users/me", {});

    return new DocmostClient(http);
  }

  async request<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await this.http.post<T>(endpoint, body);
    return res.data;
  }
}

export async function getOrCreateClient(
  url: string,
  email: string,
  password: string,
): Promise<DocmostClient> {
  const key = `${url}::${email}`;
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.client;
  }
  const client = await DocmostClient.create(url, email, password);
  cache.set(key, { client, expiry: Date.now() + SESSION_TTL });
  return client;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? (data as { message: string }).message
          : JSON.stringify(data);

      switch (status) {
        case 400:
          return `Error: Bad request. ${message}`;
        case 401:
          return "Error: Authentication failed. Check credentials.";
        case 403:
          return `Error: Permission denied. ${message}`;
        case 404:
          return `Error: Resource not found. ${message}`;
        case 429:
          return "Error: Rate limit exceeded. Wait before retrying.";
        default:
          return `Error: API request failed (HTTP ${status}). ${message}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Docmost server may be unreachable.";
    } else if (error.code === "ECONNREFUSED") {
      return "Error: Cannot connect to Docmost. Check URL.";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
