import axios from "axios";
import { Log } from "logging-middleware";
import { MinHeap } from "./min-heap";

const BASE_URL = "http://20.207.122.201/evaluation-service";
const ALPHA = 0.6;
const BETA = 0.4;
const TYPE_WEIGHTS: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };

export interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
  read?: boolean;
}

export interface ScoredNotification extends Notification {
  score: number;
}

async function getAuthToken(): Promise<string> {
  await Log("frontend", "info", "auth", "Requesting auth token");
  const res = await axios.post(`${BASE_URL}/auth`, {
    email: import.meta.env.VITE_EMAIL,
    name: import.meta.env.VITE_NAME,
    rollNo: import.meta.env.VITE_ROLL_NO,
    accessCode: import.meta.env.VITE_ACCESS_CODE,
    clientID: import.meta.env.VITE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_CLIENT_SECRET,
  });
  return res.data.access_token;
}

function parseNotifications(data: any): Notification[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.notifications)) return data.notifications;
  return [];
}

export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const token = await getAuthToken();
    const headers = { Authorization: `Bearer ${token}` };
    const all: Notification[] = [];
    
    await Log("frontend", "info", "api", "Fetching notifications");

    for (const type of ["Event", "Result", "Placement"]) {
      try {
        const res = await axios.get(`${BASE_URL}/notifications`, { headers, params: { notification_type: type } });
        all.push(...parseNotifications(res.data));
      } catch (e: any) {
        await Log("frontend", "error", "api", `Fetch failed for ${type}: ${e.message}`);
      }
    }

    try {
      const res = await axios.get(`${BASE_URL}/notifications`, { headers });
      const ids = new Set(all.map(n => n.ID));
      all.push(...parseNotifications(res.data).filter(n => !ids.has(n.ID)));
    } catch (e: any) {
      await Log("frontend", "warn", "api", `Unfiltered fetch failed: ${e.message}`);
    }

    return all;
  } catch (err: any) {
    await Log("frontend", "error", "api", `Failed to load notifications: ${err.message}`);
    return [];
  }
}

export function sortPriorityInbox(notifications: Notification[], topN: number = 10): ScoredNotification[] {
  if (!notifications.length) return [];
  
  const timestamps = notifications.map(n => new Date(n.Timestamp).getTime());
  const min = Math.min(...timestamps);
  const range = Math.max(...timestamps) - min;
  
  const heap = new MinHeap<ScoredNotification>(topN);

  notifications.forEach((n, i) => {
    const ts = new Date(n.Timestamp).getTime();
    const recency = range > 0 ? (ts - min) / range : 1.0;
    const typeWeight = TYPE_WEIGHTS[n.Type] ?? 1;
    const score = typeWeight * ALPHA + recency * BETA;
    
    heap.insert({ score, sequence: i, data: { ...n, score } });
  });

  return heap.extractSorted();
}
