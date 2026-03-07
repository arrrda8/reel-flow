/**
 * Call a server action via the /api/actions proxy route.
 * This avoids Next.js RSC refresh that server actions trigger.
 */
export async function callAction<T = unknown>(
  action: string,
  ...args: unknown[]
): Promise<T> {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Action ${action} failed`);
  }

  return data.result as T;
}
