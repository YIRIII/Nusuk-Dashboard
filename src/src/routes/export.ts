import { Router } from 'express';
import archiver from 'archiver';
import ExcelJS from 'exceljs';
import { getSupabase } from '../db/supabase.js';
import { downloadScreenshot } from '../db/storage.js';
import { logger } from '../logger.js';
import type { PostRow, CompanyRow, CaptureRow } from '../db/types.js';

interface JoinedRow extends PostRow {
  _company?: CompanyRow | null;
  _latest_capture?: CaptureRow | null;
}

async function fetchRows(ids: string[] | null): Promise<JoinedRow[]> {
  const sb = getSupabase();
  let query = sb.from('posts').select('*').is('deleted_at', null);
  if (ids && ids.length > 0) query = query.in('id', ids);
  const posts = await query;
  if (posts.error) throw new Error('export fetch failed: ' + posts.error.message);

  const rows = (posts.data ?? []) as PostRow[];
  if (rows.length === 0) return [];

  const companyIds = [...new Set(rows.map((r) => r.company_id).filter((x): x is string => !!x))];
  const companies =
    companyIds.length > 0
      ? ((await sb.from('companies').select('*').in('id', companyIds)).data ?? [])
      : [];
  const companyById = new Map(companies.map((c) => [c.id, c as CompanyRow]));

  const captures =
    ((
      await sb
        .from('captures')
        .select('*')
        .in('post_id', rows.map((r) => r.id))
        .eq('success', true)
        .order('created_at', { ascending: false })
    ).data ?? []) as CaptureRow[];
  const latestByPost = new Map<string, CaptureRow>();
  for (const c of captures) {
    if (!latestByPost.has(c.post_id)) latestByPost.set(c.post_id, c);
  }

  return rows.map((r) => ({
    ...r,
    _company: (r.company_id && companyById.get(r.company_id)) || null,
    _latest_capture: latestByPost.get(r.id) ?? null,
  }));
}

function parseIds(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function exportRouter(): Router {
  const router = Router();

  router.get('/export/xlsx', async (req, res) => {
    try {
      const ids = parseIds(req.query['ids']);
      const rows = await fetchRows(ids);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Hadaq Tracker';
      wb.created = new Date();

      const ws = wb.addWorksheet('Posts', {
        views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
      });

      ws.columns = [
        { header: 'Captured at', key: 'captured_at', width: 22 },
        { header: 'Posted at', key: 'posted_at', width: 22 },
        { header: 'Kind', key: 'kind', width: 10 },
        { header: 'Origin', key: 'origin', width: 12 },
        { header: 'Company', key: 'company', width: 24 },
        { header: 'Author name', key: 'author_name', width: 28 },
        { header: 'Author handle', key: 'author_handle', width: 22 },
        { header: 'Text / title', key: 'text', width: 80 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Reviewed', key: 'reviewed', width: 10 },
        { header: 'URL', key: 'url', width: 64 },
      ];
      ws.getRow(1).font = { bold: true };

      for (const r of rows) {
        const meta = r.metadata as {
          author_name?: string | null;
          author_handle?: string | null;
          text?: string | null;
        };
        ws.addRow({
          captured_at: r.captured_at,
          posted_at: r.posted_at,
          kind: r.kind,
          origin: r.origin,
          company: r._company ? r._company.name_ar + ' / ' + r._company.name_en : '',
          author_name: meta.author_name ?? '',
          author_handle: meta.author_handle ?? '',
          text: r.title_override ?? meta.text ?? '',
          notes: r.notes ?? '',
          reviewed: r.reviewed ? 'yes' : 'no',
          url: r.url,
        });
      }

      const buf = await wb.xlsx.writeBuffer();
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'content-disposition',
        'attachment; filename="hadaq-posts-' + stamp + '.xlsx"',
      );
      res.end(Buffer.from(buf));
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'xlsx export failed');
      res
        .status(500)
        .json({ error: 'export_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.get('/export/zip', async (req, res) => {
    try {
      const ids = parseIds(req.query['ids']);
      const rows = await fetchRows(ids);

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('content-type', 'application/zip');
      res.setHeader(
        'content-disposition',
        'attachment; filename="hadaq-archive-' + stamp + '.zip"',
      );

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (err: Error) => {
        logger.error({ err, trace_id: req.traceId }, 'archive stream error');
      });
      archive.pipe(res);

      const manifest = rows.map((r) => {
        const meta = r.metadata as Record<string, unknown>;
        return {
          id: r.id,
          url: r.url,
          kind: r.kind,
          origin: r.origin,
          company: r._company
            ? { id: r._company.id, name_ar: r._company.name_ar, name_en: r._company.name_en }
            : null,
          reviewed: r.reviewed,
          posted_at: r.posted_at,
          captured_at: r.captured_at,
          title_override: r.title_override,
          notes: r.notes,
          metadata: meta,
          screenshot: r._latest_capture
            ? 'screenshots/' + r.id + '.png'
            : null,
        };
      });

      archive.append(JSON.stringify(manifest, null, 2), { name: 'metadata.json' });
      archive.append(
        'Hadaq Tracker — archive generated ' +
          new Date().toISOString() +
          '\nPosts: ' +
          rows.length +
          '\n',
        { name: 'manifest.txt' },
      );

      // Stream each screenshot in; on error we log and skip (partial archive
      // is better than a total failure).
      for (const r of rows) {
        if (!r._latest_capture) continue;
        try {
          const buf = await downloadScreenshot(r._latest_capture.storage_path);
          archive.append(buf, { name: 'screenshots/' + r.id + '.png' });
        } catch (err) {
          logger.warn(
            { err, post_id: r.id, trace_id: req.traceId },
            'screenshot missing from archive',
          );
        }
      }

      await archive.finalize();
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'zip export failed');
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: 'export_failed', trace_id: req.traceId, message: (err as Error).message });
      }
    }
  });

  return router;
}
