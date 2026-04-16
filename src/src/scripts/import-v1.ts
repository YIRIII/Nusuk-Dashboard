import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getSupabase } from '../db/supabase.js';
import { uploadScreenshot } from '../db/storage.js';
import { insertCapture, upsertPost, findLivePostByUrl } from '../db/posts.js';
import type { PostKind, MediaType, PostOrigin } from '../db/types.js';

// Load env from repo root
const HERE = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(HERE, '../../../.env'),
  resolve(HERE, '../../../../.env'),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

interface V1Post {
  id: string;
  url: string;
  source_type: 'tweet' | 'article' | string;
  category: 'company' | 'person' | string;
  poster_name: string | null;
  display_name: string | null;
  content: string | null;
  published_date: string | null;
  screenshot_path: string | null;
  notes: string | null;
  created_at: string;
  status: string;
  deleted_at: string | null;
}

async function main(): Promise<void> {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error('usage: import-v1 <backup-dir>');
    process.exit(1);
  }
  const jsonPath = resolve(backupDir, 'posts.json');
  if (!existsSync(jsonPath)) {
    console.error('posts.json not found at ' + jsonPath);
    process.exit(1);
  }
  const posts = JSON.parse(readFileSync(jsonPath, 'utf8')) as V1Post[];
  console.log('found ' + posts.length + ' posts in backup');

  const sb = getSupabase(); // eager validation of env
  void sb;

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of posts) {
    try {
      if (!p.url) {
        skipped++;
        continue;
      }
      const existing = await findLivePostByUrl(p.url);
      if (existing) {
        console.log('↻ skip (already exists): ' + p.url);
        skipped++;
        continue;
      }

      const kind: PostKind = p.source_type === 'article' ? 'article' : 'tweet';
      const origin: PostOrigin = p.category === 'company' ? 'company' : 'individual';
      const reviewed = p.status === 'reviewed';

      const { row: inserted } = await upsertPost({
        url: p.url,
        kind,
        metadata: {
          author_name: p.display_name,
          author_handle: p.poster_name,
          text: p.content,
          posted_at: p.published_date,
          final_url: p.url,
          imported_from_v1_id: p.id,
        },
        origin,
        company_id: null,
        posted_at: p.published_date,
      });

      // Apply fields that upsertPost doesn't set (reviewed, title_override, notes).
      const supa = getSupabase();
      await supa
        .from('posts')
        .update({
          reviewed,
          reviewed_at: reviewed ? new Date().toISOString() : null,
          title_override: p.display_name && p.content !== p.display_name ? p.display_name : null,
          notes: p.notes,
          deleted_at: p.deleted_at,
        })
        .eq('id', inserted.id);

      // Upload the screenshot (filenames in the backup are `{old_id}.png` in
      // either `companies/` or `persons/`).
      const folder = p.category === 'company' ? 'companies' : 'persons';
      const localScreenshot = resolve(backupDir, 'screenshots', folder, p.id + '.png');
      let uploadedPath: string | null = null;
      let bytes = 0;

      if (existsSync(localScreenshot)) {
        const buf = await readFile(localScreenshot);
        const captureId = randomUUID();
        const up = await uploadScreenshot(inserted.id, captureId, buf);
        uploadedPath = up.path;
        bytes = up.bytes;

        await insertCapture({
          id: captureId,
          post_id: inserted.id,
          media: ('image' as MediaType),
          stage: 'fxtwitter', // best-effort — v1 didn't track stage
          storage_path: uploadedPath,
          bytes,
          duration_ms: 0,
          success: true,
        });
      } else {
        console.log('  (no local screenshot for ' + p.id + ')');
      }

      imported++;
      console.log('✓ imported ' + (imported + skipped + failed) + '/' + posts.length + ' — ' + p.url);
    } catch (err) {
      failed++;
      console.error('✗ failed ' + p.url + ':', (err as Error).message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('import complete');
  console.log('  imported: ' + imported);
  console.log('  skipped (duplicates): ' + skipped);
  console.log('  failed: ' + failed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
