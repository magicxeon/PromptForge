import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';

export function normalizeStoryImport(input) {
  const policy = cinematicWorkflowPolicy.storyImport;
  const fileName = normalizeImportFileName(input?.fileName);
  const content = typeof input?.content === 'string' ? input.content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim() : '';
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
    importFileName: imported.fileName, importEdited: false, status: 'active', provenance: null,
    characterIds: [], createdAt: new Date().toISOString()
  };
}

export function normalizeBriefImport(value) {
  if (value == null) return null;
  return { fileName: normalizeImportFileName(value.fileName), edited: value.edited === true };
}

function normalizeImportFileName(value) {
  const fileName = typeof value === 'string' ? value.trim() : '';
  if (!fileName || fileName.length > 255 || /[\\/\x00-\x1f]/.test(fileName)
    || !cinematicWorkflowPolicy.storyImport.extensions.some(extension => fileName.toLowerCase().endsWith(extension))) {
    fail('cinematic_story_import_type_invalid', 'Choose a Markdown (.md) or text (.txt) file.');
  }
  return fileName;
}

function fail(code, message) {
  throw Object.assign(new Error(message), { code, statusCode: 400 });
}
