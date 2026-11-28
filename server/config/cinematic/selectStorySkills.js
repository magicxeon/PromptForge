// Read authoring material only. Skill definitions, private media, and prior generated prompts
// would otherwise match their own keywords.
export function storySkillSource(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value)) return value.map(storySkillSource).join(' ');
  const fields = ['title','projectTitle','chapterTitle','storyBrief','fullStory','chapterStory','currentFullStory',
    'revisionInstruction','instruction','synopsis','location','setting','objective','storyRole','displayName',
    'description','action','scene','shot','shotDocument','narrative','sceneContext','text','body','content',
    'purpose','environmentPrompt','visibleMoment','subjectAction','artDirection','lighting','dialogue'];
  return fields.filter(key=>Object.hasOwn(value,key)).map(key=>storySkillSource(value[key])).join(' ');
}

export function selectStorySkills(catalog, settings, task, source = '') {
  const enabled = new Set(settings?.skillIds ?? []);
  if (Array.isArray(settings?.skillIdsOverride)) return settings.skillIdsOverride.filter(id => enabled.has(id));
  const material = [task,...Object.values(settings?.direction ?? {}),storySkillSource(source)].join(' ').normalize().toLowerCase();
  const custom = (settings?.customSkills ?? []).filter(skill => {
    if (!skill.tasks.includes(task)) return false;
    const keywords = (skill.context || '').split(/[,;\n]/u).map(word=>word.trim().normalize().toLowerCase()).filter(Boolean);
    return !keywords.length || keywords.some(word=>material.includes(word));
  }).sort((a,b)=>Number(Boolean(b.context?.trim()))-Number(Boolean(a.context?.trim())));
  const builtins = catalog.taskSkills?.[task] ?? [];
  return [...custom.map(skill => skill.id), ...builtins]
    .filter(id => enabled.has(id)).slice(0, catalog.recommendedSkillCount);
}

export function skillPromptText(skill, task, source, budget) {
  const instruction = skill.instruction.trim();
  if (!skill.references?.length && instruction.length <= budget) return instruction;
  const words = new Set((task + ' ' + storySkillSource(source)).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const paragraphs = [ {name:'',text:instruction}, ...(skill.references ?? []) ].flatMap(file =>
    file.text.split(/\r?\n\s*\r?\n/).map((text,index) => {
      const tokens = new Set((file.name + ' ' + text).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      let score = 0;
      for (const token of tokens) if (words.has(token)) score++;
      return {text,index,score,source:file.name};
    }));
  const selected = new Set([paragraphs[0]]);
  let remaining = budget - paragraphs[0].text.length - 2;
  for (const item of [...paragraphs.slice(1)].sort((a,b)=>b.score-a.score)) {
    if (item.source && !item.score) continue;
    if (item.text.length + 2 <= remaining) { selected.add(item); remaining -= item.text.length + 2; }
  }
  return paragraphs.filter(p=>selected.has(p)).map(p=>p.text).join('\n\n').slice(0,budget);
}
