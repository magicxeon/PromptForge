export const LEARNING_LIMITS = Object.freeze({
  titleLength: 200,
  descriptionLength: 10000,
  chapters: 100,
  lessonsPerChapter: 100,
  totalLessons: 500,
  episodes: 500,
  pageSize: 50,
  metadataBytes: 262144
});

export function getLearningPolicy(env = process.env) {
  return {
    enabled: env.LEARNING_ENABLED === 'true' && env.NODE_ENV !== 'production',
    adminOnly: true,
    billingEnabled: false,
    publicationEnabled: false,
    defaultFreeCount: 3,
    limits: { ...LEARNING_LIMITS }
  };
}
