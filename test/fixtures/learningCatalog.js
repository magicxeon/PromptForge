import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getLearningPolicy } from '../../server/config/learningPolicy.js';
import { LearningAccessPolicy } from '../../server/domain/content-access/LearningAccessPolicy.js';
import { TutorialApplicationService } from '../../server/domain/tutorials/TutorialApplicationService.js';
import { AICinemaApplicationService } from '../../server/domain/ai-cinema/AICinemaApplicationService.js';
import { TutorialCatalogRepository } from '../../server/repositories/tutorials/TutorialCatalogRepository.js';
import { AICinemaCatalogRepository } from '../../server/repositories/ai-cinema/AICinemaCatalogRepository.js';

export const admin = { userId: 'admin-a', role: 'admin', accountStatus: 'active' };
export const otherAdmin = { ...admin, userId: 'admin-b', username: 'admin-a' };
export const draft = (type = 'tutorial', count = type === 'film' ? 1 : 2) => ({
  type, title: `${type} title`, description: 'Draft metadata', accessMode: 'free', freeCount: 0,
  [type === 'tutorial' ? 'chapters' : 'episodes']: Array.from({ length: count }, (_, index) => ({
    title: `Unit ${index + 1}`,
    ...(type === 'tutorial' ? { lessons: [{ title: 'Lesson' }] } : {})
  }))
});

export async function catalogFixture(t, enabled = true) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-learning-catalog-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const tutorialFile = path.join(directory, 'tutorials', 'catalog.json');
  const cinemaFile = path.join(directory, 'ai-cinema', 'catalog.json');
  const policy = new LearningAccessPolicy({ readPolicy: () => getLearningPolicy({ LEARNING_ENABLED: String(enabled) }) });
  const tutorials = new TutorialApplicationService({ repository: new TutorialCatalogRepository({ catalogFile: tutorialFile }), policy });
  const cinema = new AICinemaApplicationService({ repository: new AICinemaCatalogRepository({ catalogFile: cinemaFile }), policy });
  return { directory, tutorialFile, cinemaFile, policy, tutorials, cinema };
}
