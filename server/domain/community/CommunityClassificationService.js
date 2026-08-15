import {
  loadCommunityTaxonomyCatalog,
  toPublicCommunityTaxonomyCatalog
} from '../../config/communityTaxonomyCatalog.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

const SOURCE_WEIGHTS = Object.freeze({
  structured: 0.78,
  workflow: 0.82,
  prompt: 0.42
});

export class CommunityClassificationService {
  constructor({ catalogLoader = loadCommunityTaxonomyCatalog } = {}) {
    this.catalogLoader = catalogLoader;
  }

  async getPublicCatalog() {
    return toPublicCommunityTaxonomyCatalog(await this.catalogLoader());
  }

  async classifyGeneration(generation = {}, sceneTemplateSnapshot = null) {
    const catalog = await this.catalogLoader();
    const snapshot = sceneTemplateSnapshot || generation.sceneTemplateSnapshot || {};
    const sources = {
      structured: normalizeSearchText([
        snapshot.structuredSelectionsSnapshot,
        generation.selections,
        generation.characterSheetConfig,
        generation.sceneBuilder,
        generation.outfitReferenceOverrides
      ]),
      workflow: normalizeSearchText([
        generation.mode,
        snapshot.authoringMode,
        generation.workflowSnapshot?.type,
        generation.workflowSnapshot?.mode
      ]),
      prompt: normalizeSearchText([
        snapshot.finalPromptSnapshot,
        snapshot.manualPromptSnapshot,
        generation.prompt
      ])
    };

    const assignments = flattenTags(catalog).map(tag => scoreTag(tag, sources, catalog.thresholds))
      .filter(assignment => assignment.confidence >= numericThreshold(catalog.thresholds?.low, 0.25))
      .sort((left, right) => right.confidence - left.confidence || left.tagId.localeCompare(right.tagId));
    const mediumThreshold = numericThreshold(catalog.thresholds?.medium, 0.45);

    return {
      taxonomyVersion: catalog.taxonomyVersion,
      assignments,
      suggestions: assignments.filter(assignment => assignment.confidence >= mediumThreshold),
      unconfirmedLowConfidence: assignments.filter(assignment => assignment.confidence < mediumThreshold)
    };
  }

  async preparePublishTaxonomy(classification = {}, payload = {}) {
    const catalog = await this.catalogLoader();
    const tagIndex = new Map(flattenTags(catalog).map(tag => [tag.id, tag]));
    const suggested = new Map((classification.suggestions || []).map(item => [item.tagId, item]));
    const requested = payload.officialTags === undefined
      ? [...suggested.keys()]
      : normalizeTagIds(payload.officialTags);
    const officialLimit = Number(catalog.limits?.officialTagsPerPost) || 12;

    if (requested.length > officialLimit) {
      throw new RepositoryContractError(
        'community_official_tag_limit',
        `A post can contain at most ${officialLimit} official tags.`
      );
    }
    for (const tagId of requested) {
      if (!tagIndex.has(tagId)) {
        throw new RepositoryContractError(
          'community_official_tag_invalid',
          `Official community tag "${tagId}" is not recognized.`
        );
      }
    }

    const assignments = requested.map(tagId => {
      const tag = tagIndex.get(tagId);
      const suggestion = suggested.get(tagId);
      const confidence = suggestion?.confidence ?? numericThreshold(catalog.thresholds?.medium, 0.45);
      const confidenceLevel = confidenceLevelFor(confidence, catalog.thresholds);
      return {
        tagId,
        dimensionId: tag.dimensionId,
        confidence,
        confidenceLevel,
        sources: suggestion?.sources || ['user_selection'],
        status: 'confirmed',
        categoryEligible: confidenceLevel !== 'low',
        trendingEligible: Boolean(suggestion) && confidenceLevel === 'high'
      };
    });

    return {
      taxonomyVersion: catalog.taxonomyVersion,
      taxonomyAssignments: assignments,
      officialTags: assignments.map(item => item.tagId),
      customTags: normalizeCustomTags(payload.customTags, catalog.limits),
      categoryCodes: assignments.filter(item => item.categoryEligible).map(item => item.tagId),
      trendingCategoryCodes: assignments.filter(item => item.trendingEligible).map(item => item.tagId),
      taxonomyReviewStatus: assignments.some(item => item.confidenceLevel === 'medium') ? 'user_confirmed' : 'auto_confirmed',
      taxonomyConfidence: assignments.length ? Math.max(...assignments.map(item => item.confidence)) : 0
    };
  }

