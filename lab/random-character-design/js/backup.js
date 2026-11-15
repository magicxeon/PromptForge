import { LIMITS, assertSafe, clone, id, validateProfile } from './schema.js';
import { STORES } from './storage.js';
const FORMAT = 'character-dna-studio';
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
export function checkImage(bytes, mime) {
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!ALLOWED_IMAGES.includes(mime) || !({ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp }[mime])) throw new Error('รับเฉพาะไฟล์ภาพ JPEG/PNG/WebP ที่ถูกต้อง');
  if (bytes.length > LIMITS.imageBytes) throw new Error('ภาพต้องไม่เกิน5MB');
}
export function envelope(data, includeImages) {
  return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), stores: Object.fromEntries(STORES.map(name => [name, name === 'images' ? includeImages ? data.images.map(({ blob, ...metadata }) => metadata) : [] : clone(data[name])])) };
}
export async function exportBackup(data, withImages) {
  const manifest = envelope(data, withImages);
  if (!withImages) return new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  if (!globalThis.JSZip) throw new Error('โหลด ZIP library ไม่สำเร็จ กรุณาเปิดเครื่องมือผ่าน local server');
  const zip = new JSZip(); zip.file('manifest.json', JSON.stringify(manifest));
  let total = 0;
  for (const image of data.images) {
    total += image.blob.size;
    if (total > LIMITS.backupBytes) throw new Error('ภาพรวมเกิน100MB กรุณาแบ่งสำรองข้อมูล');
    zip.file(`images/${image.id}`, await image.blob.arrayBuffer());
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
function validateRecord(name, record) {
  if (!record || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(record.id)) throw new Error('รหัสรายการไม่ถูกต้อง');
  const validDate = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
  if (name !== 'settings' && !validDate(record.createdAt)) throw new Error('วันที่สร้างรายการไม่ถูกต้อง');
  if (name === 'characters' && !validDate(record.updatedAt)) throw new Error('วันที่แก้ไขตัวละครไม่ถูกต้อง');
  if (name === 'settings') {
    const value = record.value;
    if (record.id === 'draft') {
      validateProfile(value?.profile);
      if (!Array.isArray(value.imageIds) || value.imageIds.length > 200 || value.imageIds.some(key => typeof key !== 'string')) throw new Error('ร่างมีรายการภาพไม่ถูกต้อง');
      return;
    }
    if (record.id !== 'preferences' || !value || !['light', 'dark', 'burgundy'].includes(value.theme) || !Number.isFinite(value.high) || !Number.isFinite(value.moderate) || !(value.high > value.moderate && value.high <= 100 && value.moderate >= 0) || !Number.isInteger(value.candidateCount) || value.candidateCount < 20 || value.candidateCount > 200 || !['both', 'library', 'history'].includes(value.scope)) throw new Error('การตั้งค่าในไฟล์ไม่ถูกต้อง');
  } else if (name === 'images') {
    if (!ALLOWED_IMAGES.includes(record.mimeType)) throw new Error('ประเภทภาพใน backup ไม่รองรับ');
  } else {
    validateProfile(record.profile);
    if (name === 'characters' && record.id !== record.profile.characterId) throw new Error('รหัส Character ไม่ตรงกับข้อมูล Profile');
    if (record.characterId && record.characterId !== record.profile.characterId) throw new Error('การเชื่อมโยง Character ไม่ถูกต้อง');
    if (record.versions && (!Array.isArray(record.versions) || record.versions.length > 100)) throw new Error('เวอร์ชันตัวละครไม่ถูกต้องหรือมากเกินไป');
    for (const version of record.versions || []) { validateProfile(version.profile); if (!validDate(version.savedAt)) throw new Error('วันที่เวอร์ชันตัวละครไม่ถูกต้อง'); }
    if (name === 'generations' && (typeof record.promptText !== 'string' || !record.promptText)) throw new Error('History ต้องมี Prompt Snapshot ต้นฉบับ');
    if (record.promptText !== undefined && (typeof record.promptText !== 'string' || record.promptText.length > 200000)) throw new Error('Prompt ไม่ถูกต้องหรือยาวเกินไป');
    if (record.imageIds && (!Array.isArray(record.imageIds) || record.imageIds.length > 200 || record.imageIds.some(value => typeof value !== 'string'))) throw new Error('รายการภาพไม่ถูกต้อง');
  }
}
export function validateEnvelope(value) {
  assertSafe(value);
  if (value?.format !== FORMAT || value.version !== 1 || !value.stores) throw new Error('ไฟล์นี้ไม่ใช่ Backup Character DNA รุ่นที่รองรับ');
  for (const name of STORES) {
    const records = value.stores[name];
    if (!Array.isArray(records) || records.length > (LIMITS[name] || 5)) throw new Error(`จำนวน ${name} ไม่ถูกต้องหรือเกินขีดจำกัด`);
    if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('มีรหัสซ้ำภายในไฟล์');
    for (const record of records) validateRecord(name, record);
  }
  return value;
}
export async function parseBackup(file) {
  if (file.size > LIMITS.backupBytes) throw new Error('Backup ต้องไม่เกิน100MB');
  let value;
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const files = Object.values(zip.files).filter(entry => !entry.dir);
    if (files.length > LIMITS.images + 1 || files.some(entry => !/^(manifest\.json|images\/[a-zA-Z0-9_-]{1,100})$/.test(entry.name))) throw new Error('ZIP มีไฟล์หรือเส้นทางที่ไม่รองรับ');
    const manifest = zip.file('manifest.json');
    if (!manifest || manifest._data?.uncompressedSize > 10 * 1024 ** 2) throw new Error('Manifest ขาดหายหรือใหญ่เกินไป');
    value = validateEnvelope(JSON.parse(await manifest.async('string')));
    let total = 0;
    for (const image of value.stores.images) {
      const entry = zip.file(`images/${image.id}`);
      if (!entry || entry._data?.uncompressedSize > LIMITS.imageBytes) throw new Error('ภาพขาดหายหรือใหญ่เกินไป');
      total += entry._data?.uncompressedSize || 0;
      if (total > LIMITS.backupBytes) throw new Error('ข้อมูลที่คลาย ZIP ใหญ่เกินไป');
      const bytes = await entry.async('uint8array'); checkImage(bytes, image.mimeType);
      image.blob = new Blob([bytes], { type: image.mimeType });
    }
  } else {
    if (file.size > 10 * 1024 ** 2) throw new Error('JSON ต้องไม่เกิน10MB');
    value = JSON.parse(await file.text());
    if (value?.format === 'character-dna-profile') {
      validateProfile(value.profile);
      value = { format: FORMAT, version: 1, stores: { characters: [{ id: value.profile.characterId, profile: value.profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), imageIds: [], versions: [] }], generations: [], presets: [], images: [], settings: [] } };
    }
    validateEnvelope(value);
    if (value.stores.images.length) throw new Error('JSON ไม่มีไฟล์ภาพ กรุณาใช้ ZIP หากต้องการนำเข้าภาพ');
  }
  return value;
}
export function planImport(incoming, existing, strategy) {
  validateEnvelope(incoming);
  if (!['skip', 'merge', 'copy'].includes(strategy)) throw new Error('รูปแบบการนำเข้าไม่ถูกต้อง');
  const data = clone(incoming.stores), imageMap = new Map(), characterMap = new Map(), generationMap = new Map();
  if (strategy === 'copy') {
    for (const image of data.images) imageMap.set(image.id, id());
    for (const generation of data.generations) generationMap.set(generation.id, id());
    for (const name of ['characters', 'generations', 'presets']) for (const record of data[name]) if (!characterMap.has(record.profile.characterId)) characterMap.set(record.profile.characterId, id());
    for (const name of STORES) for (const record of data[name]) {
      if (name === 'settings') continue;
      record.id = name === 'images' ? imageMap.get(record.id) : name === 'characters' ? characterMap.get(record.profile.characterId) : name === 'generations' ? generationMap.get(record.id) : id();
      if (record.profile) {
        record.profile.characterId = characterMap.get(record.profile.characterId);
        for (const version of record.versions || []) { version.profile.characterId = record.profile.characterId; if (version.imageIds) version.imageIds = version.imageIds.map(key => imageMap.get(key)).filter(Boolean); }
      }
      if (record.characterId) record.characterId = characterMap.get(record.characterId) || record.characterId;
      if (record.imageIds) record.imageIds = record.imageIds.map(key => imageMap.get(key)).filter(Boolean);
      if (record.generationId) record.generationId = generationMap.get(record.generationId) || null;
    }
    data.settings = [];
  }
  const imageIds = new Set([...existing.images, ...data.images].map(record => record.id));
  const changes = []; let skipped = 0, missingImages = 0;
  for (const name of STORES) {
    let additions = 0;
    for (const record of data[name]) {
      const previous = existing[name].find(item => item.id === record.id);
      if (previous && strategy === 'skip') { skipped++; continue; }
      if (previous && strategy === 'merge') {
        // Reimporting the same snapshot is a no-op. Library merges preserve the old version.
        if (name === 'characters' && JSON.stringify(previous.profile) !== JSON.stringify(record.profile)) {
          record.versions = [...(previous.versions || []), { profile: clone(previous.profile), savedAt: previous.updatedAt }];
          if (record.versions.length > 100) throw new Error('เวอร์ชันเกิน100 กรุณาใช้สำเนาใหม่');
        }
        if (name === 'generations') { skipped++; continue; }
      }
      if (record.imageIds) record.imageIds = record.imageIds.filter(key => { if (imageIds.has(key)) return true; missingImages++; return false; });
      if (!previous) additions++;
      changes.push({ store: name, record });
    }
    if (LIMITS[name] && existing[name].length + additions > LIMITS[name]) throw new Error(`Import จะเกินขีดจำกัด ${name}`);
  }
  return { changes, skipped, missingImages };
}
