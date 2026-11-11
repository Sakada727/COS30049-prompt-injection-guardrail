const API_ROOT = `${import.meta.env.VITE_API_URL ?? ""}/api`;
export const DOCS_URL = `${import.meta.env.VITE_API_URL ?? ""}/docs`;

export const DEFAULT_MAX_CHARS = 8000;

const SESSION_KEY = "pig-session-id";

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readStored() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

//Random ID per browser tab so the back end can keep each tab's history separate
let sessionId = readStored() || newId();

function store(id) {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    return;
  }
}
store(sessionId);

export function startNewSession() {
  sessionId = newId();
  store(sessionId);
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "network", retryAfter = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function messageFrom(data, status) {
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  if (status === 413) return "That message is too large to send.";
  if (status >= 500) return "The guardrail hit an unexpected problem. Try again in a moment.";
  return `The request failed (status ${status}).`;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId, ...options.headers },
    });
  } catch {
    throw new ApiError("Can't reach the guardrail. Check that the back end is running, then try again.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const retry = Number(res.headers.get("Retry-After"));
    throw new ApiError(messageFrom(data, res.status), {
      status: res.status,
      code: data?.error?.code ?? `http_${res.status}`,
      retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null,
    });
  }
  return data;
}

export function checkPrompt(text) {
  return request("/check", { method: "POST", body: JSON.stringify({ text }) });
}

export async function getHistory() {
  const data = await request("/history");
  return data.items;
}

export function clearHistory() {
  return request("/history", { method: "DELETE" });
}

export function getHealth() {
  return request("/health");
}

export function injectionChance(label, confidence) {
  return label === "blocked" ? confidence : 1 - confidence;
}

export const THRESHOLD = 0.5;
