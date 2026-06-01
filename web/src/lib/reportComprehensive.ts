import PptxGenJS from 'pptxgenjs';
import type { ReportData, Category } from './reportPptx';
import type { Post } from './api';
import { buildPosterHtml, type PosterData } from './reportPoster';

export interface ComprehensiveData extends ReportData {
  totalCaptured: number;
  showLogo: boolean;
  dailyCounts: Array<{ date: string; label: string; count: number }>;
  individualCount: number;
  companyCount: number;
  mediaBreakdown: { video: number; image: number; gif: number; none: number };
  extendedHighlights: Post[];
  allPosts: Post[];
  hasManualSelection: boolean;
  highlightCount: number;
  comprehensiveLabels: {
    coverageAnalysis: string;
    dailyTrend: string;
    categoryDistribution: string;
    originBreakdown: string;
    moreCoverage: string;
    statistics: string;
    mediaBreakdown: string;
    video: string;
    individual: string;
    company: string;
    confidential: string;
    viewOriginal: string;
    allCoverage: string;
    pageOf: string;
  };
}

const GOLD = 'D7A562';
const BG = 'FAF6F0';
const TEXT = '1A1511';
const MUTED = '8A7E72';
const INDIGO = '174766';
const FONT_T = 'Abar Mid';
const FONT = 'Abar Mid Light';

const CAT_HEX: Record<Category, string> = {
  inner: '038061',
  outer: '70A3C2',
  general: '174766',
  other: '87452B',
  unclassified: 'A08060',
};

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
  } catch {
    return null;
  }
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return window.location.origin + url;
}

function addGoldDivider(s: PptxGenJS.Slide, y: number): void {
  s.addShape('line', {
    x: 0.5, y, w: 12.33, h: 0,
    line: { color: GOLD, width: 0.5, transparency: 60 },
  });
}

