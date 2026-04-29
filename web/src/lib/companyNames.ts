export interface CompanyInfo {
  ar: string;
  category: 'inner' | 'outer';
}

export const COMPANY_NAMES: Record<string, CompanyInfo> = {
  // ── حجاج الخارج (Outer) ──
  '@Albaitguests': { ar: 'ضيوف البيت', category: 'outer' },
  '@Almasiah_SA': { ar: 'المسايح', category: 'outer' },
  '@DaleelAlzowar': { ar: 'دليل الزوار', category: 'outer' },
  '@DurHajj': { ar: 'دُر الحج', category: 'outer' },
  '@EkramAldyf': { ar: 'إكرام الضيف', category: 'outer' },
  '@Holidayinbakkah': { ar: 'هوليداي إن بكة', category: 'outer' },
  '@IthraaAlJoud': { ar: 'إثراء الجود', category: 'outer' },
  '@ManasekIPMC': { ar: 'مناسك', category: 'outer' },
  '@Rehlatwmanafe': { ar: 'رحلات ومنافع', category: 'outer' },
  '@SaudiaHajjUmrah': { ar: 'السعودية للحج والعمرة', category: 'outer' },
  '@YosrAlmashaer': { ar: 'يسر المشاعر', category: 'outer' },
  '@alrajhi_css': { ar: 'الراجحي للخدمات', category: 'outer' },
  '@alrifadah': { ar: 'الرفادة', category: 'outer' },
  '@bushra_deyafah': { ar: 'بشرى الضيافة', category: 'outer' },
  '@ithraalkhair': { ar: 'إثراء الخير', category: 'outer' },
  '@mcdcHajj': { ar: 'الشركة المتحدة لتنمية مكة', category: 'outer' },
  '@rakeencom': { ar: 'راكين', category: 'outer' },
  '@rawafmina': { ar: 'روافد منى', category: 'outer' },
  '@rifadteaa': { ar: 'رفادة طيبة', category: 'outer' },
  '@sana_7ajj': { ar: 'سنا الحج', category: 'outer' },

  // ── حجاج الداخل (Inner) ──
  '@AletqanSa': { ar: 'الإتقان', category: 'inner' },
  '@AlhawijyCom': { ar: 'الحاوي', category: 'inner' },
  '@AlhazmiHajj': { ar: 'الحازمي للحج', category: 'inner' },
  '@FoujAlhuda': { ar: 'فوج الهدى', category: 'inner' },
  '@MutahedCom': { ar: 'متحد', category: 'inner' },
  '@Qasswa': { ar: 'قصوى', category: 'inner' },
  '@RawahelKSA': { ar: 'رواحل', category: 'inner' },
  '@alabrarbiz': { ar: 'الأبرار', category: 'inner' },
  '@albashaerSA': { ar: 'البشائر', category: 'inner' },
  '@alforgan8804': { ar: 'الفرقان', category: 'inner' },
  '@alkafhajj': { ar: 'الكاف للحج', category: 'inner' },
  '@alolyany_hajj': { ar: 'العلياني للحج', category: 'inner' },
  '@alroken5': { ar: 'الركن', category: 'inner' },
  '@alsuhaimi10190': { ar: 'السحيمي', category: 'inner' },
  '@althawadihg': { ar: 'الثوادي', category: 'inner' },
  '@beelad_harameen': { ar: 'بلاد الحرمين', category: 'inner' },
  '@bn_rwizen': { ar: 'بن رويزن', category: 'inner' },
  '@fajr_Hajj_Umrah': { ar: 'فجر الحج والعمرة', category: 'inner' },
  '@foujmakkah': { ar: 'فوج مكة', category: 'inner' },
  '@frdaus_sa': { ar: 'فردوس', category: 'inner' },
  '@islamunitedhajj': { ar: 'الإسلام المتحد للحج', category: 'inner' },
  '@mahwa_alafeda': { ar: 'مهوى الأفئدة', category: 'inner' },
  '@noorhera1425': { ar: 'نور حراء', category: 'inner' },
  '@nusuk_almshaer': { ar: 'نسك المشاعر', category: 'inner' },
  '@qafilatalkhaiir': { ar: 'قافلة الخير', category: 'inner' },
  '@rehabalmashaer': { ar: 'رحاب المشاعر', category: 'inner' },
  '@safaalmashar': { ar: 'صفا المشاعر', category: 'inner' },
  '@samaalfaroq_': { ar: 'سما الفاروق', category: 'inner' },
  '@tafwijcoltd': { ar: 'تفويج', category: 'inner' },
  '@yemenawqafe': { ar: 'يمن أوقاف', category: 'inner' },
  '@zainyhajj': { ar: 'زيني للحج', category: 'inner' },
};

export function getCompanyDisplayName(handle: string): string {
  return COMPANY_NAMES[handle]?.ar ?? handle;
}
