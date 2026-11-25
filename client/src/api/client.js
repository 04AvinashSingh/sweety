export async function api(path, options = {}) {
  const token = localStorage.getItem("sweety-token");
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    if (
      response.status === 401 &&
      token &&
      localStorage.getItem("sweety-token") === token
    ) {
      localStorage.removeItem("sweety-token");
      window.dispatchEvent(new Event("sweety-signout"));
    }
    throw new Error(data.message || "Request failed.");
  }
  return data;
}
