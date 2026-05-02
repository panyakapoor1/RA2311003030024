//Priority Inbox
//Fetches notifications, scores them by type + recency, extracts top-n via min-heap
//Usage: ts-node src/priority-inbox.ts [n]  (default n=10)

import * as dotenv from "dotenv";
import * as path from "path";
import axios from "axios";
import { MinHeap } from "./min-heap";
import { Log, initLogger } from "../../logging_middleware/dist/index";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = "http://20.207.122.201/evaluation-service";
const ALPHA = 0.6;
const BETA = 0.4;
const TYPE_WEIGHTS: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };

interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
  [key: string]: any;
}

interface ScoredNotification extends Notification {
  score: number;
  typeWeight: number;
  recencyScore: number;
}

function bootstrapLogger() {
  initLogger({
    email: process.env.EMAIL || "",
    name: process.env.NAME || "",
    rollNo: process.env.ROLL_NO || "",
    accessCode: process.env.ACCESS_CODE || "",
    clientID: process.env.CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || "",
  });
}

async function getAuthToken(): Promise<string> {
  await Log("frontend", "info", "auth", "Requesting auth token");
  const res = await axios.post<{ access_token: string; expires_in: number }>(`${BASE_URL}/auth`, {
    email: process.env.EMAIL,
    name: process.env.NAME,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });
  await Log("frontend", "info", "auth", `Token obtained, expires_in=${res.data.expires_in}s`);
  return res.data.access_token;
}

function parseNotifications(data: any): Notification[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.notifications)) return data.notifications;
  return [];
}

async function fetchAllNotifications(token: string): Promise<Notification[]> {
  const all: Notification[] = [];
  const headers = { Authorization: `Bearer ${token}` };
  await Log("frontend", "info", "api", "Fetching notifications");

  for (const type of ["Event", "Result", "Placement"]) {
    try {
      const res = await axios.get<any>(`${BASE_URL}/notifications`, {
        headers, params: { notification_type: type },
      });
      const items = parseNotifications(res.data);
      await Log("frontend", "debug", "api", `${type}: got ${items.length}`);
      all.push(...items);
    } catch (err: any) {
      await Log("frontend", "error", "api", `Failed fetching ${type}: ${err?.message}`);
    }
  }

  try {
    const res = await axios.get<any>(`${BASE_URL}/notifications`, { headers });
    const items = parseNotifications(res.data);
    const ids = new Set(all.map(n => n.ID));
    all.push(...items.filter(n => !ids.has(n.ID)));
  } catch (err: any) {
    await Log("frontend", "warn", "api", `Unfiltered fetch failed: ${err?.message}`);
  }

  await Log("frontend", "info", "api", `Total: ${all.length} notifications`);
  return all;
}

function computeRecencyScores(notifications: Notification[]): Map<string, number> {
  const map = new Map<string, number>();
  if (notifications.length === 0) return map;
  const timestamps = notifications.map(n => new Date(n.Timestamp).getTime());
  const min = Math.min(...timestamps);
  const range = Math.max(...timestamps) - min;
  for (const n of notifications) {
    const ts = new Date(n.Timestamp).getTime();
    map.set(n.ID, range > 0 ? (ts - min) / range : 1.0);
  }
  return map;
}

function scoreNotification(n: Notification, recency: number): ScoredNotification {
  const typeWeight = TYPE_WEIGHTS[n.Type] ?? 1;
  return { ...n, score: typeWeight * ALPHA + recency * BETA, typeWeight, recencyScore: recency };
}

async function main() {
  const topN = parseInt(process.argv[2] || "10", 10);
  bootstrapLogger();
  await Log("frontend", "info", "utils", `Priority Inbox starting, top ${topN}`);

  let token: string;
  try {
    token = await getAuthToken();
  } catch (err: any) {
    await Log("frontend", "fatal", "auth", `Auth failed: ${err.message}`);
    process.stderr.write(`FATAL: ${err.message}\n`);
    process.exit(1);
  }

  const notifications = await fetchAllNotifications(token);
  if (notifications.length === 0) {
    await Log("frontend", "warn", "utils", "No notifications found");
    process.stderr.write("No notifications found.\n");
    return;
  }

  const recencyMap = computeRecencyScores(notifications);
  const heap = new MinHeap<ScoredNotification>(topN);
  let seq = 0;

  for (const n of notifications) {
    const recency = recencyMap.get(n.ID) ?? 0;
    const scored = scoreNotification(n, recency);
    await Log("frontend", "debug", "utils", `id=${n.ID} type=${n.Type} score=${scored.score.toFixed(4)}`);
    heap.insert({ score: scored.score, sequence: seq++, data: scored });
  }

  const results = heap.extractSorted();
  await Log("frontend", "info", "utils", `Done, returning top ${results.length}`);

  process.stdout.write(`\n${"=".repeat(70)}\n  PRIORITY INBOX - Top ${topN}\n${"=".repeat(70)}\n\n`);
  results.forEach((n, i) => {
    process.stdout.write(
      `  #${i + 1} | ${n.Type} | score=${n.score.toFixed(4)} | ${n.Message}\n` +
      `       ${n.Timestamp} [typeW=${n.typeWeight}, recency=${n.recencyScore.toFixed(4)}]\n` +
      `  ${"-".repeat(66)}\n`
    );
  });
  process.stdout.write("\n");
}

main().catch(async (err) => {
  try { await Log("frontend", "fatal", "utils", `Unhandled: ${err.message}`); } catch { }
  process.stderr.write(`FATAL: ${err.message}\n`);
  process.exit(1);
});