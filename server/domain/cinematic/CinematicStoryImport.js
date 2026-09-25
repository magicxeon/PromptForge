import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';

export function normalizeStoryImport(input) {
  const policy = cinematicWorkflowPolicy.storyImport;
  const fileName = typeof input?.fileName === 'string' ? input.fileName.trim() : '';
  const content = typeof input?.content === 'string' ? input.content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim() : '';
  if (!fileName || fileName.length > 255 || /[\\/\x00-\x1f]/.test(fileName)
    || !policy.extensions.some(extension => fileName.toLowerCase().endsWith(extension))) {
    fail('cinematic_story_import_type_invalid', 'Choose a Markdown (.md) or text (.txt) file.');
  }
  if (!content || /[\x00-\x08\x0b\x0c\x0e-\x1f\uFFFD]/.test(content)) {
    fail('cinematic_story_import_content_invalid', 'The story file must contain readable UTF-8 text.');
  }
  if (content.length > cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters
    || Buffer.byteLength(input.content, 'utf8') > policy.maximumBytes) {
    fail('cinematic_story_import_too_large', 'The story file exceeds the import limit.');
  }
  return { fileName, content };
}

export function createImportedFullStoryRevision(imported) {
  return {
    id: createPrefixedId('cinefull'), version: 1, parentRevisionId: null,
    content: imported.content, source: 'manual', revisionInstruction: '',
    importFileName: imported.fileName, status: 'active', provenance: null,
    characterIds: [], createdAt: new Date().toISOString()
  };
}

function fail(code, message) {
  throw Object.assign(new Error(message), { code, statusCode: 400 });
}
