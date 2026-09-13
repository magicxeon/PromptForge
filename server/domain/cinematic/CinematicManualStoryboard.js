export function normalizeManualStoryboard(input, project, ErrorType = Error) {
  const fail = message => { throw new ErrorType('cinematic_manual_storyboard_invalid', message, 400); };
  const text = (value, limit) => {
    if (typeof value !== 'string' || value.trim().length > limit) fail(`Text must contain at most ${limit} characters.`);
    return value.trim();
  };
  const durationMs = input.durationMs;
  if (!Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 30000) fail('Clip duration must be between 1 and 30 seconds.');
  const ids = value => {
    if (!Array.isArray(value) || value.length > 12 || value.some(id => typeof id !== 'string')
      || new Set(value).size !== value.length) fail('Choose valid, unique Cast and Look IDs.');
    return [...value];
  };
  const castAssignmentIds = ids(input.castAssignmentIds);
  const wardrobeLookIds = ids(input.wardrobeLookIds);
  const cast = castAssignmentIds.map(id => project.castAssignments.find(item => item.id === id && item.active !== false));
  if (cast.some(item => !item)) fail('The selected Cast does not belong to this Project.');
  const looks = cast.flatMap(item => item.looks || []);
  if (wardrobeLookIds.some(id => !looks.some(look => look.id === id))) fail('The selected Look does not belong to the selected Cast.');
  const timeline = input.videoActionTimeline;
  if (!Array.isArray(timeline) || timeline.length > 12) fail('Use at most 12 action intervals.');
  let previousEnd = 0;
  const videoActionTimeline = timeline.map(item => {
    if (!item || !Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)
      || item.startMs < previousEnd || item.endMs <= item.startMs || item.endMs > durationMs) {
      fail('Action intervals must be ordered, non-overlapping and within the clip duration.');
    }
    const description = text(item.description, 1200);
    if (!description) fail('Describe each action interval.');
    previousEnd = item.endMs;
    return { startMs: item.startMs, endMs: item.endMs, description };
  });
  return {
    manualStoryboard: true, title: text(input.title, 100), prompt: text(input.imagePrompt, 4000),
    durationMs, castMode: castAssignmentIds.length ? 'selected' : 'none',
    castAssignmentIds, wardrobeLookIds, videoActionTimeline
  };
}

export function createManualStoryboardScene(project, createId) {
  const cast = project.castAssignments.filter(item => item.active !== false && item.identityReady === true);
  const castAssignmentIds = cast.map(item => item.id);
  const wardrobeLookIds = cast.flatMap(item => {
    const ready = (item.looks || []).filter(look => look.locked === true);
    return ready.length === 1 ? [ready[0].id] : [];
  });
  const shot = {
    id: createId('cineshot'), version: 1, orderKey: 1, manualStoryboard: true, manualStillAuthority: true,
    storyboardFaceless: false, openingFrameVersion: 1, title: '', purpose: '', durationMs: 5000,
    castMode: castAssignmentIds.length ? 'selected' : 'none', castAssignmentIds, wardrobeLookIds,
    prompt: '', videoActionTimeline: [], visibleMoment: '', subjectAction: '', emotionalTarget: '',
    framing: '', cameraAngle: '', cameraMovement: '', lensIntent: '', blocking: '', performance: '',
    gaze: '', lighting: '', environment: '', audioIntent: '', continuityNotes: [], storyboardStatus: 'draft'
  };
  return {
    id: createId('cinescene'), version: 1, orderKey: project.scenes.length + 1,
    title: '', purpose: '', location: '', time: '', emotionalStart: '', emotionalEnd: '',
    transitionIntent: '', castAssignmentIds, wardrobeLookIds, shots: [shot], shotOrder: [shot.id], durationMs: shot.durationMs
  };
}
