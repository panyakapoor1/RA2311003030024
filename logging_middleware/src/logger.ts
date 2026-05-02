import axios from "axios";

const BASE_URL = "http://20.207.122.201/evaluation-service";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
type FrontendPackage =
  | "api"
  | "component"
  | "hook"
  | "page"
  | "state"
  | "style"
  | "auth"
  | "config"
  | "middleware"
  | "utils";

interface AuthPayload {
  email: string; name: string; rollNo: string;
  accessCode: string; clientID: string; clientSecret: string;
}

let token: string | null = null;
let expiry = 0;
let creds: AuthPayload | null = null;

//must be called once before any Log() calls
export function initLogger(credentials: AuthPayload) { creds = credentials; }

//set token directly if the app already has one
export function setToken(t: string, expiresIn = 3600) {
  token = t;
  expiry = Date.now() + (expiresIn - 30) * 1000;
}

async function refreshToken(): Promise<string> {
  if (!creds) throw new Error("Logger not initialised, call initLogger() first");
  try {
    const res = await axios.post<{ access_token: string; expires_in: number }>(`${BASE_URL}/auth`, creds);
    token = res.data.access_token;
    expiry = Date.now() + (res.data.expires_in - 30) * 1000;
    return token;
  } catch (err: any) {
    throw new Error(`Auth token fetch failed: ${err?.response?.status ?? err?.message}`);
  }
}

async function getToken(): Promise<string> {
  if (token && Date.now() < expiry) return token;
  return refreshToken();
}

//sends a log entry to the evaluation-service API
export async function Log(stack: "frontend", level: LogLevel, pkg: FrontendPackage, message: string): Promise<void> {
  try {
    const t = await getToken();
    await axios.post(`${BASE_URL}/logs`, { stack, level, package: pkg, message }, {
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (typeof process !== "undefined" && process.stderr?.write) {
      process.stderr.write(`[LOG-MIDDLEWARE-ERROR] Failed to send log (level=${level}, pkg=${pkg}): ${err?.message}\n`);
    }
  }
}

export { LogLevel, FrontendPackage, AuthPayload };
