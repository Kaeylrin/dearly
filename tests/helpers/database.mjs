import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

export async function createTestDatabase() {
  const db = new PGlite()
  // Supabase fixtures; only crypto byte generation is stubbed.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema extensions;
    create function extensions.gen_random_bytes(n int) returns bytea language sql as $$ select decode(string_agg(md5(random()::text), ''), 'hex') from generate_series(1, n) $$;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text, name text);
    alter table storage.objects enable row level security;
  `)
  for (const file of ['001_gifts.sql', '002_security.sql', '003_personal_gifting.sql']) {
    const sql = await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8')
    await db.exec(sql.replace('create extension if not exists pgcrypto with schema extensions;', ''))
  }
  return db
}
