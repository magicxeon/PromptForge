export function takePlacement(cue:{startMs:number;endMs:number;offsetMs?:number}, durationMs:number, projectDurationMs?:number):
  {start:number;end:number;availableMs:number;fits:boolean};
export const endToleranceMs: number;
export function canExportTake(placement:ReturnType<typeof takePlacement>, durationMs:number, confirmedOverrunMs?:number):boolean;