  async prepareAdminTaxonomy(payload = {}) {
    const prepared = await this.preparePublishTaxonomy({ suggestions: [] }, payload);
    return {
      ...prepared,
      taxonomyAssignments: prepared.taxonomyAssignments.map(item => ({
        ...item,
        confidence: 1,
        confidenceLevel: 'high',
        sources: ['admin_override'],
        status: 'admin_confirmed',
        categoryEligible: true,
        trendingEligible: true
      })),
      categoryCodes: [...prepared.officialTags],
      trendingCategoryCodes: [...prepared.officialTags],
      taxonomyReviewStatus: 'admin_confirmed',
      taxonomyConfidence: prepared.officialTags.length ? 1 : 0
    };
  }
}

function flattenTags(catalog) {
  return catalog.dimensions.flatMap(dimension => dimension.tags.map(tag => ({
    ...tag,
    dimensionId: dimension.id
  })));
}

function scoreTag(tag, sources, thresholds) {
  const matches = [];
  const structuredHits = matchingTerms(sources.structured, tag.aliases);
  const workflowHits = matchingTerms(sources.workflow, tag.workflowSignals);
  const promptHits = matchingTerms(sources.prompt, tag.aliases);

  if (structuredHits.length) matches.push({ source: 'structured', hits: structuredHits });
  if (workflowHits.length) matches.push({ source: 'workflow', hits: workflowHits });
  if (promptHits.length) matches.push({ source: 'prompt', hits: promptHits });

  const weights = matches.map(match => SOURCE_WEIGHTS[match.source]);
  const base = weights.length ? Math.max(...weights) : 0;
  const corroboration = Math.max(0, new Set(matches.map(match => match.source)).size - 1) * 0.1;
  const repeatedEvidence = matches.some(match => match.hits.length > 1) ? 0.05 : 0;
  const confidence = Math.min(0.98, Number((base + corroboration + repeatedEvidence).toFixed(2)));

  return {
    tagId: tag.id,
    dimensionId: tag.dimensionId,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence, thresholds),
    sources: matches.map(match => match.source),
    matchedSignals: matches.flatMap(match => match.hits).slice(0, 8)
  };
}

function confidenceLevelFor(confidence, thresholds = {}) {
  if (confidence >= numericThreshold(thresholds.high, 0.75)) return 'high';
  if (confidence >= numericThreshold(thresholds.medium, 0.45)) return 'medium';
  return 'low';
}

function matchingTerms(haystack, terms) {
  if (!haystack || !Array.isArray(terms)) return [];
  return [...new Set(terms
    .map(term => normalizeSearchText(term))
    .filter(term => term && haystack.includes(term)))];
}

function normalizeSearchText(value) {
  const values = [];
  collectValues(value, values);
  return values.join(' ').toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
}

function collectValues(value, target) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    target.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectValues(item, target));
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      target.push(key);
      collectValues(item, target);
    });
  }
}

function normalizeTagIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean))];
}

function normalizeCustomTags(value, limits = {}) {
  if (!Array.isArray(value)) return [];
  const maxCount = Number(limits.customTagsPerPost) || 10;
  const maxLength = Number(limits.customTagLength) || 40;
  return [...new Set(value
    .filter(item => typeof item === 'string')
    .map(item => item.trim().replace(/^#+/, '').replace(/\s+/g, ' '))
    .filter(item => item && item.length <= maxLength))]
    .slice(0, maxCount);
}

function numericThreshold(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export const communityClassificationService = new CommunityClassificationService();
