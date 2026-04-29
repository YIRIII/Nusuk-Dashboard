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

export function buildPosterHtml(data: PosterData, screenshotDataUris: Map<string, string>): string {
  const dir = data.isRtl ? 'rtl' : 'ltr';
  const isHijri = data.dateSystem === 'hijri';
  const primaryDate = isHijri ? data.hijriLabel : data.startLabel + ' — ' + data.endLabel;
  const secondaryDate = isHijri ? data.startLabel + ' — ' + data.endLabel : data.hijriLabel;

  const wowStr = data.wow === null ? '—' : (data.wow >= 0 ? '↑' : '↓') + Math.abs(data.wow) + '%';
  const wowColor = data.wow === null ? '#1a1511' : data.wow >= 0 ? '#038061' : '#d95e4a';

  const kpis = [
    { v: data.totalCaptured.toString(), l: data.isRtl ? 'إجمالي المرصود' : 'Total captured' },
    { v: data.total.toString(), l: data.labels.kpiTotal },
    { v: wowStr, l: data.isRtl ? 'مقارنة بالأسبوع الماضي' : data.labels.kpiWow, color: wowColor },
    { v: data.busiestLabel || '—', l: data.labels.kpiPeak, small: true },
    { v: data.uniqueHandles.toString(), l: data.labels.kpiUnique },
  ];

  const maxCat = Math.max(1, ...data.categoryOrder.map(c => data.categoryCounts[c] ?? 0));

  let catHtml = '';
  for (const c of data.categoryOrder) {
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
    const imgUri = p.screenshot_url ? screenshotDataUris.get(p.id) : null;
    const cat = p.origin === 'company' ? (p.company_category ?? 'unclassified') as Category : null;

    const thumbInner = imgUri
      ? `<img src="${imgUri}" style="width:100%;height:100%;object-fit:cover;object-position:top"/>`
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
<title>${esc(data.labels.execSummary)}</title>
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
      <div style="display:flex;align-items:center;gap:10px">
        ${data.showLogo ? logoSvg : ''}
        <div>
          <div style="font-size:16px;font-weight:700;color:#1a1511;line-height:1.2">${data.isRtl ? 'منصة حَدَق' : 'Hadaq Platform'}</div>
          <div style="font-size:8px;font-weight:600;color:#d7a562;letter-spacing:2px">${data.isRtl ? 'HADAQ PLATFORM' : 'منصة حَدَق'}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:0.5px solid rgba(215,165,98,0.1);border-radius:8px;padding:5px 12px;text-align:start">
        <div style="font-size:7px;color:#8a7e72;font-weight:600;letter-spacing:1px;text-transform:uppercase">${esc(data.labels.period)}</div>
        <div style="font-size:12px;font-weight:700;color:#1a1511">${esc(primaryDate)}</div>
        <div style="font-size:9px;color:#8a7e72">${esc(secondaryDate)}</div>
      </div>
    </div>
    <div style="margin-top:4px;position:relative">
      <h1 style="font-size:18px;font-weight:700;color:#1a1511;line-height:1.2;margin:0">${esc(data.labels.execSummary)}</h1>
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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <h3 style="font-size:12px;font-weight:700;color:#174766;display:flex;align-items:center;gap:6px;margin:0"><span style="width:16px;height:1.5px;background:#d7a562;border-radius:1px"></span>${esc(data.labels.highlights)}</h3>
      <span style="font-size:9px;color:#8a7e72">${data.highlights.length} ${data.isRtl ? 'منشورات' : 'posts'}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:6px;flex:1;min-height:0">
      ${highlightsHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function openPosterPreview(data: PosterData): Promise<void> {
  const screenshotUris = new Map<string, string>();
  const fetches = data.highlights.slice(0, 6).map(async (p) => {
    if (!p.screenshot_url) return;
    const uri = await urlToDataUri(p.screenshot_url);
    if (uri) screenshotUris.set(p.id, uri);
  });
  await Promise.all(fetches);

  const html = buildPosterHtml(data, screenshotUris);
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

export async function buildPosterPptx(data: PosterData, fileName: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'A4_PORTRAIT', width: 7.5, height: 10.63 });
  pptx.layout = 'A4_PORTRAIT';
  pptx.title = data.labels.brand + ' — ' + data.labels.execSummary;

  const s = pptx.addSlide();
  s.background = { color: 'FAF6F0' };

  // Soft gold wash
  s.addShape('rect', {
    x: 0, y: 0, w: 4, h: 1.2,
    fill: { color: 'D7A562', transparency: 92 },
    line: { type: 'none' },
  });

  const brandX = data.showLogo ? 0.72 : 0.3;
  if (data.showLogo) {
    const logoSvgPptx = '<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 15 A35 35 0 0 0 22 25" stroke="#d7a562" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/><path d="M50 15 A35 35 0 0 1 78 25" stroke="#d7a562" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/><path d="M50 28C32 28 18 50 18 50C18 50 32 72 50 72C68 72 82 50 82 50C82 50 68 28 50 28Z" stroke="#d7a562" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="50" r="12" stroke="#d7a562" stroke-width="2"/><circle cx="50" cy="50" r="4.5" fill="#d7a562"/></svg>';
    const logoDataUri = 'data:image/svg+xml;base64,' + btoa(logoSvgPptx);
    s.addImage({ data: logoDataUri, x: 0.3, y: 0.15, w: 0.35, h: 0.35 });
  }
  s.addText(data.isRtl ? 'منصة حَدَق' : 'Hadaq Platform', {
    x: brandX, y: 0.2, w: 3, h: 0.3,
    fontSize: 14, bold: true, color: '1A1511',
  });
  s.addText(data.isRtl ? 'HADAQ PLATFORM' : 'منصة حَدَق', {
    x: brandX, y: 0.48, w: 3, h: 0.15,
    fontSize: 7, bold: true, color: 'D7A562', charSpacing: 1.5,
  });

  const isHijri = data.dateSystem === 'hijri';
  const primaryDate = isHijri ? data.hijriLabel : data.startLabel + ' — ' + data.endLabel;
  const secondaryDate = isHijri ? data.startLabel + ' — ' + data.endLabel : data.hijriLabel;
  s.addShape('rect', {
    x: 4.8, y: 0.15, w: 2.4, h: 0.55,
    fill: { color: 'FFFFFF', transparency: 50 },
    line: { color: 'D7A562', width: 0.25, transparency: 90 },
    rectRadius: 0.04,
  });
  s.addText(data.labels.period.toUpperCase(), {
    x: 4.9, y: 0.17, w: 2.2, h: 0.12,
    fontSize: 5, bold: true, color: '8A7E72', charSpacing: 1, align: 'right',
  });
  s.addText(primaryDate, {
    x: 4.9, y: 0.3, w: 2.2, h: 0.18,
    fontSize: 9, bold: true, color: '1A1511', align: 'right',
  });
  s.addText(secondaryDate, {
    x: 4.9, y: 0.48, w: 2.2, h: 0.15,
    fontSize: 7, color: '8A7E72', align: 'right',
  });

  s.addText(data.labels.execSummary, {
    x: 0.3, y: 0.72, w: 5, h: 0.3,
    fontSize: 16, bold: true, color: '1A1511',
  });
  s.addText(data.isRtl ? 'بطاقة نسك - مسار التوعية و التدريب' : 'Nusuk Card — Awareness & Training Track', {
    x: 0.3, y: 1.0, w: 5, h: 0.18,
    fontSize: 8, color: '8A7E72',
  });

  s.addShape('line', {
    x: 0.3, y: 1.25, w: 6.9, h: 0,
    line: { color: 'D7A562', width: 0.25, transparency: 60 },
  });

  // KPI tiles
  const wowStr = data.wow === null ? '—' : (data.wow >= 0 ? '↑ ' : '↓ ') + Math.abs(data.wow) + '%';
  const kpis = [
    { v: data.totalCaptured.toString(), l: data.isRtl ? 'إجمالي المرصود' : 'Total captured', c: '1A1511' },
    { v: data.total.toString(), l: data.labels.kpiTotal, c: '1A1511' },
    { v: wowStr, l: data.isRtl ? 'مقارنة بالأسبوع الماضي' : data.labels.kpiWow, c: data.wow === null ? '1A1511' : data.wow >= 0 ? '038061' : 'D95E4A' },
    { v: data.busiestLabel || '—', l: data.labels.kpiPeak, c: '1A1511' },
    { v: data.uniqueHandles.toString(), l: data.labels.kpiUnique, c: '1A1511' },
  ];
  const tileW = 1.3;
  const tileGap = 0.08;
  kpis.forEach((k, i) => {
    const x = 0.3 + i * (tileW + tileGap);
    s.addShape('rect', {
      x, y: 1.35, w: tileW, h: 0.6,
      fill: { color: 'FFFFFF', transparency: 50 },
      line: { color: 'D7A562', width: 0.15, transparency: 94 },
      rectRadius: 0.05,
    });
    s.addText(k.v, {
      x: x + 0.05, y: 1.36, w: tileW - 0.1, h: 0.35,
      fontSize: 16, bold: true, color: k.c, align: 'center',
    });
    s.addText(k.l, {
      x: x + 0.05, y: 1.7, w: tileW - 0.1, h: 0.22,
      fontSize: 6, bold: true, color: '8A7E72', align: 'center', shrinkText: true,
    });
  });

  // Panels
  const panelY = 2.1;
  const panelW = 2.2;
  const panelH = 1.55;
  const panelGap = 0.1;

  const panelBg = { color: 'FFFFFF', transparency: 55 };
  const panelLine = { color: 'D7A562', width: 0.15, transparency: 94 };

  // Category panel
  s.addShape('rect', { x: 0.3, y: panelY, w: panelW, h: panelH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.categories, { x: 0.4, y: panelY + 0.05, w: panelW - 0.2, h: 0.2, fontSize: 8, bold: true, color: '174766' });
  const maxCat = Math.max(1, ...data.categoryOrder.map(c => data.categoryCounts[c] ?? 0));
  data.categoryOrder.forEach((c, i) => {
    const n = data.categoryCounts[c] ?? 0;
    const pct = data.total > 0 ? Math.round((n / data.total) * 100) : 0;
    const rowY = panelY + 0.32 + i * 0.22;
    s.addText(data.categoryLabels[c], { x: 0.4, y: rowY, w: 0.55, h: 0.18, fontSize: 6, color: '8A7E72' });
    s.addShape('rect', { x: 1.0, y: rowY + 0.06, w: 0.65, h: 0.06, fill: { color: 'D7A562', transparency: 92 }, rectRadius: 0.03 });
    const barW = Math.max(0.02, (n / maxCat) * 0.65);
    s.addShape('rect', { x: 1.0, y: rowY + 0.06, w: barW, h: 0.06, fill: { color: CAT_HEX[c] }, rectRadius: 0.03 });
    s.addText(n.toString(), { x: 1.7, y: rowY, w: 0.2, h: 0.18, fontSize: 7, bold: true, color: '1A1511', align: 'right' });
    s.addText(pct + '%', { x: 1.9, y: rowY, w: 0.2, h: 0.18, fontSize: 6, color: '8A7E72', align: 'right' });
  });

  // Voices panel
  const vX = 0.3 + panelW + panelGap;
  s.addShape('rect', { x: vX, y: panelY, w: panelW, h: panelH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.topVoices, { x: vX + 0.1, y: panelY + 0.05, w: panelW - 0.2, h: 0.2, fontSize: 8, bold: true, color: '174766' });
  data.topVoices.slice(0, 5).forEach((v, i) => {
    const rowY = panelY + 0.32 + i * 0.22;
    s.addText((i + 1).toString(), { x: vX + 0.1, y: rowY, w: 0.15, h: 0.18, fontSize: 6, bold: true, color: 'D7A562', align: 'center' });
    s.addText(v.handle, { x: vX + 0.3, y: rowY, w: 1.4, h: 0.18, fontSize: 7, bold: true, color: '1A1511' });
    s.addText(v.n.toString(), { x: vX + 1.8, y: rowY, w: 0.25, h: 0.18, fontSize: 8, bold: true, color: '1A1511', align: 'right' });
  });

  // Hashtags panel
  const hX = vX + panelW + panelGap;
  s.addShape('rect', { x: hX, y: panelY, w: panelW, h: panelH, fill: panelBg, line: panelLine, rectRadius: 0.05 });
  s.addText(data.labels.topHashtags, { x: hX + 0.1, y: panelY + 0.05, w: panelW - 0.2, h: 0.2, fontSize: 8, bold: true, color: '174766' });
  data.topHashtags.slice(0, 5).forEach((tc, i) => {
    const rowY = panelY + 0.32 + i * 0.22;
    s.addText((i + 1).toString(), { x: hX + 0.1, y: rowY, w: 0.15, h: 0.18, fontSize: 6, bold: true, color: 'D7A562', align: 'center' });
    s.addText(tc.tag, { x: hX + 0.3, y: rowY, w: 1.4, h: 0.18, fontSize: 7, bold: true, color: '1A1511' });
    s.addText(tc.count.toString(), { x: hX + 1.8, y: rowY, w: 0.25, h: 0.18, fontSize: 8, bold: true, color: '1A1511', align: 'right' });
  });

  // Highlights
  s.addText(data.labels.highlights, { x: 0.3, y: 3.8, w: 4, h: 0.2, fontSize: 9, bold: true, color: '174766' });
  s.addText(data.highlights.length + (data.isRtl ? ' منشورات' : ' posts'), { x: 5, y: 3.8, w: 2.2, h: 0.2, fontSize: 7, color: '8A7E72', align: 'right' });

  const imgPromises = data.highlights.slice(0, 6).map(async (p) => {
    if (!p.screenshot_url) return { id: p.id, uri: null };
    const uri = await urlToDataUri(p.screenshot_url);
    return { id: p.id, uri };
  });
  const imgs = await Promise.all(imgPromises);
  const imgMap = new Map(imgs.map(i => [i.id, i.uri]));

  const cardW = 2.15;
  const cardH = 2.5;
  const cardGap = 0.1;
  const startY = 4.1;

  data.highlights.slice(0, 6).forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.3 + col * (cardW + cardGap);
    const y = startY + row * (cardH + cardGap);

    s.addShape('rect', { x, y, w: cardW, h: cardH, fill: panelBg, line: panelLine, rectRadius: 0.04 });

    const imgUri = imgMap.get(p.id);
    if (imgUri) {
      s.addImage({ data: imgUri, x: x + 0.03, y: y + 0.03, w: cardW - 0.06, h: 1.35 });
    } else {
      s.addShape('rect', { x: x + 0.03, y: y + 0.03, w: cardW - 0.06, h: 1.35, fill: { color: 'F5EDE3' }, rectRadius: 0.03 });
      s.addText(data.labels.noScreenshot, { x: x + 0.03, y: y + 0.55, w: cardW - 0.06, h: 0.25, fontSize: 6, color: '8A7E72', align: 'center' });
    }

    const handle = p.metadata?.author_handle ?? p.metadata?.author_name ?? '—';
    const text = (p.metadata?.text ?? '').slice(0, 80);
    const dateStr = data.datePostedLabel(p);

    s.addText(handle, { x: x + 0.06, y: y + 1.42, w: cardW - 0.12, h: 0.18, fontSize: 7, bold: true, color: '1A1511' });
    s.addText(dateStr, { x: x + 0.06, y: y + 1.6, w: cardW - 0.12, h: 0.14, fontSize: 6, color: '8A7E72' });
    s.addText(text, { x: x + 0.06, y: y + 1.76, w: cardW - 0.12, h: 0.65, fontSize: 6, color: '1A1511', shrinkText: true });
  });

  await pptx.writeFile({ fileName });
}
