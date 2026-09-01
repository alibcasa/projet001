export async function openProjectFetch(path: string, init?: RequestInit) {
  const base = process.env.OPENPROJECT_URL;
  const token = process.env.OPENPROJECT_API_TOKEN;
  if (!base || !token) throw new Error("OpenProject non configuré");
  return fetch(`${base.replace(/\/$/, "")}/api/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`apikey:${token}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
