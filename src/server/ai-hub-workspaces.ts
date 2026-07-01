import path from "node:path";

export type AiHubWorkspace = {
  name: string;
  path: string;
};

const cache = new Map<
  string,
  { expiresAt: number; workspaces: AiHubWorkspace[] }
>();

export function normalizeWorkspacePath(value: string): string {
  const normalized = path.resolve(value.replaceAll("\\", "/"));
  const root = path.parse(normalized).root;
  return normalized === root ? normalized : normalized.replace(/\/+$/, "");
}

export function isPathAllowed(
  candidate: string,
  allowlist: AiHubWorkspace[],
): boolean {
  const normalizedCandidate = normalizeWorkspacePath(candidate);
  return allowlist.some((workspace) => {
    const allowed = normalizeWorkspacePath(workspace.path);
    return (
      normalizedCandidate === allowed ||
      normalizedCandidate.startsWith(`${allowed}/`)
    );
  });
}

export async function getAiHubWorkspaces(
  memberId: string,
): Promise<AiHubWorkspace[]> {
  const now = Date.now();
  const cached = cache.get(memberId);
  if (cached && cached.expiresAt > now) return cached.workspaces;

  const url = process.env.AI_HUB_WORKSPACES_URL;
  const token = process.env.AI_HUB_INTERNAL_TOKEN;
  if (!url || !token) return [];

  const res = await fetch(url, {
    headers: {
      "X-Internal-Member-Id": memberId,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return [];

  const workspaces = (await res.json()) as AiHubWorkspace[];
  cache.set(memberId, { expiresAt: now + 60_000, workspaces });
  return workspaces;
}
