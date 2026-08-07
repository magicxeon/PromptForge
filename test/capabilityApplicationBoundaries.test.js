import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  creditRoutes: new URL('../server/app/routes/creditRoutes.js', import.meta.url),
  generationRoutes: new URL('../server/app/routes/generationRoutes.js', import.meta.url),
  comparison: new URL('../server/domain/comparisons/ComparisonOrchestrator.js', import.meta.url),
  fashionRun: new URL('../server/domain/fashion-blueprint/FashionRunService.js', import.meta.url),
  poseProcessor: new URL(
    '../server/domain/template-pose-proxy/GenerativePoseProxyProcessor.js',
    import.meta.url
  )
};

test('HTTP routes enter Credits and Generation through application facades', async () => {
  const [creditRoutes, generationRoutes] = await Promise.all([
    readFile(files.creditRoutes, 'utf8'),
    readFile(files.generationRoutes, 'utf8')
  ]);
  assert.doesNotMatch(creditRoutes, /repositories\/credits/);
  assert.doesNotMatch(creditRoutes, /CreditReservationService/);
  assert.match(creditRoutes, /creditApplicationService/);
  assert.doesNotMatch(generationRoutes, /CreditReservationService|queueManager|compileGenerationContext/);
  assert.match(generationRoutes, /generationApplicationService/);
});

test('cross-capability generation workflows do not enqueue directly', async () => {
  const sources = await Promise.all([
    readFile(files.comparison, 'utf8'),
    readFile(files.fashionRun, 'utf8'),
    readFile(files.poseProcessor, 'utf8')
  ]);
  sources.forEach(source => {
    assert.doesNotMatch(source, /\.queueManager\.enqueue\s*\(/);
    assert.doesNotMatch(source, /CreditReservationService\.js/);
  });
});

test('Comparison refines its shared prompt through the Generation entry point', async () => {
  const source = await readFile(files.comparison, 'utf8');
  assert.equal(
    source.match(/generationApplicationService\.compilePromptForExecution/g)?.length,
    1
  );
  assert.doesNotMatch(source, /OpenAITextProvider|PromptRefinementService/);
});

test('queued Comparison slots retain terminal Credit ownership after a later enqueue fails', async () => {
  const source = await readFile(files.comparison, 'utf8');
  assert.doesNotMatch(source, /comparison_enqueue_failed/);
  assert.match(source, /enqueuedSlots\.length > 0 \? 'partially_completed' : 'failed'/);
});
