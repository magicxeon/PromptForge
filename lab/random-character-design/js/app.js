import { ARCHETYPES, DNA_FIELDS, FIELDS, GROUPS, STYLING, STYLE_FIELDS, LIMITS, clone, defaults, describe, fieldValue, id, newProfile, normalizeDraft, setField, validateProfile, warnings } from './schema.js';
import { canonicalDNA, closest, compareDNA, hash, similarityLabel } from './similarity.js';
import { randomize, replay, prng } from './randomizer.js';
import { CHARACTER_TYPES, castingRole, internationalName } from './casting.js';
import { recordedLeadingRecipe } from './trending.js';
import { compose, LAYOUT, MODE_LABELS } from './composer.js';
import { commit, DEFAULT_SETTINGS, ensureCapacity, openDatabase, readAll } from './storage.js';
import { checkImage, exportBackup, parseBackup, planImport } from './backup.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let profile = newProfile(), settings = { ...DEFAULT_SETTINGS }, data = { characters: [], generations: [], presets: [], images: [], settings: [] };
let view = 'builder', currentGenerationId = null, draftImageIds = [], comparedId = '', imported = null, busy = false, available = false, randomCounter = 0;
let seedBase = profile.randomSeed;
let preview, draftTimer, toastTimer;
const imageURLs = new Map();
const date = value => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const localDate = value => { const moment = new Date(value); return `${moment.getFullYear()}-${String(moment.getMonth() + 1).padStart(2, '0')}-${String(moment.getDate()).padStart(2, '0')}`; };
const title = record => record.profile.name || 'ตัวละครยังไม่มีชื่อ';
const allRecords = () => [...data.characters.map(record => ({ ...record, source: 'library' })), ...data.generations.map(record => ({ ...record, source: 'history' }))];
const comparisonPool = () => settings.scope === 'library' ? data.characters : settings.scope === 'history' ? data.generations : allRecords();
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function storageError(error) { $('#storage-error').hidden = false; $('#storage-error').textContent = error.message || String(error); }
function dialog(titleText, html) { $('#dialog-title').textContent = titleText; $('#dialog-body').innerHTML = html; if (!$('#utility-dialog').open) $('#utility-dialog').showModal(); }
function closeDialog() { $('#utility-dialog').close(); }
function download(blob, filename) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function filename(suffix) { return `character-dna-${new Date().toISOString().slice(0, 10)}${suffix}`; }
function imageURL(imageId) { const image = data.images.find(item => item.id === imageId); if (!image?.blob) return ''; if (!imageURLs.has(imageId)) imageURLs.set(imageId, URL.createObjectURL(image.blob)); return imageURLs.get(imageId); }
function releaseImages() { for (const url of imageURLs.values()) URL.revokeObjectURL(url); imageURLs.clear(); }
function profileSelect(key, label, options) {
  return `<label>${label}<select data-profile="${key}" id="profile-${key}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
}
function renderForm() {
  $('#profile-fields').innerHTML = `<label>ชื่อตัวละคร<input data-profile="name" id="character-name" maxlength="120" placeholder="เช่น Adrian Bennett"></label><label>Project<input data-profile="project" maxlength="120" placeholder="ชื่อเรื่อง / โปรเจกต์"></label>`
    + `<div class="name-controls full-row"><button type="button" data-action="random-name">⚄ สุ่มชื่อสากล</button><button type="button" data-action="lock-name" id="lock-name" aria-pressed="false">◇ ล็อกชื่อ</button><label><input type="checkbox" id="random-name-auto"> สุ่มชื่อพร้อมสุ่มทั้งหมด / Archetype / Novelty</label></div>`
    + profileSelect('presentation', 'เพศ / การนำเสนอ', [['custom', 'Custom · อิสระ'], ['female', 'Female · หญิง'], ['male', 'Male · ชาย']])
    + `<label>อายุสมมติ<input data-profile="age" type="number" min="18" max="120"></label>`
    + `<div class="full-row">${profileSelect('characterType', 'ประเภทตัวละครในละคร', CHARACTER_TYPES)}<p id="casting-note" class="help"></p></div>`
    + profileSelect('archetype', 'Archetype', ARCHETYPES)
    + profileSelect('aestheticStyle', 'แนวภาพ', [['thai-modern', 'ไทยร่วมสมัย'], ['chinese-modern', 'จีนร่วมสมัย'], ['european-modern', 'ยุโรปร่วมสมัย'], ['international', 'สากล'], ['custom', 'อิสระ']])
    + `<label>อาชีพ / บทบาทในฉาก<input data-profile="role" maxlength="120"></label><label>ทิศทางการแสดง<input data-profile="personalityDirection" maxlength="300"></label><label>ส่วนสูง (ซม.)<input data-profile="bodyHeight" type="number" min="100" max="240"></label><label>รูปร่าง<input data-profile="bodyBuild" maxlength="120"></label>`;
  function groupHTML(group) {
    return `<details class="attribute-group" data-group="${group.id}" ${['geometry', 'eyes', 'hair'].includes(group.id) ? 'open' : ''}><summary><input type="checkbox" data-group-select="${group.id}" aria-label="เลือกสุ่มกลุ่ม${group.label}"><span>${group.label}</span><small>${group.fields.length} ค่า</small></summary><div class="attribute-fields">${group.fields.map((definition, index) => {
      const field = FIELDS.find(item => item.id === definition.id), inputId = `field-${field.id}`;
      let control = field.type === 'range' ? `<input id="${inputId}" data-field="${field.id}" type="range" min="1" max="5" step="1"><output for="${inputId}" data-output="${field.id}"></output>`
        : field.type === 'multi' ? `<fieldset id="${inputId}" class="multi-options" aria-label="${field.label}"><legend class="sr-only">${field.label}</legend>${field.options.map(option => `<label><input type="checkbox" data-field="${field.id}" value="${option.value}">${option.label}</label>`).join('')}</fieldset>`
          : field.type === 'color' ? `<input id="${inputId}" data-field="${field.id}" type="color">`
            : `<select id="${inputId}" data-field="${field.id}">${field.options.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}</select>`;
      return `<div class="attribute-row ${index > 1 ? 'advanced-field' : ''}"><div class="attribute-label"><label ${field.type === 'multi' ? '' : `for="${inputId}"`}>${field.label}</label><div class="field-tools"><button type="button" data-action="reroll" data-id="${field.id}" title="สุ่มเฉพาะ${field.label}" aria-label="สุ่ม${field.label}">⚄</button><button type="button" data-action="lock" data-id="${field.id}" aria-label="ล็อก${field.label}" aria-pressed="false">◇</button></div></div><div class="attribute-control">${control}</div></div>`;
    }).join('')}</div></details>`;
  }
  $('#dna-fields').innerHTML = GROUPS.map(groupHTML).join(''); $('#style-fields').innerHTML = STYLING.map(groupHTML).join('');
  syncForm();
}
function syncForm() {
  normalizeDraft(profile);
  profile.trendingRandom ??= true;
  $('#trending-random').checked = profile.trendingRandom;
  $('#random-name-auto').checked = profile.randomName;
  $('#lock-name').setAttribute('aria-pressed', String(profile.nameLocked));
  $('#lock-name').textContent = profile.nameLocked ? '◆ ปลดล็อกชื่อ' : '◇ ล็อกชื่อ';
  for (const element of document.querySelectorAll('[data-profile]')) element.value = profile[element.dataset.profile];
  for (const element of document.querySelectorAll('[data-field]')) {
    const field = FIELDS.find(item => item.id === element.dataset.field), value = fieldValue(profile, field);
    if (field.type === 'multi') element.checked = value.includes(element.value); else element.value = value;
  }
  for (const element of document.querySelectorAll('[data-group-select]')) element.checked = profile.selectedGroups.includes(element.dataset.groupSelect);
  for (const element of document.querySelectorAll('[data-output]')) element.value = profile.facialDNA[element.dataset.output] ?? profile.appearance[element.dataset.output];
  for (const button of document.querySelectorAll('[data-action="lock"]')) {
    const locked = Boolean(profile.locks[button.dataset.id]); button.setAttribute('aria-pressed', String(locked)); button.textContent = locked ? '◆' : '◇';
    button.title = `${locked ? 'ปลดล็อก' : 'ล็อก'}${FIELDS.find(field => field.id === button.dataset.id).label}`;
  }
  $('#lock-all').textContent = DNA_FIELDS.every(field => profile.locks[field.id]) ? 'ปลดล็อก DNA ทั้งหมด' : 'ล็อก DNA ทั้งหมด';
  $('#same-identity').checked = profile.sameIdentity;
  for (const button of document.querySelectorAll('.mode-tabs button')) button.setAttribute('aria-pressed', String(button.dataset.mode === profile.output.mode));
}
function markDraft() { currentGenerationId = null; updatePreview(); }
function scheduleDraft() {
  clearTimeout(draftTimer);
  if (!available) return;
  draftTimer = setTimeout(async () => {
    try {
      validateProfile(profile);
      const record = { id: 'draft', value: { profile: clone(profile), imageIds: [...draftImageIds] } };
      await commit([{ store: 'settings', record }]);
      data.settings = [...data.settings.filter(item => item.id !== 'draft'), record];
    } catch (error) { if (!preview) return; storageError(error); }
  }, 500);
}
function updatePreview() {
  const role = castingRole(profile);
  $('#casting-note').textContent = `${role.focus} · ใช้ในการสุ่มครั้งถัดไป ไม่เปลี่ยนเพศหรืออาชีพ`;
  const casting = recordedLeadingRecipe(profile)?.label || { male: 'พระเอกหล่ออบอุ่น / หล่อคม', female: 'นางเอกหวานละมุน / สวยคมสง่า', custom: 'คัดโครงหน้าตัวเอก 4 แนว' }[profile.presentation];
  $('#trending-note').textContent = profile.trendingRandom
    ? ['light', 'medium'].includes(profile.facialDNA.skinTone) ? `${role.id === 'auto' ? casting : role.label} · พูลเฉพาะบท · ผิวอ่อน–กลาง · เคารพ Lock / กลุ่มที่เลือก` : profile.locks.skinTone ? 'สีผิวอยู่นอกพรีเซ็ต แต่ถูกล็อกไว้ จึงคงค่าเดิม' : 'ผิวเดิมอยู่นอกพรีเซ็ต จะปรับเมื่อสุ่มกลุ่มผิวที่ไม่ได้ล็อก'
    : 'สุ่มแบบอิสระ ใช้ทุกตัวเลือกสีผิวและรูปลักษณ์เดิม';
  try { preview = compose(profile); $('#prompt-output').value = preview.text; $('#generate').disabled = busy; }
  catch (error) { preview = null; $('#prompt-output').value = ''; $('#generate').disabled = true; $('#validation-warnings').innerHTML = `<div class="warning">${esc(error.message)}</div>`; return; }
  $('#prompt-status').textContent = currentGenerationId ? 'บันทึก History แล้ว' : 'ร่าง · ยังไม่บันทึก';
  $('#prompt-count').textContent = `${preview.text.length.toLocaleString('th-TH')} ตัวอักษร`;
  $('#validation-warnings').innerHTML = warnings(profile).map(message => `<div class="warning">${esc(message)}</div>`).join('');
  const important = ['faceShape', 'eyeShape', 'browShape', 'skinTone', 'chinShape'];
  $('#dna-summary').innerHTML = `<div class="identity-emblem" aria-hidden="true">✧</div><h3 class="identity-name">${esc(profile.name || 'ตัวละครของคุณ')}</h3><p class="identity-meta">${esc(profile.role)} · ${profile.age} ปี · ${esc(ARCHETYPES.find(([key]) => key === profile.archetype)?.[1])}</p><div class="dna-chips">${important.map(key => `<span>${esc(describe(DNA_FIELDS.find(field => field.id === key), profile.facialDNA[key]))}</span>`).join('')}</div><div class="dna-stat"><span>Permanent DNA</span><strong>${DNA_FIELDS.length} Attributes / 13 กลุ่ม</strong></div><div class="dna-stat"><span>ค่าที่ล็อก</span><strong>${FIELDS.filter(field => profile.locks[field.id]).length} / ${FIELDS.length}</strong></div><div class="dna-stat"><span>Prompt mode</span><strong>${MODE_LABELS[profile.output.mode]}</strong></div><div class="dna-fingerprint">DNA ${hash(canonicalDNA(profile.facialDNA))} · ID ${esc(profile.characterId.slice(0, 8))}</div>`;
  const near = closest(profile.facialDNA, comparisonPool(), currentGenerationId);
  $('#closest-matches').innerHTML = near.length ? near.map(item => `<button class="nearest-item" data-action="compare-record" data-id="${esc(item.record.id)}"><span>${item.score.toFixed(1)}%</span><span><strong>${esc(title(item.record))}</strong><small>${similarityLabel(item, settings)}</small></span></button>`).join('') : '<p class="help">ยังไม่มีประวัติให้เปรียบเทียบ (No history to compare)</p>';
  scheduleDraft();
}
function renderReferences() {
  releaseImages();
  $('#reference-images').innerHTML = draftImageIds.map(imageId => { const url = imageURL(imageId); return url ? `<div class="reference-tile"><img src="${url}" alt="ภาพอ้างอิงตัวละคร"><button data-action="detach-image" data-id="${esc(imageId)}" aria-label="นำภาพอ้างอิงออกจากร่าง">×</button></div>` : ''; }).join('');
}
async function refresh() {
  data = await readAll();
  $('#library-count').textContent = data.characters.length; $('#history-count').textContent = data.generations.length;
  updatePreview(); renderReferences();
  if (view === 'library' || view === 'history') renderRecords();
  if (view === 'compare') renderCompare();
  await storageUsage();
}
async function storageUsage() {
  const estimate = await navigator.storage?.estimate?.();
  $('#storage-usage').textContent = estimate?.usage !== undefined ? `Browser origin: ${(estimate.usage / 1024 ** 2).toFixed(1)} MB` : 'IndexedDB / local only';
  if (estimate?.quota && estimate.usage / estimate.quota > .85) storageError(new Error('ใช้พื้นที่ Browser เกิน85% กรุณา Export Backup และ Cleanup รายการที่ไม่ใช้'));
}
function navigate(next) {
  view = next;
  $('#builder-view').hidden = next !== 'builder'; $('#records-view').hidden = !['library', 'history'].includes(next); $('#compare-view').hidden = next !== 'compare';
  for (const button of document.querySelectorAll('#navigation button')) { button.classList.toggle('active', button.dataset.view === next); if (button.dataset.view === next) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); }
  if (['library', 'history'].includes(next)) { setupFilters(); renderRecords(); }
  if (next === 'compare') renderCompare();
}
function setupFilters() {
  $('#records-title').textContent = view === 'library' ? 'คลังตัวละคร' : 'Generation History';
  $('#clear-history').hidden = view !== 'history';
  const records = view === 'library' ? data.characters : data.generations;
  $('#project-filter').innerHTML = '<option value="">ทั้งหมด</option>' + [...new Set(records.map(record => record.profile.project).filter(Boolean))].sort().map(project => `<option>${esc(project)}</option>`).join('');
  $('#archetype-filter').innerHTML = '<option value="">ทั้งหมด</option>' + ARCHETYPES.map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
}
function renderRecords() {
  const query = $('#record-search').value.trim().toLocaleLowerCase(), project = $('#project-filter').value, archetype = $('#archetype-filter').value, from = $('#date-filter').value, sort = $('#sort-filter').value;
  const records = [...(view === 'library' ? data.characters : data.generations)].filter(record => (!query || [record.profile.name, record.profile.project, record.profile.randomSeed, record.profile.archetype, record.promptText].join(' ').toLocaleLowerCase().includes(query)) && (!project || record.profile.project === project) && (!archetype || record.profile.archetype === archetype) && (!from || localDate(record.createdAt) >= from))
    .sort((a, b) => sort === 'name' ? title(a).localeCompare(title(b), 'th') : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  $('#records-grid').innerHTML = records.length ? records.map(record => {
    const result = compareDNA(profile.facialDNA, record.profile.facialDNA), url = record.imageIds?.[0] ? imageURL(record.imageIds[0]) : '';
    return `<article class="panel record-card">${url ? `<img src="${url}" alt="ภาพอ้างอิง${esc(title(record))}" loading="lazy">` : ''}<div class="record-meta">${esc(record.profile.project || 'ไม่มี Project')} · ${esc(MODE_LABELS[record.profile.output.mode])}</div><h3>${esc(title(record))}</h3><div class="record-meta">${date(record.createdAt)}<br>Seed ${esc(record.profile.randomSeed)} · ${esc(record.profile.archetype)}</div><p class="record-preview">${esc(record.promptText?.slice(0, 180) || compose(record.profile).text.slice(0, 180))}</p><span class="badge">${result.score.toFixed(1)}% กับร่าง · ${similarityLabel(result, settings)}</span><div class="record-actions"><button data-action="load-record" data-id="${esc(record.id)}" class="primary">โหลดร่าง</button><button data-action="inspect-record" data-id="${esc(record.id)}">ดู Prompt</button><button data-action="compare-record" data-id="${esc(record.id)}">Compare</button>${view === 'history' ? `<button data-action="library-from-history" data-id="${esc(record.id)}">เก็บใน Library</button>` : `<button data-action="versions" data-id="${esc(record.id)}">เวอร์ชัน (${record.versions?.length || 0})</button>`}<button data-action="delete-record" data-id="${esc(record.id)}" class="danger">ลบ</button></div></article>`;
  }).join('') : `<div class="empty-state"><span aria-hidden="true">◇</span><h3>${query || project || archetype || from ? 'ไม่พบรายการตามตัวกรอง' : view === 'library' ? 'ยังไม่มีตัวละครในคลัง' : 'ยังไม่มี Generation History'}</h3><p>กลับไปออกแบบและกด ${view === 'library' ? 'บันทึกตัวละคร' : 'Generate Prompt'} เพื่อเก็บรายการแรก</p><button data-action="navigate" data-view="builder">กลับไปออกแบบ</button></div>`;
}
function renderCompare() {
  const records = allRecords();
  if (!records.some(record => record.id === comparedId)) comparedId = records[0]?.id || '';
  $('#compare-select').innerHTML = records.map(record => `<option value="${esc(record.id)}" ${record.id === comparedId ? 'selected' : ''}>${esc(title(record))} · ${record.source === 'library' ? 'Library' : 'History'} · ${date(record.createdAt)}</option>`).join('');
  const record = records.find(item => item.id === comparedId);
  if (!record) { $('#compare-content').innerHTML = '<div class="empty-state">ยังไม่มีประวัติให้เปรียบเทียบ (No history to compare)</div>'; return; }
  const result = compareDNA(profile.facialDNA, record.profile.facialDNA);
  $('#compare-content').innerHTML = `<div class="compare-overview"><div class="panel"><p class="eyebrow">CURRENT DRAFT</p><h2>${esc(profile.name || 'ร่างปัจจุบัน')}</h2><p class="help">Seed ${esc(profile.randomSeed)} · ${esc(profile.archetype)}</p></div><div class="compare-score">${result.score.toFixed(1)}%<small>${similarityLabel(result, settings)}</small><small>${result.matches.length} ตรง / ${result.differences.length} ต่าง</small></div><div class="panel"><p class="eyebrow">${record.source.toUpperCase()}</p><h2>${esc(title(record))}</h2><p class="help">Seed ${esc(record.profile.randomSeed)} · ${esc(record.profile.archetype)}</p></div></div><div class="compare-actions"><button data-action="load-record" data-id="${esc(record.id)}">โหลดรายการนี้</button><button data-action="save-new" class="primary">บันทึกร่างเป็นตัวใหม่</button><button data-action="reroll-similar" class="secondary">สุ่มเฉพาะค่าที่คล้ายที่สุดและปลดล็อก</button></div><div class="compare-table-wrap"><table class="comparison-table"><thead><tr><th>Attribute</th><th>ร่างปัจจุบัน</th><th>รายการที่เลือก</th></tr></thead><tbody>${[...result.differences, ...result.matches].map(item => `<tr class="${item.distance ? 'different' : ''}"><th>${item.distance ? '≠ ' : '= '}${item.field.label}</th><td>${esc(describe(item.field, item.left))}</td><td>${esc(describe(item.field, item.right))}</td></tr>`).join('')}</tbody></table></div>`;
}
function loadRecord(record, asNew = false) {
  if (!record) throw new Error('ไม่พบรายการ');
  if (!confirm('โหลดรายการนี้เป็นร่าง? ร่างที่ยังไม่ได้บันทึกจะถูกแทนที่')) return;
  profile = clone(record.profile); if (asNew) profile.characterId = id();
  seedBase = profile.randomSeed; randomCounter = 0;
  draftImageIds = [...(record.imageIds || [])]; currentGenerationId = record.source === 'history' ? record.id : null;
  syncForm(); updatePreview(); renderReferences(); navigate('builder'); closeDialog(); toast('โหลดเป็นร่างแล้ว ต้นฉบับไม่เปลี่ยน');
}
async function saveCharacter(asNew = false, sourceRecord = null) {
  validateProfile(sourceRecord?.profile || profile);
  const savedProfile = clone(sourceRecord?.profile || profile), imageIds = [...(sourceRecord?.imageIds || draftImageIds)];
  if (asNew) savedProfile.characterId = id();
  const old = data.characters.find(record => record.id === savedProfile.characterId);
  if (!old) ensureCapacity('characters', data.characters.length);
  const near = closest(savedProfile.facialDNA, allRecords().filter(record => record.id !== old?.id), sourceRecord?.id || currentGenerationId, 1)[0];
  if (near?.exact && !confirm(`DNA ตรงกับ ${title(near.record)} ที่บันทึกไว้ ต้องการบันทึกต่อหรือไม่?`)) return;
  const versions = old ? [...(old.versions || []), { profile: clone(old.profile), promptText: old.promptText, imageIds: old.imageIds, savedAt: old.updatedAt }] : [];
  if (versions.length > 100) throw new Error('มีเวอร์ชันครบ100แล้ว กรุณาบันทึกเป็นตัวใหม่เพื่อเก็บข้อมูลเดิม');
  const now = new Date().toISOString(), record = { id: savedProfile.characterId, characterId: savedProfile.characterId, profile: savedProfile, project: savedProfile.project, archetype: savedProfile.archetype, createdAt: old?.createdAt || now, updatedAt: now, imageIds, versions, promptText: sourceRecord?.promptText || compose(savedProfile).text, fingerprint: canonicalDNA(savedProfile.facialDNA), generationId: sourceRecord?.id || currentGenerationId };
  await commit([{ store: 'characters', record }]);
  if (!sourceRecord) { profile.characterId = savedProfile.characterId; syncForm(); }
  await refresh(); toast(old ? 'บันทึกเวอร์ชันใหม่แล้ว' : 'เพิ่มตัวละครใน Library แล้ว');
}
async function generate() {
  validateProfile(profile); ensureCapacity('generations', data.generations.length);
  const snapshot = clone(profile), output = compose(snapshot), now = new Date().toISOString();
  const near = closest(snapshot.facialDNA, allRecords(), null, 1)[0];
  const record = { id: id(), characterId: snapshot.characterId, createdAt: now, project: snapshot.project, archetype: snapshot.archetype, profile: snapshot, promptText: output.text, composerVersion: output.version, fingerprint: canonicalDNA(snapshot.facialDNA), imageIds: [...draftImageIds], nearest: near ? { id: near.record.id, score: near.score, exact: near.exact } : null };
  await commit([{ store: 'generations', record }]); currentGenerationId = JSON.stringify(profile) === JSON.stringify(snapshot) ? record.id : null;
  await refresh(); toast(near?.exact ? `บันทึก History แล้ว · DNA ตรงกับ ${title(near.record)}` : 'Generate Prompt และบันทึก History แล้ว');
}
function doRandom(mode, selected = []) {
  if (mode === 'selective' && !selected.length) selected = [...profile.selectedGroups];
  const seed = `${seedBase || 'character'}:${++randomCounter}`;
  const result = randomize(profile, { mode, selected, seed, records: mode === 'novelty' ? comparisonPool() : [], candidateCount: settings.candidateCount, scope: settings.scope });
  profile = result.profile; syncForm(); markDraft();
  const tooClose = result.nearest && result.nearest.score >= settings.moderate;
  $('#random-note').textContent = !result.changed ? 'ค่าที่เลือกถูกล็อกทั้งหมด หรือสุ่มได้ค่าเดิม ไม่มีการปลดล็อกให้อัตโนมัติ' : mode === 'novelty' ? result.nearest ? `ลอง${settings.candidateCount}ชุด · ใกล้ที่สุด${result.nearest.score.toFixed(1)}%${tooClose ? ' — พื้นที่ค้นหายังแคบ ลองปลดล็อกบางค่า' : ''}` : 'ยังไม่มีประวัติให้เทียบ สุ่มตาม Seed โดยไม่อ้างว่าไม่ซ้ำ' : `เปลี่ยน${result.changed}ค่า · เก็บค่าที่ล็อกครบ · Seed ${seed}`;
}
function showSettings() {
  dialog('ตั้งค่าและสำรองข้อมูล', `<div class="settings-grid"><label>ธีม<select id="setting-theme">${[['light', 'Professional Light'], ['dark', 'Dark Cinematic'], ['burgundy', 'Burgundy / Gold']].map(([key, label]) => `<option value="${key}" ${settings.theme === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Novelty candidates<input id="setting-candidates" type="number" min="20" max="200" value="${settings.candidateCount}"></label><label>คะแนนคล้ายมาก (%)<input id="setting-high" type="number" min="1" max="100" value="${settings.high}"></label><label>คะแนนปานกลาง (%)<input id="setting-moderate" type="number" min="0" max="99" value="${settings.moderate}"></label><label class="full-row">ขอบเขตเปรียบเทียบ<select id="setting-scope"><option value="both">Library + History</option><option value="library">Library เท่านั้น</option><option value="history">History เท่านั้น</option></select></label></div><button data-action="save-settings" class="primary">บันทึกการตั้งค่า</button><hr><h3>ข้อมูลใน Browser นี้</h3><p class="help">${data.characters.length}/${LIMITS.characters} Characters · ${data.generations.length}/${LIMITS.generations} History · ${data.images.length}/${LIMITS.images} ภาพ<br>ข้อมูลไม่ Sync กับอุปกรณ์อื่น การล้าง Site Data อาจทำให้ข้อมูลหาย ควรเก็บ Backup ไว้ต่างหาก</p><div class="compact-actions"><button data-action="backup-json">Export JSON (ไม่มีภาพ)</button><button data-action="backup-zip">Export ZIP + ภาพ</button><button data-action="import">Import Backup / DNA</button><button data-action="cleanup-images">ลบภาพที่ไม่ถูกอ้างอิง</button></div><p class="help">Similarity config v1 · geometry20 / eyes20 / brows10 / nose15 / jaw-cheeks-chin15 / lips10 / skin-marks10<br>Seed ย้อนเฉพาะ Attributes ไม่รับประกันภาพ AI; Looksheet เป็น Prompt-only</p>`);
  $('#setting-scope').value = settings.scope;
}
async function saveSettings() {
  const value = { theme: $('#setting-theme').value, candidateCount: Number($('#setting-candidates').value), high: Number($('#setting-high').value), moderate: Number($('#setting-moderate').value), scope: $('#setting-scope').value };
  if (!Number.isInteger(value.candidateCount) || value.candidateCount < 20 || value.candidateCount > 200 || !Number.isFinite(value.high) || !Number.isFinite(value.moderate) || value.high <= value.moderate || value.high > 100 || value.moderate < 0) throw new Error('กำหนด0 ≤ Moderate < High ≤100 และจำนวน Candidate20–200');
  await commit([{ store: 'settings', record: { id: 'preferences', value } }]); settings = value;
  document.documentElement.dataset.theme = value.theme; profile.output.theme = value.theme; closeDialog(); await refresh(); toast('บันทึกการตั้งค่าแล้ว');
}
function showWireframe() {
  dialog('Looksheet · LS-STD-9x16-V1', `<p class="help">Wireframe เท่านั้น · หนึ่งตัวละคร / 9:16 / 18ภาพย่อย<br>ทุกเพศใช้ลำดับและโครงเดียวกัน ภาพ AI จริงอาจคลาดเคลื่อน</p><div class="blueprint">${LAYOUT.panels.map(panel => `<div class="blueprint-section"><strong>${panel.title}</strong>${panel.count ? `<div class="blueprint-cells" style="grid-template-columns:repeat(${panel.count},minmax(0,1fr))">${Array.from({ length: panel.count }, (_, index) => `<span class="blueprint-cell">${panel.label.split(' · ')[index] || panel.label}</span>`).join('')}</div>` : `<span>${panel.label}</span>`}</div>`).join('')}</div>`);
}
async function addImages(files) {
  const changes = [], added = [];
  ensureCapacity('images', data.images.length, files.length);
  for (const file of files) {
    if (file.size > LIMITS.imageBytes) throw new Error('ภาพต้องไม่เกิน5MB');
    const bytes = new Uint8Array(await file.arrayBuffer()); checkImage(bytes, file.type);
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 8000 || bitmap.height > 8000) { bitmap.close(); throw new Error('ภาพต้องมีขนาดไม่เกิน8000px ต่อด้าน'); } bitmap.close();
    const imageId = id(); added.push(imageId);
    changes.push({ store: 'images', record: { id: imageId, characterId: profile.characterId, mimeType: file.type, blob: file, source: 'upload', createdAt: new Date().toISOString() } });
  }
  if (!changes.length) return;
  await commit(changes); draftImageIds.push(...added); await refresh(); toast('เพิ่มภาพอ้างอิงแล้ว');
}
async function prepareImport(file) {
  imported = await parseBackup(file);
  const totals = imported.stores;
  dialog('ตรวจสอบก่อนนำเข้า', `<p>Characters <strong>${totals.characters.length}</strong> · History <strong>${totals.generations.length}</strong> · Presets <strong>${totals.presets.length}</strong> · ภาพ <strong>${totals.images.length}</strong></p><p class="help">JSON ไม่รวมไฟล์ภาพ ส่วน ZIP รวมภาพที่แนบไว้ ไม่เขียนทับรายการเดิมโดยไม่ยืนยัน</p><label>วิธีจัดการรหัสซ้ำ<select id="import-strategy"><option value="skip">Skip · ข้ามรายการที่มีอยู่แล้ว</option><option value="merge">Merge by ID · อัปเดต Library / รักษา History เดิม</option><option value="copy">Create new copy · สร้างสำเนาใหม่พร้อมรหัสใหม่</option></select></label><p class="help">การนำเข้าไฟล์เดิมซ้ำในโหมด Skip/Merge ไม่เพิ่ม History ซ้ำ การสร้างสำเนาจะเพิ่มรายการโดยตั้งใจ</p><div class="dialog-actions"><button data-action="close-dialog">ยกเลิก</button><button data-action="confirm-import" class="primary">ยืนยันนำเข้า</button></div>`);
}
async function doImport() {
  const plan = planImport(imported, data, $('#import-strategy').value);
  if (plan.changes.length) await commit(plan.changes);
  imported = null; closeDialog(); await refresh();
  const preferences = data.settings.find(item => item.id === 'preferences');
  if (preferences) { settings = { ...DEFAULT_SETTINGS, ...preferences.value }; document.documentElement.dataset.theme = settings.theme; }
  toast(`นำเข้า${plan.changes.length}รายการ · ข้าม${plan.skipped}${plan.missingImages ? ` · ภาพที่ไม่มีไฟล์${plan.missingImages}รายการถูกนำออกจากลิงก์` : ''}`);
}
async function handleAction(button) {
  const action = button.dataset.action, recordId = button.dataset.id;
  switch (action) {
    case 'jump': { const target = document.getElementById(button.dataset.target); target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); break; }
    case 'navigate': navigate(button.dataset.view); break;
    case 'close-dialog': closeDialog(); break;
    case 'new': if (confirm('เริ่มตัวละครใหม่? บันทึกร่างที่ต้องการเก็บก่อน')) { profile = newProfile(); profile.output.theme = settings.theme; draftImageIds = []; currentGenerationId = null; randomCounter = 0; seedBase = profile.randomSeed; syncForm(); updatePreview(); renderReferences(); navigate('builder'); } break;
    case 'reset': if (confirm('คืนค่า DNA และรูปลักษณ์เริ่มต้น รวมช่องที่ล็อกไว้?')) { profile.facialDNA = defaults(DNA_FIELDS); profile.appearance = defaults(STYLE_FIELDS); profile.locks = {}; profile.randomization = null; syncForm(); markDraft(); } break;
    case 'mode': profile.output.mode = button.dataset.mode; syncForm(); markDraft(); break;
    case 'random': doRandom(button.dataset.mode); break;
    case 'random-name':
      if (profile.nameLocked) { toast('ชื่อถูกล็อกอยู่ ปลดล็อกชื่อก่อนสุ่ม'); break; }
      profile.name = internationalName(profile.presentation, prng(`name|${seedBase}:${++randomCounter}|${profile.presentation}`)); syncForm(); markDraft(); toast('สุ่มชื่อแล้ว · ไม่เปลี่ยน DNA'); break;
    case 'lock-name': profile.nameLocked = !profile.nameLocked; syncForm(); markDraft(); break;
    case 'reroll': doRandom('selective', [recordId]); break;
    case 'lock': profile.locks[recordId] = !profile.locks[recordId]; syncForm(); markDraft(); break;
    case 'lock-all': { const locked = !DNA_FIELDS.every(field => profile.locks[field.id]); for (const field of DNA_FIELDS) profile.locks[field.id] = locked; syncForm(); markDraft(); break; }
    case 'replay': profile = replay(profile); syncForm(); markDraft(); $('#random-note').textContent = 'Replay จาก Seed/ค่าตั้งต้นและล็อกที่บันทึกไว้แล้ว'; break;
    case 'generate': await generate(); break;
    case 'save': await saveCharacter(); break;
    case 'save-new': await saveCharacter(true); break;
    case 'copy': if (!preview) throw new Error('แก้ข้อมูลที่ไม่ถูกต้องก่อน'); try { await navigator.clipboard.writeText(preview.text); toast('คัดลอก Prompt แล้ว'); } catch { $('#prompt-output').focus(); $('#prompt-output').select(); toast('เลือกข้อความแล้ว กด Ctrl+C เพื่อคัดลอก'); } break;
    case 'download-txt': if (!preview) throw new Error('แก้ข้อมูลก่อนดาวน์โหลด'); download(new Blob([preview.text], { type: 'text/plain;charset=utf-8' }), filename('.txt')); break;
    case 'export-profile': validateProfile(profile); download(new Blob([JSON.stringify({ format: 'character-dna-profile', version: 1, profile }, null, 2)], { type: 'application/json' }), filename('-dna.json')); break;
    case 'backup-json': case 'backup-zip': download(await exportBackup(data, action === 'backup-zip'), filename(action === 'backup-zip' ? '.zip' : '.json')); toast(action === 'backup-json' ? 'Export JSON แล้ว (ไม่รวมภาพ)' : 'Export ZIP รวมภาพแล้ว'); break;
    case 'import': $('#backup-upload').click(); break;
    case 'confirm-import': await doImport(); break;
    case 'settings': showSettings(); break;
    case 'save-settings': await saveSettings(); break;
    case 'wireframe': showWireframe(); break;
    case 'load-record': loadRecord(allRecords().find(record => record.id === recordId)); break;
    case 'inspect-record': { const record = allRecords().find(item => item.id === recordId); dialog('Prompt Snapshot · ' + title(record), `<p class="help">${date(record.createdAt)} · ข้อความต้นฉบับที่บันทึก ไม่ถูกเปลี่ยนตาม Composer รุ่นใหม่</p><pre>${esc(record.promptText || compose(record.profile).text)}</pre><button data-action="load-record" data-id="${esc(record.id)}">โหลดเป็นร่าง</button>`); break; }
    case 'compare-record': comparedId = recordId; navigate('compare'); break;
    case 'library-from-history': await saveCharacter(false, data.generations.find(record => record.id === recordId)); break;
    case 'delete-record': { const store = view === 'library' ? 'characters' : 'generations'; if (confirm('ลบรายการนี้ถาวรจากเครื่องมือนี้? ภาพยังอยู่จนกว่าจะ Cleanup')) { await commit([{ store, id: recordId, remove: true }]); await refresh(); toast('ลบรายการแล้ว'); } break; }
    case 'clear-history': if (data.generations.length && confirm(`ลบ History ทั้งหมด${data.generations.length}รายการ? แนะนำ Export Backup ก่อน`)) { await commit(data.generations.map(record => ({ store: 'generations', id: record.id, remove: true }))); currentGenerationId = null; await refresh(); toast('ล้าง History แล้ว'); } break;
    case 'detach-image': draftImageIds = draftImageIds.filter(key => key !== recordId); renderReferences(); markDraft(); break;
    case 'cleanup-images': { const used = new Set([...draftImageIds, ...data.characters.flatMap(record => [...(record.imageIds || []), ...(record.versions || []).flatMap(version => version.imageIds || [])]), ...data.generations.flatMap(record => record.imageIds || [])]); const unused = data.images.filter(image => !used.has(image.id)); if (!unused.length) { toast('ไม่มีภาพที่ไม่ได้ถูกอ้างอิง'); break; } if (confirm(`ลบภาพที่ไม่ถูกอ้างอิง${unused.length}ภาพถาวร?`)) { await commit(unused.map(image => ({ store: 'images', id: image.id, remove: true }))); await refresh(); toast('Cleanup ภาพแล้ว'); } break; }
    case 'save-preset': { validateProfile(profile); const name = prompt('ตั้งชื่อ Preset', profile.name || 'DNA ของฉัน'); if (!name?.trim()) break; ensureCapacity('presets', data.presets.length); await commit([{ store: 'presets', record: { id: id(), name: name.trim().slice(0, 120), createdAt: new Date().toISOString(), profile: clone(profile), version: 1 } }]); await refresh(); toast('บันทึก Preset แล้ว'); break; }
    case 'load-preset': dialog('User Presets', data.presets.length ? data.presets.map(record => `<div class="records-heading"><span>${esc(record.name)}</span><div><button data-action="apply-preset" data-id="${esc(record.id)}">ใช้ Preset</button><button data-action="delete-preset" data-id="${esc(record.id)}">ลบ</button></div></div>`).join('') : '<p>ยังไม่มี Preset ที่บันทึก เลือก Archetype ได้จากหน้า Builder</p>'); break;
    case 'apply-preset': loadRecord(data.presets.find(record => record.id === recordId), true); break;
    case 'delete-preset': if (confirm('ลบ Preset นี้?')) { await commit([{ store: 'presets', id: recordId, remove: true }]); await refresh(); closeDialog(); toast('ลบ Preset แล้ว'); } break;
    case 'versions': { const record = data.characters.find(item => item.id === recordId); dialog('เวอร์ชันก่อนหน้า · ' + title(record), record.versions?.length ? record.versions.map((version, index) => `<div class="records-heading"><span>${date(version.savedAt)} · ${esc(version.profile.name || 'ไม่มีชื่อ')}</span><button data-action="load-version" data-id="${esc(record.id)}" data-index="${index}">โหลดเวอร์ชันนี้</button></div>`).join('') : '<p>ยังไม่มีการ Save ทับ เวอร์ชันก่อนหน้าจะปรากฏที่นี่</p>'); break; }
    case 'load-version': { const record = data.characters.find(item => item.id === recordId), version = record.versions[Number(button.dataset.index)]; loadRecord({ ...record, ...version }); break; }
    case 'reroll-similar': { const other = allRecords().find(record => record.id === comparedId); const result = compareDNA(profile.facialDNA, other.profile.facialDNA); const selected = [...result.matches, ...[...result.differences].reverse()].filter(item => !profile.locks[item.field.id]).slice(0, 5).map(item => item.field.id); if (!selected.length) throw new Error('DNA ทุกค่าถูกล็อก ปลดล็อกบางค่าก่อน'); doRandom('selective', selected); renderCompare(); break; }
  }
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  const writes = ['generate', 'save', 'save-new', 'confirm-import', 'save-settings', 'delete-record', 'clear-history', 'cleanup-images', 'save-preset', 'library-from-history', 'delete-preset'];
  if (writes.includes(action) && busy) return;
  const writing = writes.includes(action); if (writing) { busy = true; $('#generate').disabled = true; button.disabled = true; }
  try { await handleAction(button); } catch (error) { toast(error.message || 'ทำรายการไม่สำเร็จ'); if (/พื้นที่ Browser|บันทึกไม่สำเร็จ/.test(error.message)) storageError(error); }
  finally { if (writing) { busy = false; button.disabled = false; $('#generate').disabled = !preview; } }
});
$('#character-form').addEventListener('submit', event => event.preventDefault());
$('#character-form').addEventListener('input', event => {
  const element = event.target;
  if (element.dataset.profile) { profile[element.dataset.profile] = ['age', 'bodyHeight'].includes(element.dataset.profile) ? Number(element.value) : element.value; if (element.dataset.profile === 'randomSeed') { seedBase = element.value; randomCounter = 0; } markDraft(); }
  if (element.dataset.field) {
    const field = FIELDS.find(item => item.id === element.dataset.field);
    const value = field.type === 'range' ? Number(element.value) : field.type === 'multi' ? [...document.querySelectorAll(`[data-field="${field.id}"]:checked`)].map(item => item.value) : element.value;
    setField(profile, field, value); const output = document.querySelector(`[data-output="${field.id}"]`); if (output) output.value = value; markDraft();
  }
  if (element.dataset.groupSelect) { profile.selectedGroups = [...document.querySelectorAll('[data-group-select]:checked')].map(item => item.dataset.groupSelect); scheduleDraft(); }
});
for (const input of document.querySelectorAll('[data-group-select]')) input.addEventListener('click', event => event.stopPropagation());
$('#advanced').addEventListener('change', event => document.body.classList.toggle('advanced', event.target.checked));
$('#same-identity').addEventListener('change', event => { profile.sameIdentity = event.target.checked; markDraft(); });
$('#trending-random').addEventListener('change', event => { profile.trendingRandom = event.target.checked; markDraft(); });
$('#character-form').addEventListener('change', event => { if (event.target.id === 'random-name-auto') { profile.randomName = event.target.checked; markDraft(); } });
for (const selector of ['#record-search', '#project-filter', '#archetype-filter', '#date-filter', '#sort-filter']) $(selector).addEventListener('input', renderRecords);
$('#compare-select').addEventListener('change', event => { comparedId = event.target.value; renderCompare(); });
$('#image-upload').addEventListener('change', async event => { try { await addImages([...event.target.files]); } catch (error) { toast(error.message); } finally { event.target.value = ''; } });
$('#backup-upload').addEventListener('change', async event => { try { if (event.target.files[0]) await prepareImport(event.target.files[0]); } catch (error) { toast(error.message); } finally { event.target.value = ''; } });
window.addEventListener('beforeunload', () => { releaseImages(); clearTimeout(draftTimer); });
async function start() {
  renderForm();
  try {
    await openDatabase(); available = true; data = await readAll();
    settings = { ...DEFAULT_SETTINGS, ...data.settings.find(item => item.id === 'preferences')?.value };
    const savedDraft = data.settings.find(item => item.id === 'draft')?.value;
    if (savedDraft) { validateProfile(savedDraft.profile); profile = savedDraft.profile; draftImageIds = savedDraft.imageIds || []; seedBase = profile.randomSeed; }
    document.documentElement.dataset.theme = settings.theme; syncForm(); await refresh();
  } catch (error) { storageError(error); updatePreview(); }
}
await start();
