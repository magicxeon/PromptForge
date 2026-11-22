export const storyKeys = {
  library: (actor: string) => ["story-library", actor] as const,
  project: (actor: string, id: string) => ["story-project", actor, id] as const,
  series: (actor: string, id: string) => ["story-series", actor, id] as const,
};
