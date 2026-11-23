export function normalizeMergedStoryReferences(text: string): string;
export function formatStoryPromptWholeSeconds(text: string): string;
export function inspectStoryPromptDraft(text:string, references:ReadonlyArray<{number:number}>, durationMs:number, generated?:string):Array<{key:string;value:string;shotNumber?:number}>;