// ───── Slide 1: Executive Summary (poster theme) ─────
function addExecSummarySlide(pptx: PptxGenJS, d: ComprehensiveData): void {
  const s = pptx.addSlide();
  s.background = { color: BG };
  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: GOLD, width: 0.15, transparency: 94 };

  // Header
  s.addText(d.isRtl ? 'التفاعل الإعلامي لبطاقة نسك' : 'Nusuk Card Media Coverage', {
    x: 7.20, y: 0.25, w: 5.56, h: 0.64,
    fontSize: 32, bold: true, color: GOLD, align: 'right', fontFace: FONT_T,
  });

  s.addText(d.labels.execSummaryDated, {
    x: 10.42, y: 1.10, w: 2.78, h: 0.64,
    fontSize: 14, bold: true, color: TEXT, align: 'right', fontFace: FONT,
  });

  s.addText(d.isRtl ? 'بطاقة نسك - مسار التوعية و التدريب' : 'Nusuk Card — Awareness & Training Track', {
    x: 0.21, y: 1.13, w: 7.43, h: 0.33,
    fontSize: 16, color: '2B130A', fontFace: FONT,
  });

  addGoldDivider(s, 2.93);

  // KPI tiles
  const wowStr = d.wow === null ? '—' : (d.wow >= 0 ? '↑ ' : '↓ ') + Math.abs(d.wow) + '%';
  const kpis = [
    { v: d.totalCaptured.toString(), l: d.labels.kpiTotalCaptured, c: TEXT },
    { v: d.total.toString(), l: d.labels.kpiTotal, c: TEXT },
    { v: wowStr, l: d.isRtl ? 'مقارنة بالأسبوع الماضي' : d.labels.kpiWow, c: d.wow === null ? TEXT : d.wow >= 0 ? '038061' : 'D95E4A' },
    { v: d.busiestLabel || '—', l: d.labels.kpiPeak, c: TEXT },
    { v: d.uniqueHandles.toString(), l: d.labels.kpiUnique, c: TEXT },
  ];
  const kpiXs = [1.83, 3.88, 5.93, 7.98, 10.03];
  const kpiW = 1.93;
  kpis.forEach((k, i) => {
    const x = kpiXs[i]!;
    s.addShape('rect', { x, y: 1.77, w: kpiW, h: 1.09, fill: { color: 'FFFFFF' }, line: panelLine, rectRadius: 0.05 });
    s.addText(k.v, {
      x: x + 0.07, y: 1.79, w: kpiW - 0.14, h: 0.64,
      fontSize: 24, bold: true, color: k.c, align: 'center', fontFace: FONT, shrinkText: true,
    });
    s.addText(k.l, {
      x: x + 0.07, y: 2.41, w: kpiW - 0.14, h: 0.40,
      fontSize: 10, bold: true, color: MUTED, align: 'center', fontFace: FONT, shrinkText: true,
    });
  });

  // Category panel
  const catX = 1.55;
  const catY = 2.99;
  const catW = 2.78;
  s.addShape('rect', { x: catX, y: catY, w: catW, h: 1.85, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.categories, { x: catX + 0.52, y: catY + 0.06, w: 2.16, h: 0.24, fontSize: 10.5, bold: true, color: INDIGO, fontFace: FONT });

  const activeCategories = d.categoryOrder.filter(c => (d.categoryCounts[c] ?? 0) > 0);
  const maxCat = Math.max(1, ...activeCategories.map(c => d.categoryCounts[c] ?? 0));
  const barTrackW = 0.70;
  activeCategories.forEach((c, i) => {
    const n = d.categoryCounts[c] ?? 0;
    const pct = d.total > 0 ? Math.round((n / d.total) * 100) : 0;
    const rowY = catY + 0.38 + i * 0.262;
    s.addText(d.categoryLabels[c], { x: catX + 0.12, y: rowY, w: 0.99, h: 0.22, fontSize: 9, color: MUTED, fontFace: FONT });
    s.addShape('rect', { x: catX + 1.16, y: rowY + 0.07, w: barTrackW, h: 0.072, fill: { color: GOLD, transparency: 92 }, rectRadius: 0.03 });
    const barW = Math.max(0.02, (n / maxCat) * barTrackW);
    s.addShape('rect', { x: catX + 1.16, y: rowY + 0.07, w: barW, h: 0.072, fill: { color: CAT_HEX[c] }, rectRadius: 0.03 });
    s.addText(n.toString(), { x: catX + 1.92, y: rowY, w: 0.45, h: 0.22, fontSize: 10, bold: true, color: TEXT, align: 'right', fontFace: FONT });
    s.addText(pct + '%', { x: catX + 2.25, y: rowY, w: 0.50, h: 0.22, fontSize: 9, color: MUTED, align: 'right', fontFace: FONT });
  });

  // Voices panel
  const vX = 5.59;
  const vW = 2.51;
  s.addShape('rect', { x: vX, y: catY, w: vW, h: 1.93, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.topVoices, { x: vX + 0.12, y: catY + 0.06, w: 2.28, h: 0.25, fontSize: 10.5, bold: true, color: INDIGO, fontFace: FONT });
  d.topVoices.slice(0, 5).forEach((v, i) => {
    const rowY = catY + 0.40 + i * 0.274;
    s.addText((i + 1).toString(), { x: vX + 0.12, y: rowY, w: 0.17, h: 0.22, fontSize: 8, bold: true, color: GOLD, align: 'center', fontFace: FONT });
    s.addText(v.handle, { x: vX + 0.35, y: rowY, w: 1.60, h: 0.22, fontSize: 10, bold: true, color: TEXT, fontFace: FONT });
    s.addText(v.n.toString(), { x: vX + 2.06, y: rowY, w: 0.29, h: 0.22, fontSize: 10, bold: true, color: TEXT, align: 'right', fontFace: FONT });
  });

  // Hashtags panel
  const hX = 9.59;
  const hW = 2.70;
  s.addShape('rect', { x: hX, y: catY - 0.02, w: hW, h: 1.97, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.topHashtags, { x: hX + 0.11, y: catY + 0.05, w: 2.27, h: 0.26, fontSize: 10.5, bold: true, color: INDIGO, fontFace: FONT });
  d.topHashtags.slice(0, 5).forEach((tc, i) => {
    const rowY = catY + 0.39 + i * 0.280;
    s.addText((i + 1).toString(), { x: hX + 0.11, y: rowY, w: 0.17, h: 0.23, fontSize: 8, bold: true, color: GOLD, align: 'center', fontFace: FONT });
    s.addText(tc.tag, { x: hX + 0.34, y: rowY, w: 1.59, h: 0.23, fontSize: 10, bold: true, color: TEXT, fontFace: FONT });
    s.addText(tc.count.toString(), { x: hX + 2.04, y: rowY, w: 0.55, h: 0.23, fontSize: 10, bold: true, color: TEXT, align: 'right', fontFace: FONT });
  });

  // Headline text below panels
  s.addShape('rect', {
    x: 0.5, y: 5.10, w: 12.33, h: 0.70,
    fill: { color: 'FFFFFF', transparency: 50 },
    line: panelLine,
    rectRadius: 0.05,
  });
  s.addText(d.headline, {
    x: 0.7, y: 5.15, w: 11.93, h: 0.60,
    fontSize: 12, color: TEXT, fontFace: FONT,
  });

}

// ───── Slide 2: Media Coverage Analysis ─────
function addAnalysisSlide(pptx: PptxGenJS, d: ComprehensiveData): void {
  const s = pptx.addSlide();
  s.background = { color: BG };
  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: GOLD, width: 0.15, transparency: 94 };

  // Header
  s.addText(d.comprehensiveLabels.coverageAnalysis, {
    x: 0.5, y: 0.30, w: 12.33, h: 0.50,
    fontSize: 24, bold: true, color: INDIGO, fontFace: FONT_T,
  });
  addGoldDivider(s, 0.85);

  // Left: Daily trend bar chart
  s.addShape('rect', { x: 0.5, y: 1.05, w: 7.5, h: 4.2, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.comprehensiveLabels.dailyTrend, {
    x: 0.7, y: 1.15, w: 7.1, h: 0.30,
    fontSize: 12, bold: true, color: INDIGO, fontFace: FONT,
  });

  if (d.dailyCounts.length > 0) {
    const chartData = [{
      name: d.isRtl ? 'منشورات' : 'Posts',
      labels: d.dailyCounts.map(dc => dc.label),
      values: d.dailyCounts.map(dc => dc.count),
    }];
    s.addChart('bar' as const, chartData, {
      x: 0.7, y: 1.55, w: 7.1, h: 3.50,
      showTitle: false,
      showValue: true,
      dataLabelFontSize: 8,
      dataLabelColor: TEXT,
      catAxisLabelFontSize: 8,
      catAxisLabelColor: MUTED,
      valAxisHidden: true,
      catGridLine: { style: 'none' },
      valGridLine: { style: 'none' },
      chartColors: [GOLD],
      barGapWidthPct: 80,
    });
  } else {
    s.addText('—', { x: 2.5, y: 3.0, w: 3.0, h: 0.4, fontSize: 14, color: MUTED, align: 'center', fontFace: FONT });
  }

  // Right top: Category distribution pie chart
  s.addShape('rect', { x: 8.25, y: 1.05, w: 4.58, h: 2.0, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.comprehensiveLabels.categoryDistribution, {
    x: 8.45, y: 1.15, w: 4.18, h: 0.25,
    fontSize: 11, bold: true, color: INDIGO, fontFace: FONT,
  });

  const activeCats = d.categoryOrder.filter(c => (d.categoryCounts[c] ?? 0) > 0);
  if (activeCats.length > 0) {
    const pieData = [{
      name: d.isRtl ? 'فئة' : 'Category',
      labels: activeCats.map(c => d.categoryLabels[c]),
      values: activeCats.map(c => d.categoryCounts[c] ?? 0),
    }];
    s.addChart('doughnut' as const, pieData, {
      x: 8.35, y: 1.45, w: 4.38, h: 1.50,
      showTitle: false,
      showPercent: true,
      dataLabelFontSize: 8,
      dataLabelColor: TEXT,
      chartColors: activeCats.map(c => CAT_HEX[c]),
      showLegend: true,
      legendPos: 'r',
      legendFontSize: 8,
      legendColor: TEXT,
    });
  }

  // Right bottom: Origin breakdown
  s.addShape('rect', { x: 8.25, y: 3.25, w: 4.58, h: 2.0, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.comprehensiveLabels.originBreakdown, {
    x: 8.45, y: 3.35, w: 4.18, h: 0.25,
    fontSize: 11, bold: true, color: INDIGO, fontFace: FONT,
  });

  const totalOrigin = d.individualCount + d.companyCount;
  if (totalOrigin > 0) {
    const originData = [{
      name: d.isRtl ? 'مصدر' : 'Origin',
      labels: [d.comprehensiveLabels.individual, d.comprehensiveLabels.company],
      values: [d.individualCount, d.companyCount],
    }];
    s.addChart('doughnut' as const, originData, {
      x: 8.35, y: 3.65, w: 4.38, h: 1.50,
      showTitle: false,
      showPercent: true,
      dataLabelFontSize: 9,
      dataLabelColor: TEXT,
      chartColors: ['70A3C2', GOLD],
      showLegend: true,
      legendPos: 'r',
      legendFontSize: 9,
      legendColor: TEXT,
    });
  }

  // Media breakdown (if there are video/gif posts)
  const hasMedia = d.mediaBreakdown.video > 0 || d.mediaBreakdown.gif > 0;
  if (hasMedia) {
    s.addShape('rect', { x: 0.5, y: 5.45, w: 12.33, h: 0.60, fill: panelBg, line: panelLine, rectRadius: 0.05 });
    const parts: string[] = [];
    if (d.mediaBreakdown.image > 0) parts.push(`${d.isRtl ? 'صور' : 'Images'}: ${d.mediaBreakdown.image}`);
    if (d.mediaBreakdown.video > 0) parts.push(`${d.comprehensiveLabels.video}: ${d.mediaBreakdown.video}`);
    if (d.mediaBreakdown.gif > 0) parts.push(`GIF: ${d.mediaBreakdown.gif}`);
    if (d.mediaBreakdown.none > 0) parts.push(`${d.isRtl ? 'نص فقط' : 'Text only'}: ${d.mediaBreakdown.none}`);
    s.addText(d.comprehensiveLabels.mediaBreakdown + ':  ' + parts.join('   |   '), {
      x: 0.7, y: 5.50, w: 11.93, h: 0.50,
      fontSize: 11, color: TEXT, fontFace: FONT,
    });
  }

}

// ───── Highlights slide (reused for slides 3 & 4) ─────
async function addHighlightsSlide(
  pptx: PptxGenJS,
  d: ComprehensiveData,
  posts: Post[],
  title: string,
): Promise<void> {
  const s = pptx.addSlide();
  s.background = { color: BG };
  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: GOLD, width: 0.15, transparency: 94 };

  s.addText(title, {
    x: 0.5, y: 0.25, w: 10.0, h: 0.45,
    fontSize: 22, bold: true, color: INDIGO, fontFace: FONT_T,
  });
  s.addText(d.startLabel + '  —  ' + d.endLabel, {
    x: 8.5, y: 0.30, w: 4.4, h: 0.30,
    fontSize: 10, color: MUTED, align: 'right', fontFace: FONT,
  });
  addGoldDivider(s, 0.75);

  // Fetch images in parallel
  const dataUris = await Promise.all(
    posts.map((p) => {
      if (!p.screenshot_url) return null;
      return urlToDataUri(toAbsoluteUrl(p.screenshot_url));
    }),
  );

  // 3 columns x 2 rows
  const cardW = 3.95;
  const cardH = 3.0;
  const startX = 0.55;
  const startY = 0.95;
  const gapX = 0.18;
  const gapY = 0.15;

  posts.slice(0, 6).forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    s.addShape('rect', { x, y, w: cardW, h: cardH, fill: panelBg, line: panelLine, rectRadius: 0.05 });

    // Screenshot
    const uri = dataUris[i];
    if (uri) {
      s.addImage({
        data: uri,
        x: x + 0.06, y: y + 0.06, w: cardW - 0.12, h: 1.55,
        sizing: { type: 'cover', w: cardW - 0.12, h: 1.55 },
      });
    } else {
      s.addShape('rect', {
        x: x + 0.06, y: y + 0.06, w: cardW - 0.12, h: 1.55,
        fill: { color: 'F5EDE3' }, rectRadius: 0.03,
      });
      s.addText(d.labels.noScreenshot, {
        x: x + 0.06, y: y + 0.70, w: cardW - 0.12, h: 0.25,
        fontSize: 8, color: MUTED, align: 'center', fontFace: FONT,
      });
    }

    // Video badge
    const isVideo = p.latest_capture?.media === 'video';
    if (isVideo) {
      s.addShape('rect', {
        x: x + cardW - 0.80, y: y + 0.10, w: 0.70, h: 0.22,
        fill: { color: 'C0392B' }, rectRadius: 0.04,
      });
      s.addText('▶ ' + d.comprehensiveLabels.video, {
        x: x + cardW - 0.80, y: y + 0.08, w: 0.70, h: 0.26,
        fontSize: 7, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
      });
    }

    // Author handle
    const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;

    s.addText(handle, {
      x: x + 0.10, y: y + 1.68, w: cardW - 1.2, h: 0.25,
      fontSize: 10, bold: true, color: TEXT, fontFace: FONT,
    });

    // Category badge
    if (cat) {
      s.addShape('rect', {
        x: x + cardW - 1.05, y: y + 1.70, w: 0.95, h: 0.22,
        fill: { color: CAT_HEX[cat] }, rectRadius: 0.04,
      });
      s.addText(d.categoryLabels[cat], {
        x: x + cardW - 1.05, y: y + 1.68, w: 0.95, h: 0.26,
        fontSize: 7.5, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
      });
    }

    // Date
    s.addText(d.datePostedLabel(p), {
      x: x + 0.10, y: y + 1.93, w: cardW - 0.20, h: 0.20,
      fontSize: 8, color: MUTED, fontFace: FONT,
    });

    // Text snippet
    const text = (p.metadata?.text ?? '').slice(0, 140);
    s.addText(text || '—', {
      x: x + 0.10, y: y + 2.13, w: cardW - 0.20, h: 0.45,
      fontSize: 8, color: TEXT, fontFace: FONT, shrinkText: true,
    });

    // Link to original post
    s.addText(d.comprehensiveLabels.viewOriginal, {
      x: x + 0.10, y: y + 2.62, w: cardW - 0.20, h: 0.25,
      fontSize: 8, bold: true, color: INDIGO, fontFace: FONT,
      hyperlink: { url: p.url },
    });
  });

}

// ───── Slide 5: Summary & Statistics ─────
function addStatisticsSlide(pptx: PptxGenJS, d: ComprehensiveData): void {
  const s = pptx.addSlide();
  s.background = { color: BG };
  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: GOLD, width: 0.15, transparency: 94 };

  s.addText(d.comprehensiveLabels.statistics, {
    x: 0.5, y: 0.30, w: 12.33, h: 0.50,
    fontSize: 24, bold: true, color: INDIGO, fontFace: FONT_T,
  });
  addGoldDivider(s, 0.85);

  // Headline summary block
  s.addShape('rect', { x: 0.5, y: 1.10, w: 12.33, h: 1.20, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.headline, {
    x: 0.7, y: 1.15, w: 11.93, h: 0.25,
    fontSize: 10, bold: true, color: GOLD, fontFace: FONT,
  });
  s.addText(d.headline, {
    x: 0.7, y: 1.45, w: 11.93, h: 0.75,
    fontSize: 14, color: TEXT, fontFace: FONT,
  });

  // Top hashtags (expanded, with visual bars)
  s.addShape('rect', { x: 0.5, y: 2.55, w: 6.0, h: 3.80, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.topHashtags, {
    x: 0.7, y: 2.65, w: 5.6, h: 0.30,
    fontSize: 13, bold: true, color: INDIGO, fontFace: FONT,
  });

  const maxTag = Math.max(1, ...d.topHashtags.map(tc => tc.count));
  d.topHashtags.slice(0, 8).forEach((tc, i) => {
    const rowY = 3.10 + i * 0.38;
    s.addText((i + 1).toString(), {
      x: 0.7, y: rowY, w: 0.25, h: 0.28,
      fontSize: 9, bold: true, color: GOLD, align: 'center', fontFace: FONT,
    });
    s.addText(tc.tag, {
      x: 1.0, y: rowY, w: 2.2, h: 0.28,
      fontSize: 10, bold: true, color: TEXT, fontFace: FONT,
    });
    const barMaxW = 2.0;
    s.addShape('rect', { x: 3.3, y: rowY + 0.08, w: barMaxW, h: 0.10, fill: { color: GOLD, transparency: 88 }, rectRadius: 0.03 });
    const barW = Math.max(0.04, (tc.count / maxTag) * barMaxW);
    s.addShape('rect', { x: 3.3, y: rowY + 0.08, w: barW, h: 0.10, fill: { color: GOLD }, rectRadius: 0.03 });
    s.addText(tc.count.toString(), {
      x: 5.4, y: rowY, w: 0.8, h: 0.28,
      fontSize: 10, bold: true, color: TEXT, align: 'right', fontFace: FONT,
    });
  });

  // Top voices (expanded)
  s.addShape('rect', { x: 6.83, y: 2.55, w: 6.0, h: 3.80, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(d.labels.topVoices, {
    x: 7.03, y: 2.65, w: 5.6, h: 0.30,
    fontSize: 13, bold: true, color: INDIGO, fontFace: FONT,
  });

  d.topVoices.slice(0, 5).forEach((v, i) => {
    const rowY = 3.10 + i * 0.55;
    s.addText((i + 1).toString(), {
      x: 7.03, y: rowY, w: 0.25, h: 0.28,
      fontSize: 10, bold: true, color: GOLD, align: 'center', fontFace: FONT,
    });
    s.addText(v.handle, {
      x: 7.33, y: rowY, w: 3.0, h: 0.28,
      fontSize: 11, bold: true, color: TEXT, fontFace: FONT,
    });
    s.addText(v.n + (d.isRtl ? ' منشور' : ' posts'), {
      x: 10.43, y: rowY, w: 2.0, h: 0.28,
      fontSize: 10, color: MUTED, align: 'right', fontFace: FONT,
    });
    if (v.category) {
      s.addShape('rect', {
        x: 7.33, y: rowY + 0.30, w: 0.80, h: 0.18,
        fill: { color: CAT_HEX[v.category] }, rectRadius: 0.04,
      });
      s.addText(d.categoryLabels[v.category], {
        x: 7.33, y: rowY + 0.28, w: 0.80, h: 0.22,
        fontSize: 7, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
      });
    }
  });

}

// ───── Detail slides: 2 posts per slide, full text ─────
async function addDetailSlides(
  pptx: PptxGenJS,
  d: ComprehensiveData,
  posts: Post[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: GOLD, width: 0.15, transparency: 94 };
  const totalPages = Math.ceil(posts.length / 2);

  // Fetch all images in batches of 10 to avoid hammering the server
  const BATCH = 10;
  const allUris: (string | null)[] = new Array(posts.length).fill(null);
  for (let b = 0; b < posts.length; b += BATCH) {
    const batch = posts.slice(b, b + BATCH);
    const uris = await Promise.all(
      batch.map(p => {
        if (!p.screenshot_url) return null;
        return urlToDataUri(toAbsoluteUrl(p.screenshot_url));
      }),
    );
    uris.forEach((u, i) => { allUris[b + i] = u; });
    if (onProgress) onProgress(Math.min(b + BATCH, posts.length), posts.length);
  }

  for (let page = 0; page < totalPages; page++) {
    const s = pptx.addSlide();
    s.background = { color: BG };

    // Header
    s.addText(d.comprehensiveLabels.allCoverage, {
      x: 0.5, y: 0.20, w: 9.0, h: 0.40,
      fontSize: 18, bold: true, color: INDIGO, fontFace: FONT_T,
    });
    s.addText(
      d.comprehensiveLabels.pageOf
        .replace('{{page}}', (page + 1).toString())
        .replace('{{total}}', totalPages.toString()),
      {
        x: 9.5, y: 0.25, w: 3.33, h: 0.30,
        fontSize: 9, color: MUTED, align: 'right', fontFace: FONT,
      },
    );
    addGoldDivider(s, 0.65);

    // 2 posts on this slide
    const pair = posts.slice(page * 2, page * 2 + 2);
    pair.forEach((p, idx) => {
      const globalIdx = page * 2 + idx;
      const postNum = globalIdx + 1;
      const cardY = idx === 0 ? 0.80 : 3.95;
      const cardH = 2.95;

      // Card background
      s.addShape('rect', {
        x: 0.40, y: cardY, w: 12.53, h: cardH,
        fill: panelBg, line: panelLine, rectRadius: 0.05,
      });

      // Post number
      s.addShape('roundRect', {
        x: 0.55, y: cardY + 0.10, w: 0.40, h: 0.28,
        fill: { color: GOLD }, rectRadius: 0.06,
      });
      s.addText(postNum.toString(), {
        x: 0.55, y: cardY + 0.08, w: 0.40, h: 0.32,
        fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
      });

      // Screenshot (left side)
      const imgW = 4.0;
      const imgH = 2.55;
      const imgX = 0.55;
      const imgY = cardY + 0.45;
      const uri = allUris[globalIdx];
      if (uri) {
        s.addImage({
          data: uri,
          x: imgX, y: imgY, w: imgW, h: imgH,
          sizing: { type: 'cover', w: imgW, h: imgH },
        });
      } else {
        s.addShape('rect', {
          x: imgX, y: imgY, w: imgW, h: imgH,
          fill: { color: 'F5EDE3' }, rectRadius: 0.03,
        });
        s.addText(d.labels.noScreenshot, {
          x: imgX, y: imgY + 1.0, w: imgW, h: 0.30,
          fontSize: 9, color: MUTED, align: 'center', fontFace: FONT,
        });
      }

      // Video badge on screenshot
      if (p.latest_capture?.media === 'video') {
        s.addShape('rect', {
          x: imgX + imgW - 0.85, y: imgY + 0.08, w: 0.78, h: 0.24,
          fill: { color: 'C0392B' }, rectRadius: 0.04,
        });
        s.addText('▶ ' + d.comprehensiveLabels.video, {
          x: imgX + imgW - 0.85, y: imgY + 0.06, w: 0.78, h: 0.28,
          fontSize: 8, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
        });
      }

      // Right side: metadata + full text
      const textX = 4.75;
      const textW = 8.0;

      // Author handle
      const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
      s.addText(handle, {
        x: textX, y: cardY + 0.10, w: 5.0, h: 0.30,
        fontSize: 14, bold: true, color: TEXT, fontFace: FONT_T,
      });

      // Category badge
      const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;
      if (cat) {
        s.addShape('rect', {
          x: textX + 5.2, y: cardY + 0.14, w: 1.10, h: 0.24,
          fill: { color: CAT_HEX[cat] }, rectRadius: 0.04,
        });
        s.addText(d.categoryLabels[cat], {
          x: textX + 5.2, y: cardY + 0.12, w: 1.10, h: 0.28,
          fontSize: 8, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
        });
      }

      // Date
      s.addText(d.datePostedLabel(p), {
        x: textX, y: cardY + 0.42, w: textW, h: 0.22,
        fontSize: 9, color: MUTED, fontFace: FONT,
      });

      // Full post text
      const fullText = p.metadata?.text ?? '—';
      s.addText(fullText, {
        x: textX, y: cardY + 0.70, w: textW, h: 1.70,
        fontSize: 10, color: TEXT, fontFace: FONT,
        shrinkText: true,
        valign: 'top',
      });

      // Link to original
      s.addText('🔗 ' + d.comprehensiveLabels.viewOriginal + '  —  ' + p.url, {
        x: textX, y: cardY + 2.50, w: textW, h: 0.30,
        fontSize: 8, bold: true, color: INDIGO, fontFace: FONT,
        hyperlink: { url: p.url },
      });
    });

  }
}

// ───── Main entry ─────
export async function buildComprehensiveReport(data: ComprehensiveData, fileName: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.title = data.labels.brand + ' — ' + (data.isRtl ? 'التقرير الشامل' : 'Comprehensive Report');

  // Analysis section (3-4 slides)
  addExecSummarySlide(pptx, data);
  addAnalysisSlide(pptx, data);

  if (data.extendedHighlights.length > 0) {
    await addHighlightsSlide(pptx, data, data.extendedHighlights.slice(0, 6), data.labels.highlights);
  }
  if (data.extendedHighlights.length > 6) {
    await addHighlightsSlide(pptx, data, data.extendedHighlights.slice(6, 12), data.comprehensiveLabels.moreCoverage);
  }

  addStatisticsSlide(pptx, data);

  // Detail slides: if user selected specific posts, show only those;
  // otherwise show all posts in the date range.
  const detailPosts = data.hasManualSelection ? data.extendedHighlights : data.allPosts;
  const sorted = [...detailPosts].sort(
    (a, b) => new Date(b.posted_at ?? b.captured_at).getTime() - new Date(a.posted_at ?? a.captured_at).getTime(),
  );
  if (sorted.length > 0) {
    await addDetailSlides(pptx, data, sorted);
  }

  await pptx.writeFile({ fileName });
}


// ═══════════════════════════════════════════════════════════════════
//  HTML / PDF — poster page 1 + charts page 2 + highlights page 3
// ═══════════════════════════════════════════════════════════════════

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgDoughnut(segments: Array<{ value: number; color: string; label: string }>, size: number): string {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return '';
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const strokeW = size * 0.12;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let arcs = '';
  let legendHtml = '';
  for (const seg of segments) {
    const pct = seg.value / total;
    const dashLen = pct * circumference;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${strokeW}" stroke-dasharray="${dashLen} ${circumference - dashLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dashLen;
    legendHtml += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="width:8px;height:8px;border-radius:50%;background:${seg.color};flex-shrink:0"></span><span style="font-size:8px;color:#1a1511">${esc(seg.label)}</span><span style="font-size:8px;font-weight:700;color:#1a1511;margin-inline-start:auto">${seg.value} (${Math.round(pct * 100)}%)</span></div>`;
  }
  return `<div style="display:flex;align-items:center;gap:10px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${arcs}<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="font-size:${size * 0.14}px;font-weight:700;fill:#1a1511">${total}</text></svg><div style="flex:1">${legendHtml}</div></div>`;
}

function svgBarChart(bars: Array<{ label: string; value: number }>, width: number, height: number): string {
  if (bars.length === 0) return '';
  const maxVal = Math.max(1, ...bars.map(b => b.value));
  const barW = Math.min(30, (width - 20) / bars.length * 0.7);
  const gap = (width - 20 - barW * bars.length) / Math.max(1, bars.length - 1);
  const chartH = height - 30;
  let barsHtml = '';
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    const h = Math.max(2, (b.value / maxVal) * chartH);
    const x = 10 + i * (barW + gap);
    const y = chartH - h;
    barsHtml += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="#d7a562"/>`;
    barsHtml += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" style="font-size:7px;fill:#1a1511;font-weight:700">${b.value}</text>`;
    barsHtml += `<text x="${x + barW / 2}" y="${chartH + 12}" text-anchor="middle" style="font-size:6px;fill:#8a7e72">${esc(b.label)}</text>`;
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><line x1="10" y1="${chartH}" x2="${width - 10}" y2="${chartH}" stroke="#ebe0d0" stroke-width="0.5"/>${barsHtml}</svg>`;
}

export async function openComprehensivePreview(data: ComprehensiveData): Promise<void> {
  // Build poster HTML, then modify it:
  // 1. Allow multi-page printing (remove height/overflow clipping)
  // 2. Inject charts after panels section
  // 3. Replace 6-card grid with highlightCount cards + URLs
  const posterData: PosterData = {
    ...data,
    highlights: data.extendedHighlights.slice(0, data.highlightCount),
    totalCaptured: data.totalCaptured,
    showLogo: data.showLogo,
  };
  const screenshotUrls = new Map<string, string>();
  for (const p of posterData.highlights) {
    if (p.screenshot_url) {
      const abs = p.screenshot_url.startsWith('http') ? p.screenshot_url : window.location.origin + p.screenshot_url;
      screenshotUrls.set(p.id, abs);
    }
  }
  let fullHtml = buildPosterHtml(posterData, screenshotUrls);

  // Replace entire print CSS block to allow multi-page with proper margins
  fullHtml = fullHtml.replace(
    /@media print\{[^}]*@page\{[^}]*\}[^}]*html,body\{[^}]*\}[^}]*\.poster\{[^}]*\}\s*\}/,
    `@media print{
  @page{size:A4 portrait;margin:8mm 10mm}
  html,body{margin:0!important;padding:0!important;background:#faf6f0!important}
  .poster{max-width:100%!important;width:100%!important;margin:0 auto!important}
}`,
  );

  // Charts HTML to inject
  const activeCategories = data.categoryOrder.filter(c => (data.categoryCounts[c] ?? 0) > 0);
  const catChartSegments = activeCategories.map(c => ({
    value: data.categoryCounts[c] ?? 0,
    color: '#' + CAT_HEX[c],
    label: data.categoryLabels[c],
  }));
  const originChartSegments = [
    { value: data.individualCount, color: '#70A3C2', label: data.comprehensiveLabels.individual },
    { value: data.companyCount, color: '#d7a562', label: data.comprehensiveLabels.company },
  ].filter(s => s.value > 0);
  const dailyBars = data.dailyCounts.map(dc => ({ label: dc.label.split(' ')[0] ?? dc.label, value: dc.count }));

  const chartsHtml = `
  <div style="padding:0 18px 6px">
    <div style="height:0.5px;background:linear-gradient(90deg,transparent,#d7a562,transparent);opacity:0.4;margin:6px 0"></div>
    <div style="font-size:12px;font-weight:700;color:#174766;margin-bottom:6px;display:flex;align-items:center;gap:6px"><span style="width:16px;height:1.5px;background:#d7a562;border-radius:1px"></span>${esc(data.comprehensiveLabels.coverageAnalysis)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
      <div style="background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;color:#174766;margin-bottom:4px">${esc(data.comprehensiveLabels.categoryDistribution)}</div>
        ${svgDoughnut(catChartSegments, 100)}
      </div>
      <div style="background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;color:#174766;margin-bottom:4px">${esc(data.comprehensiveLabels.originBreakdown)}</div>
        ${svgDoughnut(originChartSegments, 100)}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:${data.mediaBreakdown.video > 0 || data.mediaBreakdown.gif > 0 ? '1fr 1fr' : '1fr'};gap:6px">
      <div style="background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;color:#174766;margin-bottom:4px">${esc(data.comprehensiveLabels.dailyTrend)}</div>
        ${svgBarChart(dailyBars, 250, 110)}
      </div>
      ${data.mediaBreakdown.video > 0 || data.mediaBreakdown.gif > 0 ? `
      <div style="background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;color:#174766;margin-bottom:4px">${esc(data.comprehensiveLabels.mediaBreakdown)}</div>
        ${svgDoughnut([
          { value: data.mediaBreakdown.image, color: '#174766', label: data.isRtl ? 'صور' : 'Images' },
          { value: data.mediaBreakdown.video, color: '#c0392b', label: data.comprehensiveLabels.video },
          ...(data.mediaBreakdown.gif > 0 ? [{ value: data.mediaBreakdown.gif, color: '#d7a562', label: 'GIF' }] : []),
          ...(data.mediaBreakdown.none > 0 ? [{ value: data.mediaBreakdown.none, color: '#8a7e72', label: data.isRtl ? 'نص فقط' : 'Text only' }] : []),
        ].filter(s => s.value > 0), 90)}
      </div>` : ''}
    </div>
  </div>`;

  // Inject charts after the panels section (before the highlights)
  // The panels end with </div>\n  </div>\n  <div style="padding:6px 18px 10px
  fullHtml = fullHtml.replace(
    '</div>\n  </div>\n  <div style="padding:6px 18px 10px',
    '</div>\n  </div>\n' + chartsHtml + '\n  <div style="padding:6px 18px 10px',
  );

  // Replace the poster's 6-card highlight grid with our N-card grid + URLs
  const hlPosts = [...data.extendedHighlights]
    .sort((a, b) => new Date(b.posted_at ?? b.captured_at).getTime() - new Date(a.posted_at ?? a.captured_at).getTime())
    .slice(0, data.highlightCount);
  const hlRows = Math.ceil(hlPosts.length / 3);

  let newCardsHtml = '';
  for (const p of hlPosts) {
    const handle = p.metadata?.author_handle ?? '';
    const text = (p.metadata?.text ?? '').slice(0, 80);
    const dateLabel = data.datePostedLabel(p);
    const imgUrl = p.screenshot_url ? (p.screenshot_url.startsWith('http') ? p.screenshot_url : window.location.origin + p.screenshot_url) : null;
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;
    const thumbInner = imgUrl
      ? `<img src="${esc(imgUrl)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:top"/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;opacity:0.15">\u{1F4F8}</div>`;
    const catBadge = cat
      ? `<span style="font-size:7px;font-weight:600;padding:1px 5px;border-radius:3px;background:rgba(215,165,98,0.1);color:#d7a562;flex-shrink:0">${esc(data.categoryLabels[cat])}</span>`
      : '';
    const isVideo = p.latest_capture?.media === 'video';
    const videoBadge = isVideo
      ? `<div style="position:absolute;top:3px;${data.isRtl ? 'left' : 'right'}:3px;font-size:7px;font-weight:700;padding:1px 5px;border-radius:3px;background:#c0392b;color:#fff">▶ ${esc(data.comprehensiveLabels.video)}</div>`
      : '';
    newCardsHtml += `<div style="background:rgba(255,255,255,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:8px;overflow:hidden;border:0.5px solid rgba(215,165,98,0.06);display:flex;flex-direction:column;height:100%;min-height:0">
      <div style="flex:1;min-height:0;overflow:hidden;background:#ebe0d0;position:relative">${thumbInner}${videoBadge}</div>
      <div style="padding:4px 8px 5px;display:flex;flex-direction:column;gap:1px;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:3px">
          <span style="font-size:9px;font-weight:700;color:#1a1511;direction:ltr;text-align:start">${esc(handle || p.metadata?.author_name || '—')}</span>
          ${catBadge}
        </div>
        <span style="font-size:8px;color:#8a7e72">${esc(dateLabel)}</span>
        <p style="font-size:8px;line-height:1.3;color:#1a1511;opacity:0.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:1px 0 0">${esc(text)}</p>
        <a href="${esc(p.url)}" target="_blank" style="font-size:7px;font-weight:700;color:#174766;text-decoration:none;margin-top:1px">${esc(data.comprehensiveLabels.viewOriginal)}</a>
      </div>
    </div>`;
  }

  const newGrid = `<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(${hlRows},1fr);gap:6px;flex:1;min-height:0">
      ${newCardsHtml}
    </div>`;

  // Replace the poster's highlight grid (find the grid div and everything inside it)
  fullHtml = fullHtml.replace(
    /<div style="display:grid;grid-template-columns:repeat\(3,1fr\);grid-template-rows:repeat\(2,1fr\);gap:6px;flex:1;min-height:0">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/,
    newGrid + '\n  </div>\n</div>\n</body>',
  );

  // Update the highlight count label
  fullHtml = fullHtml.replace(
    /(\d+) (منشورات|posts)/,
    hlPosts.length + ' $2',
  );

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(fullHtml);
  win.document.close();

  const imgs = win.document.querySelectorAll('img');
  if (imgs.length > 0) {
    const loaded = Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    );
    await Promise.all(loaded);
    await new Promise((r) => setTimeout(r, 500));
  }
  win.print();
}
