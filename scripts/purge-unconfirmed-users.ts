import { storage } from '../server/storage';

(async () => {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
  try {
    const unconfirmed = await storage.getAllUsers({ emailVerified: false });
    const toPurge = unconfirmed.filter(u => new Date(u.createdAt) < cutoff);

    for (const user of toPurge) {
      await storage.deleteUser(user.id);
      console.log(`Purged unconfirmed user ${user.id} (${user.email})`);
    }
    console.log(`Purged ${toPurge.length} unconfirmed users`);
  } catch (err) {
    console.error('Purge unconfirmed users error', err);
    process.exit(1);
  }
  process.exit(0);
})(); 