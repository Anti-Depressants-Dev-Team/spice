const fs = require('fs');

const filePath = 'apps/backend/lib/shared-playlists.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newCode = `
export async function getUsersInfo(userIds: string[]): Promise<Record<string, { username: string | null; displayName: string; avatarUrl: string | null }>> {
  if (userIds.length === 0) return {};

  const uniqueIds = Array.from(new Set(userIds));

  const [fetchedUsers, fetchedProfiles] = await Promise.all([
    db.query.users.findMany({ where: inArray(users.id, uniqueIds) }),
    db.query.profiles.findMany({
      where: and(inArray(profiles.userId, uniqueIds), eq(profiles.id, 'default')),
    }),
  ]);

  const userMap = new Map(fetchedUsers.map(u => [u.id, u]));
  const profileMap = new Map(fetchedProfiles.map(p => [p.userId, p]));

  const result: Record<string, { username: string | null; displayName: string; avatarUrl: string | null }> = {};

  for (const id of uniqueIds) {
    const user = userMap.get(id);
    const profile = profileMap.get(id);

    result[id] = {
      username: user?.username || null,
      displayName: profile?.displayName || user?.email || 'Unknown',
      avatarUrl: profile?.avatarUrl || null,
    };
  }

  return result;
}
`;

code = code.replace(/async function getUserInfo\([\s\S]*?\}\n/, newCode);

fs.writeFileSync(filePath, code);
