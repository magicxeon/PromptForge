import library from './cinematic/story-directing-skills.v1.json' with {type:'json'};
import catalog from './cinematic/story-direction.v1.json' with {type:'json'};

export const sceneEventIds = Object.keys(catalog.sceneEvents);

export function normalizeSceneEvents(events) {
  return Array.isArray(events) ? sceneEventIds.filter(id => events.includes(id)) : [];
}

export function directingContext(task, settings, events) {
  const selected = normalizeSceneEvents(events);
  const destination = settings?.direction?.destination || catalog.defaults.destination;
  return {
    principles: library.principles,
    setup: settings?.direction || {},
    skills: library.skills.filter(rule => rule.tasks.includes(task)
      && (!rule.event || selected.includes(rule.event))
      && (!rule.destination || rule.destination === destination))
      .map(({id,instruction}) => ({id,instruction}))
  };
}
