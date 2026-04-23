import PptxGenJS from 'pptxgenjs';
import type { Post, CompanyCategory } from './api';
import type { TagCount } from './hashtags';

export type Category = CompanyCategory | 'unclassified';

export interface ReportData {
  startLabel: string;
  endLabel: string;
  hijriLabel: string;
  headline: string;
  total: number;
  wow: number | null;
  prevTotal: number;
  busiestLabel: string;
  busiestCount: number;
  uniqueHandles: number;
  categoryOrder: Category[];
  categoryCounts: Record<Category, number>;
  categoryPrevCounts: Record<Category, number>;
  categoryLabels: Record<Category, string>;
  topVoices: { handle: string; n: number; category: Category | null }[];
  topHashtags: TagCount[];
  highlights: Post[];
  datePostedLabel: (p: Post) => string;
  labels: {
    brand: string;
    execSummary: string;
    headline: string;
    kpiTotal: string;
    kpiWow: string;
    kpiPeak: string;
    kpiUnique: string;
    categories: string;
    topVoices: string;
    topHashtags: string;
    highlights: string;
    noScreenshot: string;
    period: string;
    originIndividual: string;
  };
  isRtl: boolean;
  dateSystem?: 'gregorian' | 'hijri';
}

// Category colors (hex, matches the web UI palette).
const CAT_HEX: Record<Category, string> = {
  inner: '10b981',
  outer: '0ea5e9',
  general: '8b5cf6',
  other: '71717a',
  unclassified: 'f43f5e',
};

// Fetch an image URL and return a base64 data URI so pptxgenjs can embed it
// without relying on the browser to proxy the download. Bounded by an 8s
// timeout so one slow/unreachable image can't block the whole export.
async function urlToDataUri(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(t);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pptx] skipping image', url, (err as Error).message);
    return null;
  }
}

