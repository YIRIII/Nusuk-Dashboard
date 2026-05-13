import PptxGenJS from 'pptxgenjs';
import type { ReportData, Category } from './reportPptx';

export interface PosterData extends ReportData {
  totalCaptured: number;
  showLogo: boolean;
}

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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildPosterHtml(data: PosterData, screenshotUrls: Map<string, string>): string {
  const dir = data.isRtl ? 'rtl' : 'ltr';
  const isHijri = data.dateSystem === 'hijri';
  const primaryDate = isHijri ? data.hijriLabel : data.startLabel + ' — ' + data.endLabel;
  const secondaryDate = isHijri ? data.startLabel + ' — ' + data.endLabel : data.hijriLabel;

  const wowStr = data.wow === null ? '—' : (data.wow >= 0 ? '↑' : '↓') + Math.abs(data.wow) + '%';
  const wowColor = data.wow === null ? '#1a1511' : data.wow >= 0 ? '#038061' : '#d95e4a';

  const kpis = [
    { v: data.totalCaptured.toString(), l: data.labels.kpiTotalCaptured },
    { v: data.total.toString(), l: data.labels.kpiTotal },
    { v: wowStr, l: data.isRtl ? 'مقارنة بالأسبوع الماضي' : data.labels.kpiWow, color: wowColor },
    { v: data.busiestLabel || '—', l: data.labels.kpiPeak, small: true },
    { v: data.uniqueHandles.toString(), l: data.labels.kpiUnique },
  ];

  const activeCategories = data.categoryOrder.filter(c => (data.categoryCounts[c] ?? 0) > 0);
  const maxCat = Math.max(1, ...activeCategories.map(c => data.categoryCounts[c] ?? 0));

  let catHtml = '';
  for (const c of activeCategories) {
    const n = data.categoryCounts[c] ?? 0;
    const pct = data.total > 0 ? Math.round((n / data.total) * 100) : 0;
    const w = Math.round((n / maxCat) * 100);
    catHtml += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
      <span style="width:50px;font-size:9px;font-weight:600;color:#8a7e72">${esc(data.categoryLabels[c])}</span>
      <div style="flex:1;height:7px;border-radius:3px;background:#ebe0d0;overflow:hidden"><div style="height:100%;border-radius:3px;width:${w}%;background:#${CAT_HEX[c]};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div></div>
      <span style="width:20px;font-size:10px;font-weight:700;color:#1a1511;text-align:end">${n}</span>
      <span style="width:24px;font-size:8px;color:#8a7e72;text-align:end">${pct}%</span>
    </div>`;
  }

  let voicesHtml = '';
  for (let i = 0; i < Math.min(5, data.topVoices.length); i++) {
    const v = data.topVoices[i]!;
    voicesHtml += `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;padding:1px 0">
      <span style="width:16px;height:16px;border-radius:50%;background:rgba(215,165,98,0.1);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#d7a562;flex-shrink:0">${i + 1}</span>
      <span style="flex:1;font-size:10px;font-weight:600;color:#1a1511;direction:ltr;text-align:start;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(v.handle)}</span>
      <span style="font-size:11px;font-weight:700;color:#1a1511">${v.n}</span>
    </div>`;
  }

  let hashtagsHtml = '';
  for (let i = 0; i < Math.min(5, data.topHashtags.length); i++) {
    const tc = data.topHashtags[i]!;
    hashtagsHtml += `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;padding:1px 0">
      <span style="width:16px;height:16px;border-radius:50%;background:rgba(215,165,98,0.1);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#d7a562;flex-shrink:0">${i + 1}</span>
      <span style="flex:1;font-size:10px;font-weight:600;color:#1a1511;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(tc.tag)}</span>
      <span style="font-size:11px;font-weight:700;color:#1a1511">${tc.count}</span>
    </div>`;
  }

  let highlightsHtml = '';
  for (const p of data.highlights.slice(0, 6)) {
    const handle = p.metadata?.author_handle ?? '';
    const text = (p.metadata?.text ?? '').slice(0, 80);
    const dateLabel = data.datePostedLabel(p);
    const imgUrl = p.screenshot_url ? (screenshotUrls.get(p.id) ?? toAbsoluteUrl(p.screenshot_url)) : null;
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;

    const thumbInner = imgUrl
      ? `<img src="${esc(imgUrl)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:top"/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;opacity:0.15">📸</div>`;

    const catBadge = cat
      ? `<span style="font-size:7px;font-weight:600;padding:1px 5px;border-radius:3px;background:rgba(215,165,98,0.1);color:#d7a562;flex-shrink:0">${esc(data.categoryLabels[cat])}</span>`
      : '';

    highlightsHtml += `<div style="background:rgba(255,255,255,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:8px;overflow:hidden;border:0.5px solid rgba(215,165,98,0.06);display:flex;flex-direction:column;height:100%;min-height:0">
      <div style="flex:1;min-height:0;overflow:hidden;background:#ebe0d0">${thumbInner}</div>
      <div style="padding:4px 8px 5px;display:flex;flex-direction:column;gap:1px;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:3px">
          <span style="font-size:9px;font-weight:700;color:#1a1511;direction:ltr;text-align:start">${esc(handle || p.metadata?.author_name || '—')}</span>
          ${catBadge}
        </div>
        <span style="font-size:8px;color:#8a7e72">${esc(dateLabel)}</span>
        <p style="font-size:8px;line-height:1.3;color:#1a1511;opacity:0.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:1px 0 0">${esc(text)}</p>
      </div>
    </div>`;
  }

  const logoSvg = `<svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 15 A35 35 0 0 0 22 25" stroke="#d7a562" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/>
    <path d="M50 15 A35 35 0 0 1 78 25" stroke="#d7a562" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/>
    <path d="M50 28C32 28 18 50 18 50C18 50 32 72 50 72C68 72 82 50 82 50C82 50 68 28 50 28Z" stroke="#d7a562" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="12" stroke="#d7a562" stroke-width="2"/>
    <circle cx="50" cy="50" r="4.5" fill="#d7a562"/>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="${data.isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(data.labels.execSummaryDated)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;background:#f5ede3;display:flex;justify-content:center;align-items:start;min-height:100vh;padding:0}
.poster{width:100%;max-width:595px;background:#faf6f0;margin:0 auto;display:flex;flex-direction:column}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{margin:0!important;padding:0!important;background:#faf6f0!important;width:100%!important;height:100%!important;overflow:hidden!important}
  .poster{max-width:100%!important;width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden!important;margin:0!important}
}
</style>
</head>
<body>
<div class="poster">
  <div style="padding:12px 20px 8px;position:relative">
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,rgba(215,165,98,0.08) 0%,transparent 60%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;position:relative">
      ${data.showLogo ? `<div style="display:flex;align-items:center;gap:10px">
        ${logoSvg}
        <div>
          <div style="font-size:16px;font-weight:700;color:#1a1511;line-height:1.2">${data.isRtl ? 'منصة حَدَق' : 'Hadaq Platform'}</div>
          <div style="font-size:8px;font-weight:600;color:#d7a562;letter-spacing:2px">${data.isRtl ? 'HADAQ PLATFORM' : 'منصة حَدَق'}</div>
        </div>
      </div>` : '<div></div>'}
      <div style="background:rgba(255,255,255,0.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:0.5px solid rgba(215,165,98,0.1);border-radius:8px;padding:5px 12px;text-align:start">
        <div style="font-size:7px;color:#8a7e72;font-weight:600;letter-spacing:1px;text-transform:uppercase">${esc(data.labels.period)}</div>
        <div style="font-size:12px;font-weight:700;color:#1a1511">${esc(primaryDate)}</div>
        <div style="font-size:9px;color:#8a7e72">${esc(secondaryDate)}</div>
      </div>
    </div>
    <div style="margin-top:4px;position:relative">
      <h1 style="font-size:18px;font-weight:700;color:#1a1511;line-height:1.2;margin:0">${esc(data.labels.execSummaryDated)}</h1>
      <p style="font-size:9px;color:#8a7e72;margin-top:1px">${data.isRtl ? 'بطاقة نسك - مسار التوعية و التدريب' : 'Nusuk Card — Awareness & Training Track'}</p>
    </div>
  </div>
  <div style="height:0.5px;margin:0 20px;background:linear-gradient(90deg,transparent,#d7a562,transparent);opacity:0.4"></div>
  <div style="padding:6px 18px 6px">
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
      ${kpis.map(k => `<div style="background:rgba(255,255,255,0.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:8px;padding:8px 6px 6px;text-align:center;border:0.5px solid rgba(215,165,98,0.06)">
        <div style="font-size:${k.small ? '14px' : '22px'};font-weight:700;color:${k.color || '#1a1511'};line-height:1;${k.small ? 'margin-top:3px' : ''}">${esc(k.v)}</div>
        <div style="font-size:8px;font-weight:600;color:#8a7e72;margin-top:3px;line-height:1.2">${esc(k.l)}</div>
      </div>`).join('')}
    </div>
  </div>
  <div style="padding:0 18px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      <div style="background:rgba(255,255,255,0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:8px;padding:8px 10px;border:0.5px solid rgba(215,165,98,0.06)">
        <div style="font-size:10px;font-weight:700;color:#174766;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid rgba(215,165,98,0.1);display:flex;align-items:center;gap:4px"><span style="width:4px;height:4px;border-radius:50%;background:#d7a562;flex-shrink:0"></span>${esc(data.labels.categories)}</div>
        ${catHtml}
      </div>
      <div style="background:rgba(255,255,255,0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:8px;padding:8px 10px;border:0.5px solid rgba(215,165,98,0.06)">
        <div style="font-size:10px;font-weight:700;color:#174766;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid rgba(215,165,98,0.1);display:flex;align-items:center;gap:4px"><span style="width:4px;height:4px;border-radius:50%;background:#d7a562;flex-shrink:0"></span>${esc(data.labels.topVoices)}</div>
        ${voicesHtml}
      </div>
      <div style="background:rgba(255,255,255,0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:8px;padding:8px 10px;border:0.5px solid rgba(215,165,98,0.06)">
        <div style="font-size:10px;font-weight:700;color:#174766;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid rgba(215,165,98,0.1);display:flex;align-items:center;gap:4px"><span style="width:4px;height:4px;border-radius:50%;background:#d7a562;flex-shrink:0"></span>${esc(data.labels.topHashtags)}</div>
        ${hashtagsHtml}
      </div>
    </div>
  </div>
  <div style="padding:6px 18px 10px;flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">
    <div style="margin-bottom:4px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-size:12px;font-weight:700;color:#174766;display:flex;align-items:center;gap:6px;margin:0"><span style="width:16px;height:1.5px;background:#d7a562;border-radius:1px"></span>${esc(data.labels.highlights)}</h3>
        <span style="font-size:9px;color:#8a7e72">${data.highlights.length} ${data.isRtl ? 'منشورات' : 'posts'}</span>
      </div>
      <p style="font-size:8px;color:#8a7e72;margin:2px 0 0 22px">${esc(data.labels.highlightsDesc)}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:6px;flex:1;min-height:0">
      ${highlightsHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return window.location.origin + url;
}

export async function openPosterPreview(data: PosterData): Promise<void> {
  const screenshotUrls = new Map<string, string>();
  for (const p of data.highlights.slice(0, 6)) {
    if (p.screenshot_url) screenshotUrls.set(p.id, toAbsoluteUrl(p.screenshot_url));
  }

  const html = buildPosterHtml(data, screenshotUrls);
  const win = window.open('', '_blank');
  if (win) {
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
      await new Promise((r) => setTimeout(r, 300));
    }
    win.print();
  }
}

export async function buildPosterPptx(data: PosterData, fileName: string): Promise<void> {
  const FONT_T = 'Abar Mid';
  const FONT = 'Abar Mid Light';

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.title = data.labels.brand + ' — ' + data.labels.execSummary;

  const s = pptx.addSlide();
  s.background = { color: 'FAF6F0' };

  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: 'D7A562', width: 0.15, transparency: 94 };

  // --- Header ---
  s.addText(data.isRtl ? 'التفاعل الإعلامي لبطاقة نسك' : 'Nusuk Card Media Coverage', {
    x: 7.20, y: 0.25, w: 5.56, h: 0.64,
    fontSize: 32, bold: true, color: 'D7A562', align: 'right', fontFace: FONT_T,
  });

  s.addText(data.labels.execSummaryDated, {
    x: 10.42, y: 1.10, w: 2.78, h: 0.64,
    fontSize: 14, bold: true, color: '1A1511', align: 'right', fontFace: FONT,
  });

  s.addText(data.isRtl ? 'بطاقة نسك - مسار التوعية و التدريب' : 'Nusuk Card — Awareness & Training Track', {
    x: 0.21, y: 1.13, w: 7.43, h: 0.33,
    fontSize: 16, color: '2B130A', fontFace: FONT,
  });

  // Gold divider
  s.addShape('line', {
    x: 0.89, y: 2.93, w: 11.87, h: 0,
    line: { color: 'D7A562', width: 0.5 },
  });

  // --- KPI tiles ---
  const wowStr = data.wow === null ? '—' : (data.wow >= 0 ? '↑ ' : '↓ ') + Math.abs(data.wow) + '%';
  const kpis = [
    { v: data.totalCaptured.toString(), l: data.labels.kpiTotalCaptured, c: '1A1511' },
    { v: data.total.toString(), l: data.labels.kpiTotal, c: '1A1511' },
    { v: wowStr, l: data.isRtl ? 'مقارنة بالأسبوع الماضي' : data.labels.kpiWow, c: data.wow === null ? '1A1511' : data.wow >= 0 ? '038061' : 'D95E4A' },
    { v: data.busiestLabel || '—', l: data.labels.kpiPeak, c: '1A1511' },
    { v: data.uniqueHandles.toString(), l: data.labels.kpiUnique, c: '1A1511' },
  ];
  const kpiXs = [1.83, 3.88, 5.93, 7.98, 10.03];
  const kpiW = 1.93;
  const kpiH = 1.09;
  kpis.forEach((k, i) => {
    const x = kpiXs[i]!;
    s.addShape('rect', { x, y: 1.77, w: kpiW, h: kpiH, fill: { color: 'FFFFFF' }, line: panelLine, rectRadius: 0.05 });
    s.addText(k.v, {
      x: x + 0.07, y: 1.79, w: kpiW - 0.14, h: 0.64,
      fontSize: 24, bold: true, color: k.c, align: 'center', fontFace: FONT, shrinkText: true,
    });
    s.addText(k.l, {
      x: x + 0.07, y: 2.41, w: kpiW - 0.14, h: 0.40,
      fontSize: 10, bold: true, color: '8A7E72', align: 'center', fontFace: FONT, shrinkText: true,
    });
  });

  // --- Category panel ---
  const catX = 1.55;
  const catY = 2.99;
  const catW = 2.78;
  const catH = 1.85;
  s.addShape('rect', { x: catX, y: catY, w: catW, h: catH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.categories, { x: catX + 0.52, y: catY + 0.06, w: 2.16, h: 0.24, fontSize: 10.5, bold: true, color: '174766', fontFace: FONT });

  const activeCategories = data.categoryOrder.filter(c => (data.categoryCounts[c] ?? 0) > 0);
  const maxCat = Math.max(1, ...activeCategories.map(c => data.categoryCounts[c] ?? 0));
  const barTrackW = 0.70;
  activeCategories.forEach((c, i) => {
    const n = data.categoryCounts[c] ?? 0;
    const pct = data.total > 0 ? Math.round((n / data.total) * 100) : 0;
    const rowY = catY + 0.38 + i * 0.262;
    s.addText(data.categoryLabels[c], { x: catX + 0.12, y: rowY, w: 0.99, h: 0.22, fontSize: 9, color: '8A7E72', fontFace: FONT });
    s.addShape('rect', { x: catX + 1.16, y: rowY + 0.07, w: barTrackW, h: 0.072, fill: { color: 'D7A562', transparency: 92 }, rectRadius: 0.03 });
    const barW = Math.max(0.02, (n / maxCat) * barTrackW);
    s.addShape('rect', { x: catX + 1.16, y: rowY + 0.07, w: barW, h: 0.072, fill: { color: CAT_HEX[c] }, rectRadius: 0.03 });
    s.addText(n.toString(), { x: catX + 1.92, y: rowY, w: 0.45, h: 0.22, fontSize: 10, bold: true, color: '1A1511', align: 'right', fontFace: FONT });
    s.addText(pct + '%', { x: catX + 2.25, y: rowY, w: 0.50, h: 0.22, fontSize: 9, color: '8A7E72', align: 'right', fontFace: FONT });
  });

  // --- Voices panel ---
  const vX = 5.59;
  const vW = 2.51;
  const vH = 1.93;
  s.addShape('rect', { x: vX, y: catY, w: vW, h: vH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.topVoices, { x: vX + 0.12, y: catY + 0.06, w: 2.28, h: 0.25, fontSize: 10.5, bold: true, color: '174766', fontFace: FONT });
  data.topVoices.slice(0, 5).forEach((v, i) => {
    const rowY = catY + 0.40 + i * 0.274;
    s.addText((i + 1).toString(), { x: vX + 0.12, y: rowY, w: 0.17, h: 0.22, fontSize: 8, bold: true, color: 'D7A562', align: 'center', fontFace: FONT });
    s.addText(v.handle, { x: vX + 0.35, y: rowY, w: 1.60, h: 0.22, fontSize: 10, bold: true, color: '1A1511', fontFace: FONT });
    s.addText(v.n.toString(), { x: vX + 2.06, y: rowY, w: 0.29, h: 0.22, fontSize: 10, bold: true, color: '1A1511', align: 'right', fontFace: FONT });
  });

  // --- Hashtags panel ---
  const hX = 9.59;
  const hW = 2.70;
  const hH = 1.97;
  s.addShape('rect', { x: hX, y: catY - 0.02, w: hW, h: hH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.topHashtags, { x: hX + 0.11, y: catY + 0.05, w: 2.27, h: 0.26, fontSize: 10.5, bold: true, color: '174766', fontFace: FONT });
  data.topHashtags.slice(0, 5).forEach((tc, i) => {
    const rowY = catY + 0.39 + i * 0.280;
    s.addText((i + 1).toString(), { x: hX + 0.11, y: rowY, w: 0.17, h: 0.23, fontSize: 8, bold: true, color: 'D7A562', align: 'center', fontFace: FONT });
    s.addText(tc.tag, { x: hX + 0.34, y: rowY, w: 1.59, h: 0.23, fontSize: 10, bold: true, color: '1A1511', fontFace: FONT });
    s.addText(tc.count.toString(), { x: hX + 2.04, y: rowY, w: 0.55, h: 0.23, fontSize: 10, bold: true, color: '1A1511', align: 'right', fontFace: FONT });
  });

  // --- Highlights header ---
  s.addText(data.labels.highlights, { x: 0.17, y: 4.77, w: 2.82, h: 0.14, fontSize: 10, bold: true, color: '174766', fontFace: FONT });
  s.addText(data.labels.highlightsDesc, { x: 0.17, y: 4.93, w: 2.82, h: 0.11, fontSize: 8, color: '8A7E72', fontFace: FONT });

  // --- Highlight cards (6 in one row, RTL order) ---
  const imgPromises = data.highlights.slice(0, 6).map(async (p) => {
    if (!p.screenshot_url) return { id: p.id, uri: null };
    const uri = await urlToDataUri(toAbsoluteUrl(p.screenshot_url));
    return { id: p.id, uri };
  });
  const imgs = await Promise.all(imgPromises);
  const imgMap = new Map(imgs.map(i => [i.id, i.uri]));

  const cardW = 1.517;
  const cardH = 1.764;
  const cardGap = 0.29;
  const cardY = 5.05;
  const cardStartX = 10.62;

  data.highlights.slice(0, 6).forEach((p, i) => {
    const x = cardStartX - i * (cardW + cardGap);
    const y = cardY;

    s.addShape('rect', { x, y, w: cardW, h: cardH, fill: panelBg, line: panelLine, rectRadius: 0.04 });

    const imgUri = imgMap.get(p.id);
    if (imgUri) {
      s.addImage({ data: imgUri, x: x + 0.021, y: y + 0.022, w: 1.475, h: 0.952 });
    } else {
      s.addShape('rect', { x: x + 0.021, y: y + 0.022, w: 1.475, h: 0.952, fill: { color: 'F5EDE3' }, rectRadius: 0.03 });
      s.addText(data.labels.noScreenshot, { x: x + 0.021, y: y + 0.40, w: 1.475, h: 0.20, fontSize: 6, color: '8A7E72', align: 'center', fontFace: FONT });
    }

    const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
    const text = (p.metadata?.text ?? '').slice(0, 120);
    const dateStr = data.datePostedLabel(p);

    s.addText(handle, { x: x + 0.042, y: y + 1.00, w: 1.432, h: 0.127, fontSize: 7, bold: true, color: '1A1511', fontFace: FONT });
    s.addText(dateStr, { x: x + 0.042, y: y + 1.13, w: 1.432, h: 0.099, fontSize: 6, color: '8A7E72', fontFace: FONT });
    s.addText(text, { x: x + 0.042, y: y + 1.24, w: 1.432, h: 0.46, fontSize: 5, color: '1A1511', fontFace: FONT, shrinkText: true });
  });

  await pptx.writeFile({ fileName });
}
