import { DNA_FIELDS, STYLE_FIELDS, describe, validateProfile } from './schema.js';
import { recordedLeadingRecipe } from './trending.js';
import { castingRole } from './casting.js';
export const LAYOUT = { id: 'LS-STD-9x16-V1', ratio: '9:16', panels: [
  { title: 'Header', label: 'ชื่อ · ID · อายุ · บทบาท', count: 0 }, { title: 'Hero Portrait', label: 'ภาพหลัก', count: 1 },
  { title: 'DNA Summary', label: 'จุดจำ3–5ข้อ', count: 0 }, { title: 'Angle Views', label: 'ตรง · 3/4 · ข้าง · หลัง', count: 4 },
  { title: 'Expression Study', label: 'นิ่ง · ยิ้ม · เศร้า · โกรธ · ประหลาดใจ', count: 5 },
  { title: 'Wardrobe', label: 'ชุดหลัก · ลำลอง · ธุรกิจ · ทางการ', count: 4 }, { title: 'Details', label: 'ตา · จมูก · ปาก · ผม/ผิว', count: 4 }
] };
export const MODE_LABELS = { hero: 'Hero Portrait', looksheet: 'Character Looksheet', scene: 'Scene Portrait' };
export function compose(profile) {
  validateProfile(profile);
  const mode = profile.output.mode, appearance = profile.appearance;
  const role = castingRole(profile);
  const recipe = ['auto', 'hero', 'heroine'].includes(role.id) ? recordedLeadingRecipe(profile) : null;
  const presentation = { male: 'ผู้ชาย', female: 'ผู้หญิง', custom: 'ตัวละครตามการนำเสนอที่กำหนดโดยไม่จำกัดลักษณะตามเพศ' }[profile.presentation];
  const aesthetic = { 'thai-modern': 'ไทยร่วมสมัย', 'chinese-modern': 'จีนร่วมสมัย', 'european-modern': 'ยุโรปร่วมสมัย', international: 'ร่วมสมัยสากล', custom: 'อิสระตามการออกแบบ' }[profile.aestheticStyle] || profile.aestheticStyle;
  const dna = DNA_FIELDS.map(field => describe(field, profile.facialDNA[field.id])).join(' · ');
  const styling = STYLE_FIELDS.filter(field => !['personality', 'voice'].includes(field.group) && appearance[field.id] !== undefined && !['aspectRatio', 'camera', 'lens', 'lighting', 'background', ...(mode === 'looksheet' ? ['expression', 'pose'] : [])].includes(field.id)).map(field => describe(field, appearance[field.id])).join(' · ');
  const story = STYLE_FIELDS.filter(field => ['personality', 'voice'].includes(field.group) && appearance[field.id] !== undefined).map(field => describe(field, appearance[field.id])).join(' · ');
  const positive = `สร้าง${MODE_LABELS[mode]}แบบภาพถ่ายสมจริงของ${presentation} อายุ ${profile.age} ปี${profile.name ? ` ชื่อ ${profile.name}` : ''} บทบาท${profile.role} ในแนว${aesthetic}\nรูปร่าง${profile.bodyBuild} สูงประมาณ${profile.bodyHeight}เซนติเมตร\n\nเอกลักษณ์ใบหน้า: ${dna}\n\nรายละเอียดรูปลักษณ์และเครื่องแต่งกาย: ${styling}\nทิศทางการแสดง: ${profile.personalityDirection}`;
  const camera = mode === 'looksheet'
    ? `แผ่นแนวตั้ง9:16 หนึ่งตัวละครต่อแผ่น Layout ID: ${LAYOUT.id}\nเรียง7ส่วนจากบนลงล่าง ห้ามสลับลำดับ:\n${LAYOUT.panels.map((panel, index) => `${index + 1}. ${panel.title}: ${panel.label}${panel.count ? ` จำนวน${panel.count}ภาพ` : ''}`).join('\n')}\nรวม18ภาพย่อย ไม่นับ Header และ DNA Summary เป็นภาพ แยกกรอบสม่ำเสมอและไม่ทับกัน\nHero ใหญ่ที่สุด มุมมอง4ช่องเรียงซ้ายไปขวา สีหน้า5ช่องใช้ชุดหลักเดียวกัน รายละเอียด4ช่องเป็นภาพระยะใกล้\nพื้น${{ light: 'อ่อนและเทากลาง สไตล์ Professional Clean Editorial', dark: 'เข้มแบบ Dark Cinematic', burgundy: 'เบอร์กันดีและทองแบบ Editorial' }[profile.output.theme]} ป้ายชื่อภาษาไทยสั้นและอ่านง่าย ให้ DNA Summary เพียง3–5ข้อ\nใช้แสงสตูดิโอนุ่มใกล้เคียงกันทุกช่อง`
    : `หนึ่งตัวละคร หนึ่งภาพ อัตราส่วน${appearance.aspectRatio}\n${mode === 'hero' ? 'ภาพครึ่งตัวเน้นใบหน้าชัดเจนเพื่อคัดเลือกใบหน้าต้นแบบ ไม่แบ่งช่อง' : 'เปลี่ยนเฉพาะการแสดง/การแต่งกาย/องค์ประกอบภาพ'}\n${['background', 'camera', 'lens', 'lighting'].map(key => describe(STYLE_FIELDS.find(field => field.id === key), appearance[key])).join(' · ')}`;
  const continuity = `${profile.sameIdentity ? 'รักษา Permanent Facial DNA และจุดจำเฉพาะตัวตามรายละเอียดข้างต้นทุกมุม ห้ามเปลี่ยนโครงหน้า' : 'ใช้ DNA ที่กำหนดเป็นแนวออกแบบใบหน้าของภาพนี้'}${mode === 'scene' ? '\nให้อ้างอิง Hero Portrait หรือ Looksheet ของตัวละครเดียวกันที่ผู้ใช้แนบในเครื่องมือสร้างภาพปลายทาง' : ''}${mode === 'looksheet' ? '\nทุกช่องต้องเป็นตัวละครเดียวกัน สีหน้าใช้ชุดเดียวกัน ส่วน Wardrobe เปลี่ยนชุดได้แต่ไม่เปลี่ยนใบหน้า' : ''}`;
  const negative = `ไม่เพิ่มบุคคลอื่น ไม่เปลี่ยนจุดจำใบหน้า ไม่สร้างนิ้วหรืออวัยวะเกิน ไม่สร้างลายน้ำ${mode === 'looksheet' ? ' ไม่เพิ่มข้อความอื่นนอก Header/ป้ายกำกับที่กำหนด ไม่เพิ่ม/ลด/รวมช่อง' : ' ไม่มีข้อความหรือตารางในภาพ ไม่สร้างแผ่นหลายช่อง'}`;
  const brief = profile.presentation === 'custom' ? recipe?.brief.replace(/^ตัวเอก[ชายหญิง]+/, 'ตัวเอก') : recipe?.brief;
  const casting = recipe ? `\nทิศทางแคสติ้ง: ${brief} เป็นตัวละครสมมติที่มีเอกลักษณ์ของตนเอง ไม่เลียนแบบดาราคนใด ให้ยึด DNA และค่าที่ผู้ใช้ปรับข้างต้นเป็นหลัก ไม่เปลี่ยนโครงหน้าเพื่อให้เข้าคำบรรยายแคสติ้ง` : '';
  const roleText = profile.characterType && profile.characterType !== 'auto' ? `\nประเภทตัวละครในเรื่อง: ${role.label}\nแนวทางออกแบบบท: ${role.focus} ใช้เป็นบริบทการแสดงของตัวละครสมมติ ไม่อนุมานนิสัยจากรูปร่างหน้าตา ให้ยึดค่าที่ผู้ใช้กำหนดเป็นหลัก` : '';
  const storyText = story ? `\n\nบุคลิกและแนวทางการแสดง (น้ำเสียงเป็นบันทึกกำกับ ไม่ใช่ข้อความหรือเสียงที่ต้องสร้างในภาพ): ${story}` : '';
  const sections = { positive: positive + casting + roleText + storyText, camera, continuity, negative };
  return { sections, text: `ภาพที่ต้องการ (Positive Prompt)\n${sections.positive}\n\nกล้อง แสง และองค์ประกอบ (Camera & Lighting)\n${camera}\n\nกฎความต่อเนื่อง (Continuity Rules)\n${continuity}\n\nข้อห้าม (Avoid / Negative Constraints)\n${negative}`, version: 'thai-composer-v3' };
}
