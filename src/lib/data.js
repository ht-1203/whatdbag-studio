export const SCHEMA_VERSION = 2;

export const REEL_STATUSES = ['Idea', 'Filming', 'Editing', 'Ready', 'Scheduled', 'Published'];

export const SHOT_GROUPS = [
  ['Street & Walking', ['เดินสะพายกระเป๋าผ่านกล้อง', 'เดินออกจากเฟรมด้านหลัง', 'ถ่ายด้านข้างกระเป๋าแกว่ง', 'ยืนรอข้ามถนน', 'เดินเข้าหากล้อง', 'หยุดปรับสายบนไหล่', 'ยืนพิงกำแพงเรียบ', 'เดินผ่านเงาต้นไม้', 'ถือกระเป๋าขณะเดิน', 'ถ่ายขาและกระเป๋าขณะเดิน']],
  ['Bag Details', ['กระเป๋าเต็มใบด้านหน้า', 'กระเป๋าด้านข้าง', 'ซูมโลโก้ whatdbag', 'ถ่ายสายสีแดง', 'ลูบเนื้อผ้า Canvas', 'ถ่ายตะเข็บ', 'ยกกระเป๋าด้วยสาย', 'หมุนให้เห็นรูปทรง', 'ถ่ายป้ายหรือ Patch', 'เงากระเป๋าบนพื้น']],
  ['Coffee & Lifestyle', ['กระเป๋าข้างแก้วกาแฟ', 'นั่งลงวางกระเป๋า', 'หยิบสมุดออก', 'หยิบโทรศัพท์ออก', 'ใส่แว่นตากลับ', 'กระเป๋าข้างโต๊ะมุมต่ำ', 'จับสายลุกจากเก้าอี้', 'กระเป๋าข้างหน้าต่าง', 'เปิดกระเป๋าจากมุมบน', 'เดินออกจากโต๊ะ']],
  ['Function & Capacity', ['เปิดกระเป๋าให้เห็นด้านใน', 'วางของเรียงกัน', 'ใส่หนังสือ', 'ใส่ขวดน้ำ', 'ใส่กระเป๋าสตางค์', 'มุมบนเมื่อใส่ของครบ', 'หยิบของออกทีละชิ้น', 'ถือกระเป๋าที่ใส่ของแล้ว', 'ถ่ายช่องใส่ของ', 'ปิดกระเป๋าและสะพาย']],
  ['Hero & Brand Identity', ['กระเป๋านิ่งตรงกลางเฟรม', 'กระเป๋ามุม 45 องศา', 'โลโก้คู่สายสีแดง', 'กระเป๋าสองสีคู่กัน', 'ยกกระเป๋าออกจากเฟรม', 'Hero Shot นิ่ง', 'แสงและเงาบนกระเป๋า', 'กระเป๋าบนคอนกรีต', 'กระเป๋าด้านหลัง', 'จับสายเดินออกจากเฟรม']],
];

export const DEFAULT_GROUPS = SHOT_GROUPS.map(([group]) => group);

const DEFAULT_REELS = [
  ['Morning in Ari', '1, 3, 8, 41'],
  ['Meet whatdbag', '11, 12, 13, 46'],
  ['Everyday Carry', '21, 23, 24, 30'],
  ['The Red Strap', '14, 17, 43, 50'],
  ['Texture & Details', '15, 16, 19, 18'],
  ['Coffee Companion', '21, 26, 28, 27'],
  ['What Fits Inside', '31, 32, 33, 36'],
  ['City Movement', '2, 5, 6, 10'],
  ['Form & Function', '34, 38, 39, 40'],
  ['Ivory vs Black', '11, 42, 44, 47'],
  ['Small Details', '13, 16, 19, 43'],
  ['Serie 1 Film', '1, 14, 25, 38, 46, 50'],
];

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const today = () => new Date().toISOString().slice(0, 10);

export const makeShot = (group, title) => ({ id: uid(), group, title, done: false, notes: '' });

export const makeReel = (title = 'New Reel', shots = '') => ({
  id: uid(), title, shots, status: 'Idea', date: '', caption: '',
});

export const makeCampaign = (name = 'Ari — Serie 1') => ({
  id: uid(),
  name,
  created: today(),
  shots: SHOT_GROUPS.flatMap(([group, items]) => items.map((title) => makeShot(group, title))),
  reels: DEFAULT_REELS.map(([title, shots]) => makeReel(title, shots)),
});

// Copies the plan (shots, reels) with fresh ids and reset progress.
export const duplicateCampaign = (c) => ({
  ...c,
  id: uid(),
  name: `${c.name} — Copy`,
  created: today(),
  shots: c.shots.map((s) => ({ ...s, id: uid(), done: false, notes: '' })),
  reels: c.reels.map((r) => ({ ...r, id: uid(), status: 'Idea', date: '' })),
});

export const emptyStudio = () => {
  const c = makeCampaign();
  return { version: SCHEMA_VERSION, campaigns: [c], active: c.id };
};

const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);

// Repairs anything loaded from the cloud or a backup file so the UI can trust its shape.
export function normalizeStudio(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.campaigns) || raw.campaigns.length === 0) {
    return emptyStudio();
  }
  const campaigns = raw.campaigns
    .filter((c) => c && typeof c === 'object')
    .map((c) => ({
      id: str(c.id) || uid(),
      name: str(c.name, 'Untitled campaign'),
      created: str(c.created, today()),
      shots: (Array.isArray(c.shots) ? c.shots : []).map((s) => ({
        id: str(s?.id) || uid(),
        group: str(s?.group, 'Other'),
        title: str(s?.title, 'Untitled shot'),
        done: Boolean(s?.done),
        notes: str(s?.notes),
      })),
      reels: (Array.isArray(c.reels) ? c.reels : []).map((r) => ({
        id: str(r?.id) || uid(),
        title: str(r?.title, 'Untitled Reel'),
        shots: str(r?.shots),
        status: REEL_STATUSES.includes(r?.status) ? r.status : 'Idea',
        date: /^\d{4}-\d{2}-\d{2}$/.test(r?.date) ? r.date : '',
        caption: str(r?.caption),
      })),
    }));
  if (campaigns.length === 0) return emptyStudio();
  const active = campaigns.some((c) => c.id === raw.active) ? raw.active : campaigns[0].id;
  return { version: SCHEMA_VERSION, campaigns, active };
}

// "1, 3-5, 8" -> [1, 3, 4, 5, 8] (1-based shot numbers)
export function parseShotNumbers(text) {
  const out = [];
  for (const part of String(text).split(/[,\s]+/)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      for (let n = Math.min(a, b); n <= Math.max(a, b) && out.length < 200; n++) out.push(n);
    } else if (/^\d+$/.test(part)) {
      out.push(Number(part));
    }
  }
  return [...new Set(out)];
}

export const pad2 = (n) => String(n).padStart(2, '0');
