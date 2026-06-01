import PptxGenJS from 'pptxgenjs';
import type { ReportData, Category } from './reportPptx';
import type { Post } from './api';

export interface ComprehensiveData extends ReportData {
  totalCaptured: number;
  showLogo: boolean;
  dailyCounts: Array<{ date: string; label: string; count: number }>;
  individualCount: number;
  companyCount: number;
  mediaBreakdown: { video: number; image: number; gif: number; none: number };
  extendedHighlights: Post[];
  allPosts: Post[];
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

  // Every single post, 2 per slide
  const sorted = [...data.allPosts].sort(
    (a, b) => new Date(b.posted_at ?? b.captured_at).getTime() - new Date(a.posted_at ?? a.captured_at).getTime(),
  );
  if (sorted.length > 0) {
    await addDetailSlides(pptx, data, sorted);
  }

  await pptx.writeFile({ fileName });
}

// ═══════════════════════════════════════════════════════════════════
//  HTML / PDF comprehensive report
// ═══════════════════════════════════════════════════════════════════

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function catColorCss(c: Category): string {
  return '#' + CAT_HEX[c];
}

function buildComprehensiveHtml(d: ComprehensiveData): string {
  const dir = d.isRtl ? 'rtl' : 'ltr';
  const isHijri = d.dateSystem === 'hijri';
  const primaryDate = isHijri ? d.hijriLabel : d.startLabel + ' — ' + d.endLabel;
  const secondaryDate = isHijri ? d.startLabel + ' — ' + d.endLabel : d.hijriLabel;

  const wowStr = d.wow === null ? '—' : (d.wow >= 0 ? '↑' : '↓') + Math.abs(d.wow) + '%';
  const wowColor = d.wow === null ? '#1a1511' : d.wow >= 0 ? '#038061' : '#d95e4a';

  const kpis = [
    { v: d.totalCaptured.toString(), l: d.labels.kpiTotalCaptured },
    { v: d.total.toString(), l: d.labels.kpiTotal },
    { v: wowStr, l: d.isRtl ? 'مقارنة بالأسبوع الماضي' : d.labels.kpiWow, color: wowColor },
    { v: d.busiestLabel || '—', l: d.labels.kpiPeak, small: true },
    { v: d.uniqueHandles.toString(), l: d.labels.kpiUnique },
  ];

  // ── Category bars ──
  const activeCategories = d.categoryOrder.filter(c => (d.categoryCounts[c] ?? 0) > 0);
  const maxCat = Math.max(1, ...activeCategories.map(c => d.categoryCounts[c] ?? 0));
  let catHtml = '';
  for (const c of activeCategories) {
    const n = d.categoryCounts[c] ?? 0;
    const pct = d.total > 0 ? Math.round((n / d.total) * 100) : 0;
    const w = Math.round((n / maxCat) * 100);
    catHtml += `<div class="bar-row">
      <span class="bar-label">${esc(d.categoryLabels[c])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${catColorCss(c)}"></div></div>
      <span class="bar-val">${n}</span>
      <span class="bar-pct">${pct}%</span>
    </div>`;
  }

  // ── Top voices ──
  let voicesHtml = '';
  for (let i = 0; i < Math.min(5, d.topVoices.length); i++) {
    const v = d.topVoices[i]!;
    const catBadge = v.category
      ? `<span class="cat-badge" style="background:${catColorCss(v.category)}">${esc(d.categoryLabels[v.category])}</span>`
      : '';
    voicesHtml += `<div class="voice-row">
      <span class="voice-num">${i + 1}</span>
      <span class="voice-handle">${esc(v.handle)}</span>
      ${catBadge}
      <span class="voice-count">${v.n}</span>
    </div>`;
  }

  // ── Top hashtags ──
  let hashtagsHtml = '';
  const maxTag = Math.max(1, ...d.topHashtags.map(tc => tc.count));
  for (let i = 0; i < Math.min(8, d.topHashtags.length); i++) {
    const tc = d.topHashtags[i]!;
    const w = Math.round((tc.count / maxTag) * 100);
    hashtagsHtml += `<div class="bar-row">
      <span class="voice-num">${i + 1}</span>
      <span class="bar-label" style="width:80px">${esc(tc.tag)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:#d7a562"></div></div>
      <span class="bar-val">${tc.count}</span>
    </div>`;
  }

  // ── Highlight cards ──
  let highlightsHtml = '';
  for (const p of d.extendedHighlights.slice(0, 12)) {
    const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
    const text = (p.metadata?.text ?? '').slice(0, 120);
    const dateLabel = d.datePostedLabel(p);
    const imgUrl = p.screenshot_url ? toAbsoluteUrl(p.screenshot_url) : null;
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;
    const isVideo = p.latest_capture?.media === 'video';

    const imgInner = imgUrl
      ? `<img src="${esc(imgUrl)}" crossorigin="anonymous" class="card-img"/>`
      : `<div class="card-img-empty">—</div>`;
    const catBadge = cat
      ? `<span class="cat-badge" style="background:${catColorCss(cat)}">${esc(d.categoryLabels[cat])}</span>`
      : '';
    const videoBadge = isVideo
      ? `<span class="video-badge">▶ ${esc(d.comprehensiveLabels.video)}</span>`
      : '';

    highlightsHtml += `<div class="highlight-card">
      <div class="card-thumb">${imgInner}${videoBadge}</div>
      <div class="card-body">
        <div class="card-header">
          <span class="card-handle">${esc(handle)}</span>
          ${catBadge}
        </div>
        <span class="card-date">${esc(dateLabel)}</span>
        <p class="card-text">${esc(text)}</p>
        <a href="${esc(p.url)}" class="card-link" target="_blank">${esc(d.comprehensiveLabels.viewOriginal)}</a>
      </div>
    </div>`;
  }

  // ── All posts list ──
  const sorted = [...d.allPosts].sort(
    (a, b) => new Date(b.posted_at ?? b.captured_at).getTime() - new Date(a.posted_at ?? a.captured_at).getTime(),
  );
  let allPostsHtml = '';
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
    const fullText = p.metadata?.text ?? '—';
    const dateLabel = d.datePostedLabel(p);
    const imgUrl = p.screenshot_url ? toAbsoluteUrl(p.screenshot_url) : null;
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;
    const isVideo = p.latest_capture?.media === 'video';

    const imgInner = imgUrl
      ? `<img src="${esc(imgUrl)}" crossorigin="anonymous" class="post-img"/>`
      : `<div class="post-img-empty">${esc(d.labels.noScreenshot)}</div>`;
    const catBadge = cat
      ? `<span class="cat-badge" style="background:${catColorCss(cat)}">${esc(d.categoryLabels[cat])}</span>`
      : '';
    const videoBadge = isVideo
      ? `<span class="video-badge-sm">▶ ${esc(d.comprehensiveLabels.video)}</span>`
      : '';

    allPostsHtml += `<div class="post-row">
      <div class="post-num">${i + 1}</div>
      <div class="post-thumb">${imgInner}${videoBadge}</div>
      <div class="post-content">
        <div class="post-header">
          <span class="post-handle">${esc(handle)}</span>
          ${catBadge}
          <span class="post-date">${esc(dateLabel)}</span>
        </div>
        <p class="post-text">${esc(fullText)}</p>
        <a href="${esc(p.url)}" class="card-link" target="_blank">🔗 ${esc(d.comprehensiveLabels.viewOriginal)} — ${esc(p.url)}</a>
      </div>
    </div>`;
  }

  // ── SVG Doughnut chart helper ──
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

  // ── SVG Bar chart helper ──
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

  // ── Build chart HTML ──
  const catChartSegments = activeCategories.map(c => ({
    value: d.categoryCounts[c] ?? 0,
    color: catColorCss(c),
    label: d.categoryLabels[c],
  }));
  const originChartSegments = [
    { value: d.individualCount, color: '#70A3C2', label: d.comprehensiveLabels.individual },
    { value: d.companyCount, color: '#d7a562', label: d.comprehensiveLabels.company },
  ].filter(s => s.value > 0);
  const dailyBars = d.dailyCounts.map(dc => ({ label: dc.label.split(' ')[0] ?? dc.label, value: dc.count }));

  return `<!DOCTYPE html>
<html lang="${d.isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(d.labels.brand)} — ${d.isRtl ? 'التقرير الشامل' : 'Comprehensive Report'}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;background:#f5ede3;color:#1a1511;line-height:1.4}
.page{width:210mm;min-height:297mm;background:#faf6f0;margin:0 auto 8px;padding:14mm 16mm;position:relative;display:flex;flex-direction:column}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{margin:0!important;padding:0!important;background:#faf6f0!important}
  .page{width:100%!important;min-height:auto!important;margin:0!important;padding:12mm 14mm!important;page-break-after:always}
  .page:last-child{page-break-after:avoid}
  .no-print{display:none!important}
}

h1{font-size:20px;font-weight:800;color:#1a1511;margin:0}
h2{font-size:16px;font-weight:700;color:#174766;margin:16px 0 8px;display:flex;align-items:center;gap:6px}
h2::before{content:'';width:14px;height:2px;background:#d7a562;border-radius:1px;flex-shrink:0}
.subtitle{font-size:10px;color:#8a7e72;margin-top:2px}
.gold{color:#d7a562}
.divider{height:1px;background:linear-gradient(90deg,transparent,#d7a562,transparent);opacity:0.4;margin:10px 0}
.header{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:6px}
.date-card{background:rgba(255,255,255,0.5);border:0.5px solid rgba(215,165,98,0.1);border-radius:8px;padding:6px 14px;text-align:start}
.date-primary{font-size:13px;font-weight:700;color:#1a1511}
.date-secondary{font-size:10px;color:#8a7e72}
.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}
.kpi{background:rgba(255,255,255,0.5);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 6px;text-align:center}
.kpi-val{font-size:20px;font-weight:700;line-height:1}
.kpi-label{font-size:8px;font-weight:600;color:#8a7e72;margin-top:4px}
.panels{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:8px 0}
.panel{background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px}
.panel-title{font-size:10px;font-weight:700;color:#174766;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid rgba(215,165,98,0.1);display:flex;align-items:center;gap:4px}
.panel-title::before{content:'';width:4px;height:4px;border-radius:50%;background:#d7a562;flex-shrink:0}
.bar-row{display:flex;align-items:center;gap:4px;margin-bottom:3px}
.bar-label{width:55px;font-size:9px;font-weight:600;color:#8a7e72;flex-shrink:0}
.bar-track{flex:1;height:6px;border-radius:3px;background:#ebe0d0;overflow:hidden}
.bar-fill{height:100%;border-radius:3px}
.bar-val{width:20px;font-size:10px;font-weight:700;color:#1a1511;text-align:end;flex-shrink:0}
.bar-pct{width:24px;font-size:8px;color:#8a7e72;text-align:end;flex-shrink:0}
.voice-row{display:flex;align-items:center;gap:5px;margin-bottom:3px}
.voice-num{width:16px;height:16px;border-radius:50%;background:rgba(215,165,98,0.1);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#d7a562;flex-shrink:0}
.voice-handle{flex:1;font-size:10px;font-weight:600;color:#1a1511;direction:ltr;text-align:start;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.voice-count{font-size:11px;font-weight:700;color:#1a1511;flex-shrink:0}
.cat-badge{font-size:7px;font-weight:700;padding:1px 6px;border-radius:3px;color:#fff;flex-shrink:0}
.video-badge-sm{position:absolute;bottom:4px;${d.isRtl ? 'left' : 'right'}:4px;font-size:7px;font-weight:700;padding:1px 5px;border-radius:3px;background:#c0392b;color:#fff}
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.chart-panel{background:rgba(255,255,255,0.45);border:0.5px solid rgba(215,165,98,0.06);border-radius:8px;padding:8px 10px}
.post-row{display:flex;gap:10px;padding:8px 0;border-bottom:0.5px solid rgba(215,165,98,0.1);break-inside:avoid;page-break-inside:avoid}
.post-num{width:24px;height:24px;border-radius:6px;background:#d7a562;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.post-thumb{width:130px;height:90px;border-radius:6px;overflow:hidden;flex-shrink:0;background:#ebe0d0;position:relative}
.post-img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.post-img-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#8a7e72}
.post-content{flex:1;min-width:0}
.post-header{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px}
.post-handle{font-size:11px;font-weight:700;color:#1a1511;direction:ltr}
.post-date{font-size:9px;color:#8a7e72;margin-inline-start:auto}
.post-text{font-size:9px;line-height:1.4;color:#1a1511;margin:3px 0}
.card-link{font-size:7px;font-weight:700;color:#174766;text-decoration:none;margin-top:2px}
.card-link:hover{text-decoration:underline}
</style>
</head>
<body>

<!-- ═══ PAGE 1: Executive Summary ═══ -->
<div class="page">
  <div class="header">
    <div>
      <div class="gold" style="font-size:14px;font-weight:800;letter-spacing:1px">${d.isRtl ? 'التفاعل الإعلامي لبطاقة نسك' : 'Nusuk Card Media Coverage'}</div>
      <h1>${esc(d.labels.execSummaryDated)}</h1>
      <div class="subtitle">${d.isRtl ? 'بطاقة نسك - مسار التوعية و التدريب' : 'Nusuk Card — Awareness & Training Track'}</div>
    </div>
    <div class="date-card">
      <div style="font-size:7px;color:#8a7e72;font-weight:600;letter-spacing:1px;text-transform:uppercase">${esc(d.labels.period)}</div>
      <div class="date-primary">${esc(primaryDate)}</div>
      <div class="date-secondary">${esc(secondaryDate)}</div>
    </div>
  </div>
  <div class="divider"></div>

  <div class="kpi-grid">
    ${kpis.map(k => `<div class="kpi">
      <div class="kpi-val" style="color:${k.color || '#1a1511'};${k.small ? 'font-size:14px' : ''}">${esc(k.v)}</div>
      <div class="kpi-label">${esc(k.l)}</div>
    </div>`).join('')}
  </div>

  <div style="background:rgba(255,255,255,0.4);border-radius:6px;padding:8px 10px;margin:6px 0">
    <div style="font-size:9px;font-weight:700;color:#d7a562;margin-bottom:2px">${esc(d.labels.headline)}</div>
    <div style="font-size:10px;color:#1a1511">${esc(d.headline)}</div>
  </div>

  <div class="panels">
    <div class="panel">
      <div class="panel-title">${esc(d.labels.categories)}</div>
      ${catHtml}
    </div>
    <div class="panel">
      <div class="panel-title">${esc(d.labels.topVoices)}</div>
      ${voicesHtml}
    </div>
    <div class="panel">
      <div class="panel-title">${esc(d.labels.topHashtags)}</div>
      ${hashtagsHtml}
    </div>
  </div>
</div>

<!-- ═══ PAGE 2: Charts & Analysis ═══ -->
<div class="page">
  <h2>${esc(d.comprehensiveLabels.coverageAnalysis)}</h2>
  <div class="divider"></div>

  <div class="charts-row">
    <div class="chart-panel">
      <div class="panel-title">${esc(d.comprehensiveLabels.categoryDistribution)}</div>
      ${svgDoughnut(catChartSegments, 120)}
    </div>
    <div class="chart-panel">
      <div class="panel-title">${esc(d.comprehensiveLabels.originBreakdown)}</div>
      ${svgDoughnut(originChartSegments, 120)}
    </div>
  </div>

  <div class="chart-panel" style="margin:8px 0">
    <div class="panel-title">${esc(d.comprehensiveLabels.dailyTrend)}</div>
    ${svgBarChart(dailyBars, 500, 140)}
  </div>

  ${d.mediaBreakdown.video > 0 || d.mediaBreakdown.gif > 0 ? `
  <div class="chart-panel" style="margin:8px 0">
    <div class="panel-title">${esc(d.comprehensiveLabels.mediaBreakdown)}</div>
    ${svgDoughnut([
      { value: d.mediaBreakdown.image, color: '#174766', label: d.isRtl ? 'صور' : 'Images' },
      { value: d.mediaBreakdown.video, color: '#c0392b', label: d.comprehensiveLabels.video },
      ...(d.mediaBreakdown.gif > 0 ? [{ value: d.mediaBreakdown.gif, color: '#d7a562', label: 'GIF' }] : []),
      ...(d.mediaBreakdown.none > 0 ? [{ value: d.mediaBreakdown.none, color: '#8a7e72', label: d.isRtl ? 'نص فقط' : 'Text only' }] : []),
    ].filter(s => s.value > 0), 100)}
  </div>` : ''}

  <div class="panels" style="margin-top:10px">
    <div class="panel" style="grid-column:span 2">
      <div class="panel-title">${esc(d.labels.topHashtags)}</div>
      ${hashtagsHtml}
    </div>
    <div class="panel">
      <div class="panel-title">${esc(d.labels.topVoices)}</div>
      ${voicesHtml}
    </div>
  </div>
</div>

<!-- ═══ PAGES 3+: All Posts ═══ -->
<div class="page">
  <h2>${esc(d.comprehensiveLabels.allCoverage)}</h2>
  <div class="subtitle" style="margin-bottom:8px">${sorted.length} ${d.isRtl ? 'منشور' : 'posts'} · ${esc(primaryDate)}</div>
  <div class="divider"></div>
  ${allPostsHtml}
</div>

</body>
</html>`;
}

export async function openComprehensivePreview(data: ComprehensiveData): Promise<void> {
  const html = buildComprehensiveHtml(data);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
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