export async function buildWeeklyPptx(data: ReportData, fileName: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[pptx] build starting', {
    total: data.total,
    highlights: data.highlights.length,
  });
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in, 16:9
  pptx.title = data.labels.brand + ' — ' + data.labels.execSummary;

  // ───── Slide 1: Executive Summary ─────
  const s1 = pptx.addSlide();
  s1.background = { color: 'FFFFFF' };

  // Brand line + title
  s1.addText(data.labels.brand.toUpperCase(), {
    x: 0.5,
    y: 0.35,
    w: 12,
    h: 0.3,
    fontSize: 10,
    color: '6b7280',
    bold: true,
    charSpacing: 2,
  });
  s1.addText(data.labels.execSummary, {
    x: 0.5,
    y: 0.65,
    w: 8,
    h: 0.6,
    fontSize: 26,
    bold: true,
    color: '0f172a',
  });
  // Period card (top right)
  s1.addShape('rect', {
    x: 9.2,
    y: 0.5,
    w: 3.6,
    h: 0.95,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 0.75 },
    rectRadius: 0.08,
  });
  s1.addText((data.labels.period || 'PERIOD').toUpperCase(), {
    x: 9.35,
    y: 0.55,
    w: 3.3,
    h: 0.22,
    fontSize: 8,
    bold: true,
    color: '64748b',
    charSpacing: 1.5,
    align: 'right',
  });
  const isHijri = data.dateSystem === 'hijri';
  const primaryDateLabel = isHijri ? data.hijriLabel : data.startLabel + '  —  ' + data.endLabel;
  const secondaryDateLabel = isHijri ? data.startLabel + '  —  ' + data.endLabel : data.hijriLabel;
  s1.addText(primaryDateLabel, {
    x: 9.35,
    y: 0.77,
    w: 3.3,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '0f172a',
    align: 'right',
  });
  s1.addText(secondaryDateLabel, {
    x: 9.35,
    y: 1.05,
    w: 3.3,
    h: 0.28,
    fontSize: 10,
    color: '64748b',
    align: 'right',
  });

  // Headline box
  s1.addShape('rect', {
    x: 0.5,
    y: 1.45,
    w: 12.33,
    h: 0.85,
    fill: { color: 'EEF2FF' },
    line: { color: 'C7D2FE', width: 0.75 },
  });
  s1.addText(data.labels.headline.toUpperCase(), {
    x: 0.7,
    y: 1.5,
    w: 11.9,
    h: 0.25,
    fontSize: 9,
    color: '6366f1',
    bold: true,
    charSpacing: 1.5,
  });
  s1.addText(data.headline, {
    x: 0.7,
    y: 1.75,
    w: 11.9,
    h: 0.55,
    fontSize: 13,
    color: '1e293b',
  });

  // 4 KPI tiles
  const tileY = 2.55;
  const tileH = 1.45;
  const tileW = 2.95;
  const gap = 0.15;
  const tiles: { v: string; l: string; s: string }[] = [
    {
      v: data.total.toString(),
      l: data.labels.kpiTotal,
      s: '',
    },
    {
      v:
        data.wow === null
          ? '—'
          : (data.wow >= 0 ? '↑ ' : '↓ ') + Math.abs(data.wow) + '%',
      l: data.labels.kpiWow,
      s: data.prevTotal > 0 ? '(' + data.prevTotal + ')' : '',
    },
    {
      v: data.busiestLabel || '—',
      l: data.labels.kpiPeak,
      s: data.busiestCount ? data.busiestCount + ' posts' : '',
    },
    {
      v: data.uniqueHandles.toString(),
      l: data.labels.kpiUnique,
      s: '',
    },
  ];
  tiles.forEach((tile, i) => {
    const x = 0.5 + i * (tileW + gap);
    s1.addShape('rect', {
      x,
      y: tileY,
      w: tileW,
      h: tileH,
      fill: { color: 'F8FAFC' },
      line: { color: 'E2E8F0', width: 0.75 },
      rectRadius: 0.08,
    });
    s1.addText(tile.v, {
      x: x + 0.15,
      y: tileY + 0.15,
      w: tileW - 0.3,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '0f172a',
    });
    s1.addText(tile.l, {
      x: x + 0.15,
      y: tileY + 0.9,
      w: tileW - 0.3,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: '334155',
    });
    if (tile.s) {
      s1.addText(tile.s, {
        x: x + 0.15,
        y: tileY + 1.17,
        w: tileW - 0.3,
        h: 0.25,
        fontSize: 9,
        color: '64748b',
      });
    }
  });

  // Category breakdown
  const panelY = 4.2;
  const panelH = 2.9;
  const leftX = 0.5;
  const leftW = 4.1;
  s1.addShape('rect', {
    x: leftX,
    y: panelY,
    w: leftW,
    h: panelH,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 0.75 },
    rectRadius: 0.08,
  });
  s1.addText(data.labels.categories, {
    x: leftX + 0.2,
    y: panelY + 0.15,
    w: leftW - 0.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: '0f172a',
  });
  const maxCount = Math.max(
    1,
    ...data.categoryOrder.map((c) => data.categoryCounts[c] ?? 0),
  );
  data.categoryOrder.forEach((c, i) => {
    const n = data.categoryCounts[c] ?? 0;
    const prev = data.categoryPrevCounts[c] ?? 0;
    const delta = n - prev;
    const pct = data.total > 0 ? Math.round((n / data.total) * 100) : 0;
    const rowY = panelY + 0.6 + i * 0.42;
    s1.addText(data.categoryLabels[c], {
      x: leftX + 0.2,
      y: rowY,
      w: 1.4,
      h: 0.3,
      fontSize: 10,
      color: '475569',
    });
    const barX = leftX + 1.65;
    const barW = 1.0;
    s1.addShape('rect', {
      x: barX,
      y: rowY + 0.08,
      w: barW,
      h: 0.18,
      fill: { color: 'E2E8F0' },
      line: { color: 'E2E8F0', width: 0 },
      rectRadius: 0.09,
    });
    s1.addShape('rect', {
      x: barX,
      y: rowY + 0.08,
      w: Math.max(0.02, (n / maxCount) * barW),
      h: 0.18,
      fill: { color: CAT_HEX[c] },
      line: { color: CAT_HEX[c], width: 0 },
      rectRadius: 0.09,
    });
    s1.addText(n.toString(), {
      x: leftX + 2.75,
      y: rowY,
      w: 0.4,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: '0f172a',
      align: 'right',
    });
    s1.addText(pct + '%', {
      x: leftX + 3.15,
      y: rowY,
      w: 0.55,
      h: 0.3,
      fontSize: 9,
      color: '64748b',
      align: 'right',
    });
    if (delta !== 0) {
      s1.addText((delta > 0 ? '+' : '') + delta, {
        x: leftX + 3.6,
        y: rowY,
        w: 0.4,
        h: 0.3,
        fontSize: 9,
        bold: true,
        color: delta > 0 ? '10b981' : 'ef4444',
        align: 'right',
      });
    }
  });

  // Top voices
  const midX = 4.75;
  const midW = 4.2;
  s1.addShape('rect', {
    x: midX,
    y: panelY,
    w: midW,
    h: panelH,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 0.75 },
    rectRadius: 0.08,
  });
  s1.addText(data.labels.topVoices, {
    x: midX + 0.2,
    y: panelY + 0.15,
    w: midW - 0.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: '0f172a',
  });
  if (data.topVoices.length === 0) {
    s1.addText('—', {
      x: midX + 0.2,
      y: panelY + 0.6,
      w: midW - 0.4,
      h: 0.3,
      fontSize: 10,
      color: '94a3b8',
    });
  } else {
    data.topVoices.forEach((v, i) => {
      const rowY = panelY + 0.6 + i * 0.42;
      s1.addText('#' + (i + 1), {
        x: midX + 0.2,
        y: rowY,
        w: 0.4,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: '64748b',
      });
      s1.addText(v.handle, {
        x: midX + 0.6,
        y: rowY,
        w: 2.0,
        h: 0.3,
        fontSize: 10,
        color: '0f172a',
      });
      if (v.category) {
        s1.addShape('rect', {
          x: midX + 2.6,
          y: rowY + 0.04,
          w: 0.9,
          h: 0.26,
          fill: { color: CAT_HEX[v.category] },
          line: { color: CAT_HEX[v.category], width: 0 },
          rectRadius: 0.06,
        });
        s1.addText(data.categoryLabels[v.category], {
          x: midX + 2.6,
          y: rowY + 0.02,
          w: 0.9,
          h: 0.3,
          fontSize: 8,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        });
      }
      s1.addText(v.n.toString(), {
        x: midX + 3.5,
        y: rowY,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: '0f172a',
        align: 'right',
      });
    });
  }

  // Top hashtags
  const tagX = 9.1;
  const tagW = 3.73;
  s1.addShape('rect', {
    x: tagX,
    y: panelY,
    w: tagW,
    h: panelH,
    fill: { color: 'F8FAFC' },
    line: { color: 'E2E8F0', width: 0.75 },
    rectRadius: 0.08,
  });
  s1.addText(data.labels.topHashtags, {
    x: tagX + 0.2,
    y: panelY + 0.15,
    w: tagW - 0.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: '0f172a',
  });
  if (data.topHashtags.length === 0) {
    s1.addText('—', {
      x: tagX + 0.2,
      y: panelY + 0.6,
      w: tagW - 0.4,
      h: 0.3,
      fontSize: 10,
      color: '94a3b8',
    });
  } else {
    const maxTag = Math.max(1, ...data.topHashtags.map((tc) => tc.count));
    data.topHashtags.slice(0, 5).forEach((tc, i) => {
      const rowY = panelY + 0.6 + i * 0.42;
      s1.addText(tc.tag, {
        x: tagX + 0.2,
        y: rowY,
        w: 1.8,
        h: 0.3,
        fontSize: 10,
        color: '6366f1',
      });
      const tBarX = tagX + 2.0;
      const tBarW = 1.0;
      s1.addShape('rect', {
        x: tBarX,
        y: rowY + 0.08,
        w: tBarW,
        h: 0.18,
        fill: { color: 'E2E8F0' },
        line: { color: 'E2E8F0', width: 0 },
        rectRadius: 0.09,
      });
      s1.addShape('rect', {
        x: tBarX,
        y: rowY + 0.08,
        w: Math.max(0.02, (tc.count / maxTag) * tBarW),
        h: 0.18,
        fill: { color: '6366f1' },
        line: { color: '6366f1', width: 0 },
        rectRadius: 0.09,
      });
      s1.addText(tc.count.toString(), {
        x: tagX + 3.0,
        y: rowY,
        w: 0.5,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: '0f172a',
        align: 'right',
      });
    });
  }

  // ───── Slide 2: Highlights grid ─────
  if (data.highlights.length > 0) {
    const s2 = pptx.addSlide();
    s2.background = { color: 'FFFFFF' };
    s2.addText(data.labels.highlights, {
      x: 0.5,
      y: 0.35,
      w: 8,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: '0f172a',
    });
    s2.addText(data.startLabel + '  —  ' + data.endLabel, {
      x: 8.5,
      y: 0.45,
      w: 4.4,
      h: 0.3,
      fontSize: 10,
      color: '6b7280',
      align: 'right',
    });

    // 3 columns × 2 rows
    const cardW = 4.1;
    const cardH = 3.0;
    const startX = 0.55;
    const startY = 1.15;
    const gapX = 0.1;
    const gapY = 0.15;

    // Preload images in parallel for speed.
    // eslint-disable-next-line no-console
    console.log('[pptx] fetching', data.highlights.length, 'screenshots');
    const t0 = Date.now();
    const dataUris = await Promise.all(
      data.highlights.map((p) => (p.screenshot_url ? urlToDataUri(p.screenshot_url) : null)),
    );
    // eslint-disable-next-line no-console
    console.log(
      '[pptx] image fetch took',
      Date.now() - t0,
      'ms — ok:',
      dataUris.filter(Boolean).length,
      'missing:',
      dataUris.filter((u) => !u).length,
    );

    data.highlights.slice(0, 6).forEach((p, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      s2.addShape('rect', {
        x,
        y,
        w: cardW,
        h: cardH,
        fill: { color: 'FFFFFF' },
        line: { color: 'E2E8F0', width: 0.75 },
        rectRadius: 0.08,
      });

      const uri = dataUris[i];
      if (uri) {
        s2.addImage({
          data: uri,
          x: x + 0.1,
          y: y + 0.1,
          w: cardW - 0.2,
          h: 1.7,
          sizing: { type: 'cover', w: cardW - 0.2, h: 1.7 },
        });
      } else {
        s2.addShape('rect', {
          x: x + 0.1,
          y: y + 0.1,
          w: cardW - 0.2,
          h: 1.7,
          fill: { color: 'F1F5F9' },
          line: { color: 'F1F5F9', width: 0 },
          rectRadius: 0.04,
        });
        s2.addText(data.labels.noScreenshot, {
          x: x + 0.1,
          y: y + 0.7,
          w: cardW - 0.2,
          h: 0.4,
          fontSize: 10,
          color: '94a3b8',
          align: 'center',
        });
      }

      const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
      const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') : null;

      s2.addText(handle, {
        x: x + 0.15,
        y: y + 1.9,
        w: cardW - 1.3,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: '0f172a',
      });
      if (cat) {
        s2.addShape('rect', {
          x: x + cardW - 1.15,
          y: y + 1.95,
          w: 1.0,
          h: 0.26,
          fill: { color: CAT_HEX[cat as Category] },
          line: { color: CAT_HEX[cat as Category], width: 0 },
          rectRadius: 0.06,
        });
        s2.addText(data.categoryLabels[cat as Category], {
          x: x + cardW - 1.15,
          y: y + 1.93,
          w: 1.0,
          h: 0.3,
          fontSize: 8.5,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        });
      } else {
        s2.addShape('rect', {
          x: x + cardW - 1.15,
          y: y + 1.95,
          w: 1.0,
          h: 0.26,
          fill: { color: '0ea5e9' },
          line: { color: '0ea5e9', width: 0 },
          rectRadius: 0.06,
        });
        s2.addText(data.labels.originIndividual, {
          x: x + cardW - 1.15,
          y: y + 1.93,
          w: 1.0,
          h: 0.3,
          fontSize: 8.5,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        });
      }
      s2.addText(data.datePostedLabel(p), {
        x: x + 0.15,
        y: y + 2.2,
        w: cardW - 0.3,
        h: 0.25,
        fontSize: 9,
        color: '64748b',
      });
      const text = (p.metadata?.text ?? '').slice(0, 160);
      s2.addText(text || '—', {
        x: x + 0.15,
        y: y + 2.45,
        w: cardW - 0.3,
        h: 0.5,
        fontSize: 10,
        color: '334155',
      });
    });
  }

  // eslint-disable-next-line no-console
  console.log('[pptx] writing file', fileName);
  await pptx.writeFile({ fileName });
  // eslint-disable-next-line no-console
  console.log('[pptx] done');
}
