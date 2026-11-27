export function takePlacement(cue:{startMs:number;endMs:number;offsetMs?:number}, durationMs:number, projectDurationMs?:number):
  {start:number;end:number;availableMs:number;projectEnd:number;fits:boolean};
export const endToleranceMs: number;
type Cue = {id:string;startMs:number;endMs:number;offsetMs?:number;takes?:Record<string,unknown>};
export function speechHorizonMs(project:{durationMs?:number|null;cues:Cue[]},cue:Cue,language:string):number;
export function bufferedTiming(windows:{endMs:number}[]|undefined,targetMs:number|undefined,horizonMs:number):{targetDurationMs:number|undefined;speechTailMs?:number};
export function canExportTake(placement:ReturnType<typeof takePlacement>):boolean;
