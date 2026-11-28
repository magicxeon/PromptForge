export function selectStorySkills(
  catalog: {taskSkills?:Record<string,string[]>;recommendedSkillCount?:number},
  settings: {skillIds:string[];direction?:object;skillIdsOverride?:string[];customSkills?:{id:string;tasks:string[];context?:string}[]}|undefined,
  task:string, source?:unknown
): string[];
export function storySkillSource(source:unknown):string;
export function skillPromptText(skill:{instruction:string;references?:{name:string;text:string}[]},task:string,source:unknown,budget:number):string;
