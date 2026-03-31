import { pool } from "@/db";

export async function lockStoreSync<T>(
  storeId: string,
  callback: () => Promise<T>,
) {
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [storeId]);
    return await callback();
  } finally {
    try {
      await client.query("select pg_advisory_unlock(hashtext($1))", [storeId]);
    } finally {
      client.release();
    }
  }
}
