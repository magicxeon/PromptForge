import { CHARACTER_TYPES } from './casting.js';
export const VERSION = '1.0';
export const LIMITS = { characters: 500, generations: 1000, presets: 100, images: 200, imageBytes: 5 * 1024 ** 2, backupBytes: 100 * 1024 ** 2 };
const choices = (...rows) => rows.map(([value, label, english]) => ({ value, label, english: english || value }));
const englishLabel = id => id.replace(/([a-z])([A-Z])/g, '$1 $2');
const pick = (id, label, options, extra = {}) => ({ id, label, english: englishLabel(id), type: 'select', options, default: options[0].value, ...extra });
const range = (id, label, extra = {}) => ({ id, label, english: englishLabel(id), type: 'range', default: 3, ...extra });
const multi = (id, label, options) => ({ id, label, english: englishLabel(id), type: 'multi', options, default: [] });
const locations = choices(['left-cheek', 'แก้มซ้าย'], ['right-cheek', 'แก้มขวา'], ['under-eye', 'ใต้ตา'], ['chin', 'คาง'], ['brow', 'เหนือคิ้ว']);
export const GROUPS = [
  { id: 'geometry', label: 'รูปหน้า', fields: [pick('faceShape', 'รูปหน้า', choices(['oval', 'รูปไข่'], ['diamond', 'รูปเพชร'], ['heart', 'รูปหัวใจ'], ['square', 'เหลี่ยม'], ['round', 'กลม'], ['oblong', 'ยาวรี'], ['combination', 'ผสมรูปไข่และเพชร']))] },
  { id: 'proportions', label: 'สัดส่วนใบหน้า', fields: [range('faceLength', 'ความยาวใบหน้า'), range('faceWidth', 'ความกว้างใบหน้า'), range('facialThirdBalance', 'สมดุลใบหน้าสามส่วน'), range('facialSymmetry', 'ความสมมาตร')] },
  { id: 'cheeks', label: 'แก้มและโหนกแก้ม', fields: [range('cheekboneHeight', 'ความสูงโหนกแก้ม'), range('cheekboneProminence', 'ความเด่นโหนกแก้ม'), range('cheekFullness', 'ความอิ่มของแก้ม')] },
  { id: 'jaw', label: 'กราม', fields: [range('jawWidth', 'ความกว้างกราม'), range('jawAngularness', 'ความเหลี่ยมกราม'), range('jawDefinition', 'ความชัดแนวกราม')] },
  { id: 'chin', label: 'คาง', fields: [pick('chinShape', 'ปลายคาง', choices(['rounded', 'มน'], ['pointed', 'เรียว'], ['square', 'เหลี่ยม'], ['cleft', 'มีร่องเล็กน้อย'])), range('chinLength', 'ความยาวคาง'), range('chinWidth', 'ความกว้างคาง')] },
  { id: 'eyes', label: 'ดวงตา', fields: [pick('eyeShape', 'รูปตา', choices(['almond', 'ทรงอัลมอนด์ (Almond Eyes)'], ['round', 'กลม'], ['fox', 'เรียวยกหางแบบ Fox'], ['cat', 'โค้งยกหางแบบ Cat'], ['downturned', 'หางตกเล็กน้อย'], ['hooded', 'เปลือกตาคลุม'])), range('eyeSize', 'ขนาดดวงตา')] },
  { id: 'placement', label: 'ตำแหน่งตา', fields: [range('eyeSpacing', 'ระยะห่างดวงตา'), range('canthalTilt', 'ระดับยกหางตา (Canthal Tilt)'), range('eyeDepth', 'ความลึกเบ้าตา'), pick('eyelidType', 'ชั้นตา', choices(['double', 'สองชั้น'], ['single', 'ชั้นเดียว'], ['tapered', 'สองชั้นเรียว'], ['deep', 'ชั้นตาลึก']))] },
  { id: 'brows', label: 'คิ้ว', fields: [pick('browShape', 'ทรงคิ้ว', choices(['straight', 'ตรง'], ['arched', 'โค้ง'], ['sword', 'เฉียงคม'], ['soft-angled', 'หักมุมอ่อน'])), range('browDensity', 'ความหนาคิ้ว'), range('browAngle', 'ความเฉียงคิ้ว')] },
  { id: 'nose', label: 'จมูก', fields: [range('noseBridgeHeight', 'ความสูงสันจมูก'), pick('bridgeShape', 'สันจมูก', choices(['straight', 'ตรง'], ['soft', 'โค้งอ่อน'], ['convex', 'นูนเล็กน้อย'])), pick('tipShape', 'ปลายจมูก', choices(['rounded', 'มน'], ['defined', 'ชัด'], ['upturned', 'เชิดเล็กน้อย'])), range('noseWidth', 'ความกว้างจมูก')] },
  { id: 'lips', label: 'ริมฝีปาก', fields: [range('lipFullness', 'ความอิ่มริมฝีปาก'), range('upperLowerBalance', 'สัดส่วนริมฝีปากบนเทียบล่าง'), range('cupidBow', 'ความชัดกระจับปาก'), range('mouthWidth', 'ความกว้างปาก')] },
  { id: 'ears', label: 'ใบหู', fields: [pick('earShape', 'ใบหู', choices(['rounded', 'ทรงมน'], ['attached', 'ติ่งหูติด'], ['detached', 'ติ่งหูแยก'], ['prominent', 'กางเล็กน้อย']))] },
  { id: 'skin', label: 'ผิว', fields: [pick('skinTone', 'สีผิว', choices(['light', 'อ่อน'], ['medium', 'กลาง'], ['tan', 'แทน'], ['deep', 'เข้ม'], ['rich-deep', 'เข้มลึก'])), pick('undertone', 'อันเดอร์โทนผิว', choices(['neutral', 'เป็นกลาง'], ['warm', 'อุ่น'], ['cool', 'เย็น'], ['olive', 'โอลีฟ'])), range('realisticTexture', 'รายละเอียดผิวธรรมชาติ'), range('freckles', 'ความเด่นของกระ', { default: 1 })] },
  { id: 'marks', label: 'จุดจำเฉพาะตัว', fields: [multi('beautyMarks', 'ไฝเล็ก', locations), pick('dimple', 'ลักยิ้ม', choices(['none', 'ไม่มี'], ['left', 'ด้านซ้าย'], ['right', 'ด้านขวา'], ['both', 'สองข้าง'])), multi('minorScars', 'รอยแผลเล็ก', locations), range('subtleAsymmetry', 'ความไม่สมมาตรเล็กน้อย', { default: 2 })] }
];
export const STYLING = [
  { id: 'hair', label: 'ผม', fields: [pick('hairLength', 'ความยาวผม', choices(['short', 'สั้น'], ['medium', 'ประบ่า'], ['long', 'ยาว'])), pick('hairColor', 'สีผม', choices(['black', 'ดำ'], ['brown', 'น้ำตาล'], ['blonde', 'บลอนด์'], ['auburn', 'น้ำตาลแดง'], ['silver', 'เงิน'])), pick('hairPart', 'แสกผม', choices(['side', 'ข้าง'], ['center', 'กลาง'], ['none', 'ไม่แสก'])), pick('hairTexture', 'ลักษณะเส้นผม', choices(['straight', 'ตรง'], ['wavy', 'เป็นคลื่น'], ['curly', 'หยิก'], ['coily', 'หยิกแน่น'])), range('hairVolume', 'วอลลุ่มผม'), pick('fringe', 'หน้าม้า', choices(['none', 'ไม่มี'], ['soft', 'บาง'], ['full', 'เต็ม'])), pick('earVisibility', 'การเผยใบหู', choices(['visible', 'มองเห็น'], ['partial', 'เห็นบางส่วน'], ['covered', 'มีผมบัง']))] },
  { id: 'wardrobe', label: 'การแต่งกาย', fields: [pick('makeup', 'การแต่งหน้า', choices(['natural', 'เป็นธรรมชาติ'], ['none', 'ไม่แต่ง'], ['editorial', 'Editorial'], ['dramatic', 'เน้นดวงตา'])), pick('costume', 'ชุดหลัก', choices(['casual', 'เสื้อเชิ้ตและกางเกงเรียบ'], ['business', 'สูททรงร่วมสมัย'], ['formal', 'ชุดทางการตัดเย็บประณีต'], ['heritage', 'ชุดผ้าไทยร่วมสมัย'], ['creative', 'ชุดศิลปินทรงอิสระ'])), { id: 'costumeColor', label: 'สีชุดหลัก', type: 'color', default: '#344b49' }, pick('material', 'วัสดุชุด', choices(['cotton', 'ผ้าฝ้าย'], ['linen', 'ผ้าลินิน'], ['silk', 'ผ้าไหม'], ['wool', 'ผ้าวูล'])), pick('era', 'ยุค', choices(['modern', 'ปัจจุบัน'], ['period', 'ย้อนยุค'], ['future', 'อนาคต'])), pick('accessories', 'เครื่องประดับ', choices(['none', 'ไม่มี'], ['watch', 'นาฬิกาเรียบ'], ['glasses', 'แว่นสายตา'], ['earrings', 'ต่างหูขนาดเล็ก'], ['necklace', 'สร้อยเรียบ']))] },
  { id: 'scene', label: 'การแสดงและภาพ', fields: [pick('expression', 'สีหน้า', choices(['neutral', 'เป็นกลาง'], ['smile', 'ยิ้มอ่อน'], ['joy', 'ดีใจ'], ['sad', 'เศร้า'], ['surprise', 'ประหลาดใจ'], ['anger', 'โกรธแบบควบคุม'], ['cold', 'จ้องนิ่ง'], ['smirk', 'ยิ้มมุมปากแบบการแสดง'])), pick('pose', 'ท่าทาง', choices(['relaxed', 'ยืนผ่อนคลาย'], ['seated', 'นั่งตรง'], ['walking', 'กำลังเดิน'])), pick('camera', 'มุมกล้อง', choices(['front', 'หน้าตรง'], ['three-quarter', 'สามส่วนสี่ (Three-quarter View)'], ['side', 'ด้านข้าง'])), pick('lens', 'เลนส์', choices(['85mm', '85mm f/2.8'], ['50mm', '50mm f/2.8'], ['35mm', '35mm f/4'])), pick('lighting', 'แสง', choices(['soft', 'แสงนุ่มสม่ำเสมอ'], ['window', 'แสงหน้าต่างด้านข้าง'], ['cinematic', 'แสงภาพยนตร์แบบควบคุม'])), pick('background', 'ฉาก', choices(['studio', 'สตูดิโอพื้นเทากลาง'], ['office', 'สำนักงานร่วมสมัย'], ['garden', 'สวนเงียบ'], ['street', 'ถนนเมืองช่วงเย็น'])), pick('aspectRatio', 'สัดส่วนภาพเดี่ยว', choices(['2:3', '2:3'], ['9:16', '9:16'], ['1:1', '1:1'], ['16:9', '16:9']))] }
];
const extraPick = (id, label, rows) => pick(id, label, choices(...rows), { extension: 'casting-v1' });
STYLING.push(
  { id: 'personality', label: 'บุคลิกและเส้นเรื่อง', fields: [
    extraPick('temperament', 'บุคลิกหลัก', [['warm', 'อบอุ่น'], ['confident', 'มั่นใจ'], ['calm', 'สงบ'], ['calculating', 'สุขุมวางแผน'], ['ambitious', 'ทะเยอทะยาน'], ['stoic', 'เก็บอารมณ์'], ['pragmatic', 'มองโลกตามจริง'], ['competitive', 'ชอบแข่งขัน'], ['cheerful', 'ร่าเริง'], ['playful', 'ขี้เล่น']]),
    extraPick('socialStyle', 'การเข้าสังคม', [['approachable', 'เข้าถึงง่าย'], ['reserved', 'สำรวม'], ['commanding', 'มีอำนาจนำ'], ['charming', 'มีเสน่ห์ในการเจรจา'], ['obedient', 'ทำตามคำสั่ง'], ['guarded', 'ระวังตัว'], ['expressive', 'แสดงออกชัด'], ['polite', 'สุภาพ']]),
    extraPick('coreMotivation', 'แรงขับหลัก', [['protect', 'ปกป้องคนสำคัญ'], ['love', 'ความรัก'], ['justice', 'ความยุติธรรม'], ['belonging', 'การยอมรับ'], ['power', 'อำนาจ'], ['revenge', 'แก้แค้น'], ['recognition', 'การพิสูจน์ตัวเอง'], ['survival', 'เอาตัวรอด'], ['loyalty', 'ความภักดี'], ['money', 'เงิน'], ['status', 'สถานะ'], ['stability', 'ความมั่นคง'], ['guide', 'ส่งต่อความรู้'], ['family', 'ครอบครัว'], ['ambition', 'ความสำเร็จในงาน']]),
    extraPick('innerConflict', 'ความขัดแย้งภายใน', [['duty-love', 'หน้าที่กับความรัก'], ['trust', 'กล้าไว้ใจผู้อื่น'], ['past', 'ปมในอดีต'], ['unrequited', 'รักที่ไม่ได้รับตอบ'], ['control', 'ความกลัวเสียการควบคุม'], ['loyalty-conscience', 'ความภักดีกับมโนธรรม'], ['survival', 'ทางเลือกเพื่ออยู่รอด'], ['comparison', 'เปรียบเทียบตัวเองกับผู้อื่น'], ['family', 'ความคาดหวังครอบครัว'], ['confidence', 'ความไม่มั่นใจ'], ['work-family', 'งานกับครอบครัว'], ['none', 'ไม่มีปมหลักในฉากนี้']]),
    extraPick('strength', 'จุดแข็ง', [['courage', 'กล้าหาญ'], ['empathy', 'เข้าใจผู้อื่น'], ['resilience', 'ฟื้นตัวจากปัญหา'], ['loyalty', 'ซื่อสัตย์ต่อพวกพ้อง'], ['strategy', 'วางกลยุทธ์'], ['charisma', 'โน้มน้าวใจ'], ['discipline', 'มีวินัย'], ['persistence', 'ไม่ยอมแพ้'], ['resourcefulness', 'แก้ปัญหาเฉพาะหน้า'], ['wit', 'ไหวพริบ'], ['wisdom', 'มีวิจารณญาณ'], ['patience', 'อดทน']]),
    extraPick('flaw', 'จุดอ่อนในการเล่าเรื่อง', [['stubborn', 'ดื้อรั้น'], ['self-sacrifice', 'เสียสละจนลืมตัวเอง'], ['guarded', 'ไม่ยอมเปิดใจ'], ['pride', 'ทิฐิสูง'], ['distrust', 'ไม่ไว้ใจผู้อื่น'], ['controlling', 'ต้องการควบคุม'], ['obedient', 'ไม่กล้าขัดคำสั่ง'], ['impulsive', 'หุนหัน'], ['jealousy', 'อิจฉา'], ['worry', 'กังวลเกินเหตุ'], ['outspoken', 'พูดตรงเกินไป'], ['overprotective', 'ปกป้องมากเกินไป'], ['perfectionism', 'คาดหวังความสมบูรณ์แบบ']]),
    extraPick('stressResponse', 'เมื่อเผชิญแรงกดดัน', [['plan', 'หยุดคิดวางแผน'], ['protect', 'ปกป้องผู้อื่น'], ['confront', 'เผชิญหน้าตรงๆ'], ['withdraw', 'ถอยไปตั้งหลัก'], ['manipulate', 'วางเกมต่อรอง'], ['obey', 'รอคำสั่ง'], ['compete', 'เร่งพิสูจน์ตัวเอง'], ['mediate', 'ไกล่เกลี่ย'], ['humor', 'ใช้อารมณ์ขัน'], ['improvise', 'แก้ปัญหาเฉพาะหน้า'], ['seek-help', 'ขอความช่วยเหลือ']]),
    extraPick('relationshipStyle', 'รูปแบบความสัมพันธ์', [['supportive', 'สนับสนุนกัน'], ['protective', 'คอยปกป้อง'], ['devoted', 'ทุ่มเท'], ['transactional', 'แลกเปลี่ยนผลประโยชน์'], ['possessive', 'ยึดติด'], ['competitive', 'แข่งขัน'], ['boundaried', 'มีขอบเขต'], ['teasing', 'หยอกล้อ'], ['guiding', 'ชี้แนะ']]),
    extraPick('characterArc', 'พัฒนาการตัวละคร', [['growth', 'เติบโตและเปลี่ยนแปลง'], ['healing', 'เยียวยาปมเดิม'], ['redemption', 'ชดเชยความผิด'], ['acceptance', 'ยอมรับตนเองหรือความจริง'], ['downfall', 'พ่ายแพ้ต่อจุดอ่อน'], ['steadfast', 'ยืนหยัดในคุณค่าเดิม']])
  ] },
  { id: 'voice', label: 'น้ำเสียงและการพูด', fields: [
    extraPick('speechStyle', 'ลักษณะการพูด', [['gentle', 'นุ่มนวล'], ['direct', 'ตรงประเด็น'], ['polite', 'สุภาพ'], ['precise', 'แม่นยำรัดกุม'], ['sarcastic', 'ประชดอย่างควบคุม'], ['brief', 'สั้นกระชับ'], ['polished', 'ขัดเกลาเลือกคำ'], ['witty', 'มีมุกไหวพริบ'], ['animated', 'มีจังหวะมีชีวิตชีวา'], ['thoughtful', 'ไตร่ตรองก่อนพูด']]),
    extraPick('voiceTone', 'โทนเสียง', [['warm', 'อบอุ่น'], ['clear', 'ชัดใส'], ['soft', 'เบานุ่ม'], ['cool', 'เยือกเย็น'], ['resonant', 'กังวานมีน้ำหนัก'], ['low', 'ต่ำ'], ['rough', 'แหบเล็กน้อย'], ['bright', 'สดใส']]),
    extraPick('voicePace', 'จังหวะพูด', [['measured', 'สุขุมเว้นจังหวะ'], ['conversational', 'เป็นธรรมชาติเหมือนสนทนา'], ['deliberate', 'ช้าและเน้นคำ'], ['brisk', 'กระชับรวดเร็ว']])
  ] },
  { id: 'performance', label: 'รายละเอียดลุคและภาษากาย', fields: [
    extraPick('facialHair', 'หนวดเครา', [['clean', 'เกลี้ยงเกลา'], ['stubble', 'เคราสั้นบาง'], ['trimmed', 'เคราตัดเรียบ'], ['full', 'เคราเต็ม']]),
    extraPick('hairFinish', 'การเซ็ตผม', [['natural', 'เป็นธรรมชาติ'], ['soft-matte', 'แมตต์นุ่ม'], ['sleek', 'เรียบเนี้ยบ'], ['wet', 'เงาแบบ Wet Look'], ['tousled', 'ยุ่งอย่างตั้งใจ']]),
    extraPick('wardrobeFit', 'ทรงเสื้อผ้า', [['regular', 'พอดีตัว'], ['tailored', 'ตัดเข้ารูปประณีต'], ['relaxed', 'ผ่อนคลายคล่องตัว'], ['oversized', 'โอเวอร์ไซซ์']]),
    extraPick('wardrobeCondition', 'สภาพเสื้อผ้า', [['pristine', 'เนี้ยบพร้อมออกงาน'], ['well-kept', 'สะอาดใช้งานจริง'], ['worn', 'ผ่านการใช้งาน'], ['weathered', 'มีร่องรอยตามเรื่อง']]),
    extraPick('posture', 'การวางลำตัว', [['upright', 'หลังตรงผ่อนคลาย'], ['relaxed', 'สบายเป็นธรรมชาติ'], ['commanding', 'นิ่งสง่ามีน้ำหนัก'], ['alert', 'ตื่นตัวพร้อมเคลื่อนไหว'], ['slouched', 'ไหล่ตกตามการแสดง']]),
    extraPick('gestureStyle', 'ภาษามือ', [['gentle', 'นุ่มนวล'], ['restrained', 'น้อยและควบคุม'], ['precise', 'แม่นยำ'], ['open', 'เปิดรับ'], ['animated', 'แสดงออกชัด']]),
    extraPick('gazeStyle', 'ลักษณะสายตา', [['warm', 'อบอุ่น'], ['focused', 'มีสมาธิ'], ['attentive', 'ตั้งใจรับฟัง'], ['measured', 'ประเมินอย่างสุขุม'], ['challenging', 'ท้าทายเชิงการแสดง'], ['watchful', 'ระวังและสังเกต']]),
    range('movementEnergy', 'พลังการเคลื่อนไหว', { extension: 'casting-v1' }),
    extraPick('smileStyle', 'ลักษณะรอยยิ้ม', [['subtle', 'ยิ้มอ่อน'], ['open', 'ยิ้มเปิดเผย'], ['controlled', 'ยิ้มอย่างควบคุม'], ['asymmetric', 'ยิ้มมุมปาก']]),
    extraPick('signatureProp', 'อุปกรณ์ประจำบท', [['none', 'ไม่มี'], ['watch', 'นาฬิกา'], ['folder', 'แฟ้มงาน'], ['phone', 'โทรศัพท์'], ['book', 'หนังสือ'], ['notebook', 'สมุดจด'], ['tray', 'ถาดเสิร์ฟ'], ['badge', 'บัตรเจ้าหน้าที่'], ['stethoscope', 'หูฟังแพทย์'], ['bag', 'กระเป๋า']]),
    extraPick('makeupFinish', 'ผิวงานแต่งหน้า', [['natural', 'ผิวจริงเป็นธรรมชาติ'], ['satin', 'ซาตินนุ่ม'], ['matte', 'แมตต์'], ['dewy', 'ฉ่ำน้ำ']]),
    extraPick('layering', 'การสวมทับ', [['single', 'ชั้นเดียว'], ['blazer', 'เบลเซอร์'], ['coat', 'เสื้อคลุมทำงาน'], ['apron', 'ผ้ากันเปื้อน'], ['jacket', 'แจ็กเก็ต']]),
    extraPick('grooming', 'การดูแลลุค', [['neat', 'เรียบร้อย'], ['natural', 'เป็นธรรมชาติ'], ['practical', 'คล่องตัวเหมาะกับงาน'], ['lived-in', 'มีร่องรอยชีวิตตามฉาก']])
  ] }
);
export const DNA_FIELDS = GROUPS.flatMap(group => group.fields.map(field => ({ ...field, group: group.id, permanent: true })));
export const STYLE_FIELDS = STYLING.flatMap(group => group.fields.map(field => ({ ...field, group: group.id, permanent: false })));
export const FIELDS = [...DNA_FIELDS, ...STYLE_FIELDS];
export const LEGACY_FIELDS = FIELDS.filter(field => !field.extension);
export const ARCHETYPES = [['fox', 'Fox · เรียวคม'], ['cat', 'Cat · โค้งชัด'], ['wolf', 'Wolf · โครงชัด'], ['soft', 'Soft · อ่อนโยน'], ['sharp', 'Sharp · คมชัด'], ['elegant', 'Elegant · สง่างาม'], ['custom', 'Custom · อิสระ']];
export const LEVELS = ['น้อยมาก', 'ค่อนข้างน้อย', 'ปานกลาง', 'ค่อนข้างมาก', 'มากเป็นพิเศษ'];
export const clone = value => structuredClone(value);
export const id = () => crypto.randomUUID();
export function defaults(fields) { return Object.fromEntries(fields.map(field => [field.id, clone(field.default)])); }
export function newProfile() {
  return { schemaVersion: VERSION, characterId: id(), name: '', nameLocked: false, randomName: true, characterType: 'auto', project: '', presentation: 'custom', age: 26, role: 'นักออกแบบ', aestheticStyle: 'thai-modern', archetype: 'custom', personalityDirection: 'สงบนิ่งแต่มีเป้าหมาย', bodyHeight: 170, bodyBuild: 'สมส่วน', randomSeed: 'character-001', facialDNA: defaults(DNA_FIELDS), appearance: defaults(STYLE_FIELDS), locks: {}, selectedGroups: [], sameIdentity: true, trendingRandom: true, output: { mode: 'hero', layoutId: 'LS-STD-9x16-V1', language: 'th', theme: 'light' }, randomization: null };
}
export function normalizeDraft(profile) {
  profile.characterType ??= 'auto'; profile.nameLocked ??= false; profile.randomName ??= true;
  for (const field of STYLE_FIELDS.filter(field => field.extension)) if (profile.appearance[field.id] === undefined) profile.appearance[field.id] = clone(field.default);
  return profile;
}
export function fieldValue(profile, field) { return profile[field.permanent ? 'facialDNA' : 'appearance'][field.id]; }
export function setField(profile, field, value) { profile[field.permanent ? 'facialDNA' : 'appearance'][field.id] = value; }
export function describe(field, value) {
  if (field.type === 'range') return `${field.label}${LEVELS[Number(value) - 1]}`;
  if (field.type === 'multi') return value.length ? `${field.label}บริเวณ${value.map(item => field.options.find(option => option.value === item)?.label).join('และ')}` : `ไม่มี${field.label}`;
  if (field.type === 'color') return `โทนสีชุด ${value}`;
  return `${field.label}${field.options.find(option => option.value === value)?.label || value}`;
}
export function assertSafe(value, depth = 0) {
  if (depth > 24) throw new Error('โครงสร้างข้อมูลลึกเกินไป');
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value) && value.length > 3000) throw new Error('จำนวนข้อมูลในชุดมากเกินไป');
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('ข้อมูลมีชื่อฟิลด์ที่ไม่ปลอดภัย');
    assertSafe(child, depth + 1);
  }
}
export function validateProfile(profile) {
  assertSafe(profile);
  if (profile?.schemaVersion !== VERSION || typeof profile.characterId !== 'string' || !profile.characterId || profile.characterId.length > 100) throw new Error('ไม่รองรับเวอร์ชันหรือรหัสตัวละครนี้');
  if (!['male', 'female', 'custom'].includes(profile.presentation) || !ARCHETYPES.some(([key]) => key === profile.archetype)) throw new Error('เพศ/Archetype ไม่ถูกต้อง');
  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 120) throw new Error('อายุสมมติต้องอยู่ระหว่าง18–120ปี');
  for (const key of ['name', 'project', 'role', 'personalityDirection', 'bodyBuild', 'randomSeed', 'aestheticStyle']) if (typeof profile[key] !== 'string' || profile[key].length > 300) throw new Error(`ข้อมูล ${key} ไม่ถูกต้องหรือยาวเกินไป`);
  if (!Number.isFinite(profile.bodyHeight) || profile.bodyHeight < 100 || profile.bodyHeight > 240) throw new Error('ส่วนสูงต้องอยู่ระหว่าง100–240ซม.');
  for (const field of FIELDS) {
    const value = fieldValue(profile, field);
    if (field.extension && value === undefined) continue; // Older immutable snapshots remain valid.
    if (field.type === 'range' && (!Number.isInteger(value) || value < 1 || value > 5)) throw new Error(`${field.label} ต้องมีค่า1–5`);
    if (field.type === 'select' && !field.options.some(option => option.value === value)) throw new Error(`${field.label} มีค่าที่ไม่รองรับ`);
    if (field.type === 'multi' && (!Array.isArray(value) || value.length > field.options.length || new Set(value).size !== value.length || value.some(item => !field.options.some(option => option.value === item)))) throw new Error(`${field.label} ไม่ถูกต้อง`);
    if (field.type === 'color' && !/^#[a-f0-9]{6}$/i.test(value)) throw new Error('รหัสสีไม่ถูกต้อง');
  }
  if (!profile.output || !['hero', 'looksheet', 'scene'].includes(profile.output.mode) || !['light', 'dark', 'burgundy'].includes(profile.output.theme) || profile.output.layoutId !== 'LS-STD-9x16-V1') throw new Error('รูปแบบ Prompt ไม่ถูกต้อง');
  if (!profile.locks || typeof profile.locks !== 'object' || Array.isArray(profile.locks) || Object.entries(profile.locks).some(([key, value]) => !FIELDS.some(field => field.id === key) || typeof value !== 'boolean')) throw new Error('ข้อมูล Lock ไม่ถูกต้อง');
  if (!Array.isArray(profile.selectedGroups) || profile.selectedGroups.some(key => ![...GROUPS, ...STYLING].some(group => group.id === key))) throw new Error('กลุ่มสุ่มไม่ถูกต้อง');
  if (typeof profile.sameIdentity !== 'boolean') throw new Error('ค่าการรักษาเอกลักษณ์ไม่ถูกต้อง');
  if (profile.trendingRandom !== undefined && typeof profile.trendingRandom !== 'boolean') throw new Error('ค่า Trending Random ไม่ถูกต้อง');
  if (profile.characterType !== undefined && !CHARACTER_TYPES.some(([key]) => key === profile.characterType)) throw new Error('ประเภทตัวละครไม่ถูกต้อง');
  for (const key of ['nameLocked', 'randomName']) if (profile[key] !== undefined && typeof profile[key] !== 'boolean') throw new Error('ค่าการสุ่ม/ล็อกชื่อไม่ถูกต้อง');
  return profile;
}
export function warnings(profile) {
  const dna = profile.facialDNA, result = [];
  if (dna.faceShape === 'round' && dna.faceLength >= 4) result.push('หน้ากลมร่วมกับใบหน้ายาวเป็นรูปผสมที่ทำได้ ตรวจคำบรรยายก่อนใช้');
  if (dna.facialSymmetry >= 4 && dna.subtleAsymmetry >= 4) result.push('ตั้งสมมาตรสูงและความไม่สมมาตรสูงพร้อมกัน แนะนำเลือกเน้นอย่างใดอย่างหนึ่ง');
  if (profile.output.mode === 'looksheet') result.push('Looksheet มี18ภาพย่อยในแผ่น9:16 ควรสร้างความละเอียดสูง และตรวจใบหน้า/ข้อความด้วยสายตา');
  return result;
}
