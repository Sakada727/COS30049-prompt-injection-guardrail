// Frontend/src/API/API.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function messageFromError(data, status) {
  const detail = data?.detail;

  // HTTPException: detail is a string
  if (typeof detail === "string") return detail;

  // FastAPI/Pydantic validation errors: detail is a list of { msg, loc, ... }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0].msg || "Invalid request.";
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return `Request failed (${status}).`;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    // Network error, backend down, or CORS blocked
    throw new Error("Could not reach the server. Please try again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    throw new Error(messageFromError(data, res.status));
  }
  return data;
}

// Returns { label, confidence }
export function checkMessage(text) {
  return request("/check", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// Returns { status, model_loaded }
export function healthCheck() {
  return request("/health");
}