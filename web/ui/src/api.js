const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:4789";

export function assetUrl(relativePath, workId) {
  if (!relativePath) return "";
  const encoded = relativePath.split("/").map(encodeURIComponent).join("/");
  const query = workId ? `?workId=${encodeURIComponent(workId)}` : "";
  return `${API_BASE}/work-assets/${encoded}${query}`;
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  return parseResponse(response);
}

export async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}
