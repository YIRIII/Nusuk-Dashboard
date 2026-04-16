import { test, expect } from '@playwright/test';

// Golden-file suite for Arabic glyph shaping.
// Each sample exercises a different failure mode v1 exhibited or that Chromium #4996 may regress.
const SAMPLES: Array<{ id: string; label: string; html: string }> = [
  {
    id: '01-plain-paragraph',
    label: 'Plain Arabic paragraph (no diacritics)',
    html: '<p>اللغة العربية لغة سامية من أقدم اللغات المنطوقة في العالم.</p>',
  },
  {
    id: '02-diacritics',
    label: 'Arabic with full tashkil',
    html: '<p>اَللُّغَةُ الْعَرَبِيَّةُ هِيَ لُغَةٌ سَامِيَّةٌ.</p>',
  },
  {
    id: '03-arabic-indic-numerals',
    label: 'Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)',
    html: '<p>الأرقام: ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩</p>',
  },
  {
    id: '04-bidi-mixed',
    label: 'Mixed AR/EN (bidi)',
    html: '<p>مرحبا Hello يا world سلام.</p>',
  },
  {
    id: '05-punctuation',
    label: 'Arabic punctuation (comma، question؟)',
    html: '<p>ما اسمك؟ قال: «محمد»، ثم صمت.</p>',
  },
  {
    id: '06-ligatures-lam-alef',
    label: 'Lam-Alef ligature (ﻻ)',
    html: '<p>لا إله إلا الله. الأخلاق. الاحتساب.</p>',
  },
  {
    id: '07-long-word',
    label: 'Long connected word',
    html: '<p>فسيكفيكهم. استحضاراتهم. مستخلصاتنا.</p>',
  },
  {
    id: '08-hashtag-mention',
    label: 'Hashtag + mention',
    html: '<p>#نُسك @nusuk_card شكراً لكم.</p>',
  },
  {
    id: '09-twitter-card-headline',
    label: 'Simulated tweet card headline',
    html:
      '<article style="max-width:520px;border:1px solid #ccc;padding:16px;border-radius:12px">' +
      '<p style="font-weight:700">بطاقة نُسك: الإصدار الجديد يدعم خدمات الحج.</p>' +
      '<small>٢٠٢٦-٠٤-١٥ · إصدار رسمي</small>' +
      '</article>',
  },
  {
    id: '10-mixed-weights',
    label: 'Mixed weights (Cairo 400/700)',
    html:
      '<p style="font-weight:400">وزن عادي للنص.</p>' +
      '<p style="font-weight:700">وزن عريض للنص.</p>',
  },
];

const TEMPLATE = (body: string): string => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: 'FallbackAR';
      src: local('Noto Sans Arabic'), local('Cairo'), local('KacstOne');
    }
    body {
      font-family: 'Noto Sans Arabic', 'Cairo', FallbackAR, sans-serif;
      font-size: 18px;
      line-height: 1.8;
      padding: 24px;
      background: #ffffff;
      color: #111827;
    }
    p { margin: 0 0 12px 0; }
  </style>
</head>
<body>${body}</body>
</html>`;

for (const sample of SAMPLES) {
  test(sample.id + ' — ' + sample.label, async ({ page }) => {
    await page.setContent(TEMPLATE(sample.html), { waitUntil: 'load' });
    await expect(page).toHaveScreenshot(sample.id + '.png', { fullPage: true });
  });
}
