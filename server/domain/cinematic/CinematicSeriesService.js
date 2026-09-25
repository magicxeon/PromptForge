import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { createCinematicProjectRecord } from '../../repositories/cinematic/cinematicProjectRecord.js';
import { normalizeLegacyProject, toProjectSummary } from '../../repositories/cinematic/CinematicProjectRepository.js';
import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';
import {
  appendChapterRevision,
  chapterRevisionProjection,
  createChapterProposal,
  ensureChapterAuthoring,
  pendingChapterProposal,
  restoreChapterRevision
} from './CinematicChapterAuthoring.js';
import { scenePlanningProjection } from './CinematicSceneAuthoring.js';

export class CinematicSeriesService {
  constructor({ repository, normalizeSetup, invalidateCastSources }) {
    Object.assign(this, { repository, normalizeSetup, invalidateCastSources });
  }

  createProductionProject(setup, actor) {
    if (setup.format !== 'mini-series') return this.repository.create(setup, actor);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const project = createCinematicProjectRecord(setup, actor);
      data.projects.unshift(project);
      if (data.series.length >= 50) fail('cinematic_series_limit', 'The Series limit has been reached.', 409);
      const now = project.createdAt;
      const seasonId = createPrefixedId('cineseason');
      const series = {
        id: createPrefixedId('cineseries'),
        ownerUserId: actor.userId,
        title: project.title,
        version: 1,
        seasons: [{ id: seasonId, number: 1, title: '' }],
        createdAt: now,
        updatedAt: now
      };
      project.seriesMembership = { seriesId: series.id, seasonId, chapterNumber: 1 };
      data.series.unshift(series);
      return project;
    });
  }

  async getWorkspace(projectId, actor) {
    const data = await this.repository.readSeriesWorkspaceForActor(actor);
    const project = findProject(data, projectId);
    return project.seriesMembership
      ? workspace(data, findSeries(data, project.seriesMembership.seriesId), project)
      : workspace(data, null, project);
  }

  async getChapterCharacterProjection(projectId, actor) {
    const data = await this.repository.readSeriesWorkspaceForActor(actor);
    const target = findProject(data, projectId);
    const source = findStoryProject(data, target);
    if (source.id === target.id) return null;
    const selected = new Set(target.chapterCharacterIds || []);
    return (source.castAssignments || [])
      .filter(item => item.active !== false && selected.has(item.id))
      .map(item => structuredClone(item));
  }

  async mutateWithCharacterProjection(projectId, actor, operation) {
    const current = await this.repository.findForActor(projectId, actor);
    if (!current?.seriesMembership && !current?.chapterOrigin) {
      return this.repository.mutateForActor(projectId, actor, project => {
        if (project.seriesMembership || project.chapterOrigin) {
          fail('cinematic_version_conflict', 'The Project workspace changed. Refresh and try again.', 409);
        }
        return operation(project, project, [project]);
      });
    }
    return this.repository.mutateSeriesWorkspaceForActor(actor, async data => {
      const project = normalizeLegacyProject(findProject(data, projectId));
      const storyProject = findStoryProject(data, project);
      const localCast = project.castAssignments;
      const shared = storyProject.id !== project.id && project.chapterCharacterIds?.length;
      if (shared) {
        const selected = new Set(project.chapterCharacterIds);
        project.castAssignments = (storyProject.castAssignments || [])
          .filter(item => item.active !== false && selected.has(item.id)).map(item => structuredClone(item));
      }
      try {
        const result = await operation(project, storyProject, data.projects);
        project.updatedAt = new Date().toISOString();
        return structuredClone(result);
      } finally {
        // Projection is transaction-local; the story Character remains the only writer.
        if (shared) project.castAssignments = localCast;
      }
    });
  }

  createFromProject(projectId, input, actor) {
    const title = validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const project = findProject(data, projectId);
      assertVersion(project, input.expectedProjectVersion);
      if (project.seriesMembership) fail('cinematic_series_already_assigned', 'This Chapter already belongs to a Series.', 409);
      if (data.series.length >= 50) fail('cinematic_series_limit', 'The Series limit has been reached.');
      const now = new Date().toISOString();
      const series = { id: createPrefixedId('cineseries'), ownerUserId: actor.userId, title, version: 1,
        seasons: [{ id: createPrefixedId('cineseason'), number: 1, title: '' }], createdAt: now, updatedAt: now };
      data.series.unshift(series);
      project.seriesMembership = { seriesId: series.id, seasonId: series.seasons[0].id, chapterNumber: 1 };
      project.version += 1; project.updatedAt = now;
      return { project, workspace: workspace(data, series, project) };
    });
  }

  update(seriesId, input, actor) {
    const title = validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      if (input.seasonId) findSeason(series, input.seasonId).title = title;
      else series.title = title;
      touch(series);
      return workspace(data, series);
    });
  }

  addSeason(seriesId, input, actor) {
    const title = input.title === '' || input.title === undefined ? '' : validTitle(input.title);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      if (series.seasons.length >= 24) fail('cinematic_series_limit', 'A Series supports at most 24 Seasons.');
      series.seasons.push({ id: createPrefixedId('cineseason'), number: Math.max(0, ...series.seasons.map(item => item.number)) + 1, title });
      touch(series);
      return workspace(data, series);
    });
  }

  addChapter(seriesId, input, actor) {
    const chapterTitle = validTitle(input.title);
    if (typeof input.copyCast !== 'boolean') fail('cinematic_series_input_invalid', 'Choose whether to copy Cast and Looks.');
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const series = findSeries(data, seriesId);
      assertVersion(series, input.expectedVersion);
      const season = findSeason(series, input.seasonId);
      const source = findProject(data, input.sourceProjectId);
      assertVersion(source, input.expectedProjectVersion);
      if (source.seriesMembership?.seriesId !== series.id) fail('cinematic_project_not_found', 'Source Chapter not found.', 404);
      const chapters = data.projects.filter(project => project.seriesMembership?.seriesId === series.id);
      if (chapters.length >= 120) fail('cinematic_series_limit', 'A Series supports at most 120 Chapters.');
      const setup = this.normalizeSetup(
        { ...source.setup, title: source.setup.title },
        { allowEmptyStory: true }
      );
      const project = createCinematicProjectRecord(setup, actor);
      project.chapterTitle = chapterTitle;
      project.chapterStory = validChapterStory(input.storyBrief);
      project.seriesMembership = { seriesId, seasonId: season.id,
        chapterNumber: Math.max(0, ...chapters.filter(item => item.seriesMembership.seasonId === season.id).map(item => item.seriesMembership.chapterNumber)) + 1 };
      project.chapterOrigin = { projectId: source.id, projectVersion: source.version, copiedCast: input.copyCast };
      if (input.copyCast) {
        // Fresh local binding IDs; source Character/Asset version authority stays pinned.
        project.castAssignments = (source.castAssignments || []).filter(item => item.active !== false).map(item => ({
          ...structuredClone(item), id: createPrefixedId('cinecast'), updatedAt: project.createdAt,
          looks: (item.looks || []).map(look => ({ ...structuredClone(look), id: createPrefixedId('cinelook') }))
        }));
      }
      data.projects.unshift(project);
      touch(series);
      return { project, workspace: workspace(data, series, project) };
    });
  }

  updateChapter(projectId, input, actor) {
    const title = validTitle(input.title);
    const story = validChapterStory(input.story);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const project = findProject(data, projectId);
      assertVersion(project, input.expectedProjectVersion);
      const previousRevisionId = project.activeChapterVersionId || null;
      const revision = appendChapterRevision(project, {
        title,
        story,
        source: input.source,
        revisionInstruction: input.revisionInstruction,
        sourceFullStoryRevisionId: input.sourceFullStoryRevisionId,
        provenance: input.provenance
      }, cinematicWorkflowPolicy.authoring.storyRevisionHistoryLimit);
      if (revision.id === previousRevisionId) {
        const series = project.seriesMembership ? findSeries(data, project.seriesMembership.seriesId) : null;
        return { project, workspace: workspace(data, series, project) };
      }
      project.version += 1;
      project.updatedAt = new Date().toISOString();
      const series = project.seriesMembership ? findSeries(data, project.seriesMembership.seriesId) : null;
      return { project, workspace: workspace(data, series, project) };
    });
  }

  restoreChapter(projectId, revisionId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const project = findProject(data, projectId);
      assertVersion(project, input.expectedProjectVersion);
      restoreChapterRevision(project, revisionId, cinematicWorkflowPolicy.authoring.storyRevisionHistoryLimit);
      project.version += 1;
      project.updatedAt = new Date().toISOString();
      const series = project.seriesMembership ? findSeries(data, project.seriesMembership.seriesId) : null;
      return { project, workspace: workspace(data, series, project) };
    });
  }

  saveChapterProposal(projectId, input, actor) {
    const chapters = normalizeGeneratedChapters(input?.proposal?.chapters);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedTargetVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedSourceVersion);
      if (source.confirmedFullStoryVersionId !== input.confirmedRevisionId) {
        fail('cinematic_full_story_revision_stale', 'The confirmed Full Story changed before the Chapter proposal was saved.', 409);
      }
      ensureChapterAuthoring(source);
      if (pendingChapterProposal(source)) {
        fail('cinematic_chapter_proposal_pending', 'Review or discard the pending Chapter proposal before generating another one.', 409);
      }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      const existing = orderedChapterProjects(data, series, source);
      const scope = input.scope === 'selected' ? 'selected' : 'all';
      if (!series && scope === 'all' && chapters.length !== 1) {
        fail('cinematic_movie_chapter_count_invalid', 'A Movie uses one Chapter.', 409);
      }
      const mappedChapters = scope === 'selected'
        ? [{ ...chapters[0], projectId: target.id }]
        : chapters.map((chapter, index) => ({ ...chapter, projectId: existing[index]?.id || null }));
      const proposal = createChapterProposal({
        ...input.proposal,
        scope,
        targetProjectId: target.id,
        sourceFullStoryRevisionId: input.confirmedRevisionId,
        instruction: input.instruction,
        chapters: mappedChapters,
        baseChapterVersions: existing.map(project => ({
          projectId: project.id,
          version: project.version + (project.id === source.id ? 1 : 0),
          activeChapterVersionId: project.activeChapterVersionId || null
        }))
      });
      source.chapterProposals.push(proposal);
      source.chapterProposals = source.chapterProposals.slice(-20);
      source.version += 1;
      source.updatedAt = proposal.createdAt;
      return { project: target.id === source.id ? source : target, proposal, workspace: workspace(data, series, target) };
    });
  }

  commitInitialChapterProposal(projectId, input, actor) {
    const chapters = normalizeGeneratedChapters(input?.proposal?.chapters);
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedTargetVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedSourceVersion);
      if (source.confirmedFullStoryVersionId !== input.confirmedRevisionId) {
        fail('cinematic_full_story_revision_stale', 'The confirmed Full Story changed before Chapters were created.', 409);
      }
      ensureChapterAuthoring(source);
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      const existing = orderedChapterProjects(data, series, source);
      if (hasStartedChapterWork(existing)) {
        fail('cinematic_chapters_already_exist', 'Existing Chapters must be reviewed before regeneration.', 409);
      }
      if (!series && chapters.length !== 1) fail('cinematic_movie_chapter_count_invalid', 'A Movie uses one Chapter.', 409);
      const proposal = createChapterProposal({
        ...input.proposal,
        scope: 'all',
        targetProjectId: target.id,
        sourceFullStoryRevisionId: input.confirmedRevisionId,
        instruction: input.instruction,
        chapters: chapters.map((chapter, index) => ({ ...chapter, projectId: existing[index]?.id || null })),
        baseChapterVersions: existing.map(project => ({
          projectId: project.id,
          version: project.version,
          activeChapterVersionId: project.activeChapterVersionId || null
        }))
      });
      source.chapterProposals.push(proposal);
      source.chapterProposals = source.chapterProposals.slice(-20);
      return applyChapterProposalInData({ data, requested: target, source, proposal, actor, normalizeSetup: this.normalizeSetup });
    });
  }

  applyChapterProposal(projectId, proposalId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const requested = findProject(data, projectId);
      const source = findStoryProject(data, requested);
      ensureChapterAuthoring(source);
      const proposal = source.chapterProposals.find(item => item.id === proposalId);
      if (!proposal) fail('cinematic_chapter_proposal_not_found', 'Chapter proposal not found.', 404);
      return applyChapterProposalInData({ data, requested, source, proposal, actor, normalizeSetup: this.normalizeSetup });
    });
  }

  discardChapterProposal(projectId, proposalId, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const requested = findProject(data, projectId);
      const source = findStoryProject(data, requested);
      ensureChapterAuthoring(source);
      const proposal = source.chapterProposals.find(item => item.id === proposalId);
      if (!proposal) fail('cinematic_chapter_proposal_not_found', 'Chapter proposal not found.', 404);
      if (proposal.status === 'pending_review') {
        proposal.status = 'discarded';
        proposal.discardedAt = new Date().toISOString();
        source.version += 1;
        source.updatedAt = proposal.discardedAt;
      }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      return { project: requested.id === source.id ? source : requested, proposal, workspace: workspace(data, series, requested) };
    });
  }

  upsertSharedDossier(projectId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignmentId = String(input.assignmentId || '').trim() || createPrefixedId('cinecast');
      let assignment = (source.castAssignments || []).find(item => item.id === assignmentId);
      const now = new Date().toISOString();
      const characterSource = input.sourceType === 'character';
      const authorizedCharacter = characterSource ? input.authorizedCharacter : null;
      if (characterSource && (!authorizedCharacter?.identityPack?.characterProfileId
        || !authorizedCharacter?.identityPack?.characterProfileVersionId)) {
        fail('cinematic_character_version_required', 'A pinned Character Profile Version is required.', 409);
      }
      const dossier = {
        id: assignmentId,
        sourceType: characterSource ? 'character' : 'dossier',
        generatedSheet: null,
        characterProfileId: characterSource ? authorizedCharacter.identityPack.characterProfileId : null,
        characterProfileVersionId: characterSource ? authorizedCharacter.identityPack.characterProfileVersionId : null,
        portraitUrl: characterSource
          ? authorizedCharacter.authorizedCharacterFaceReferenceUrl
            || authorizedCharacter.authorizedCharacterFrontReferenceUrl
            || assignment?.portraitUrl
            || null
          : assignment?.portraitUrl || null,
        displayName: validTitle(input.displayName || authorizedCharacter?.displayNameSnapshot),
        storyRole: String(input.storyRole || '').trim().slice(0, 240) || 'Supporting',
        storyRoleSlotId: String(input.storyRoleSlotId || '').trim() || createPrefixedId('cinerole'),
        storyImportance: input.storyImportance === 'protagonist' ? 'protagonist' : 'supporting',
        objective: String(input.objective || '').trim().slice(0, 1000),
        motivation: String(input.motivation || '').trim().slice(0, 1000),
        pressure: String(input.pressure || '').trim().slice(0, 1000),
        personalityTraits: (Array.isArray(input.personalityTraits) ? input.personalityTraits : []).slice(0, 6).map(value => String(value).trim()).filter(Boolean),
        emotionalBaseline: String(input.emotionalBaseline ?? assignment?.emotionalBaseline ?? '').trim().slice(0, 500),
        dialogueStyle: String(input.dialogueStyle ?? assignment?.dialogueStyle ?? '').trim().slice(0, 500),
        performanceDirection: String(input.performanceDirection ?? assignment?.performanceDirection ?? '').trim().slice(0, 1000),
        identityReady: characterSource && authorizedCharacter.identityPack.status === 'identity_pack_ready',
        identityReadinessSnapshot: characterSource ? {
          status: authorizedCharacter.identityPack.status,
          ageRange: authorizedCharacter.identityPack.ageRange || null,
          presentationGender: authorizedCharacter.identityPack.presentationGender || null,
          characterType: authorizedCharacter.identityPack.characterType,
          outfitBehavior: authorizedCharacter.identityPack.outfitBehavior,
          identityPolicyVersion: authorizedCharacter.identityPack.identityPolicyVersion
        } : null,
        reuseAuthorization: characterSource && authorizedCharacter.attribution ? {
          ownerUserId: authorizedCharacter.attribution.ownerUserId,
          ownerUsername: authorizedCharacter.attribution.ownerUsername,
          validatedAt: now
        } : null,
        apparentAgeRange: characterSource ? authorizedCharacter.identityPack.ageRange || null : null,
        looks: assignment?.looks || [],
        active: true,
        updatedAt: now
      };
      const identityChanged = assignment && ((assignment.sourceType || 'character') !== dossier.sourceType
        || assignment.characterProfileId !== dossier.characterProfileId
        || assignment.characterProfileVersionId !== dossier.characterProfileVersionId);
      if (identityChanged) {
        dossier.looks = [];
        if (!characterSource || !authorizedCharacter.authorizedCharacterFaceReferenceUrl
          && !authorizedCharacter.authorizedCharacterFrontReferenceUrl) dossier.portraitUrl = null;
        for (const chapter of data.projects) {
          if (chapter.id !== source.id && (chapter.status === 'archived'
            || chapter.seriesMembership?.seriesId !== source.seriesMembership?.seriesId
            || findStoryProject(data, chapter).id !== source.id
            || !chapter.chapterCharacterIds?.includes(assignmentId))) continue;
          this.invalidateCastSources(chapter, assignment);
          if (chapter.id !== source.id && chapter.id !== target.id) chapter.version += 1;
          chapter.updatedAt = now;
        }
      }
      source.castAssignments ||= [];
      if (assignment) Object.assign(assignment, dossier);
      else {
        assignment = dossier;
        source.castAssignments.push(assignment);
      }
      if (dossier.storyImportance === 'protagonist') {
        source.castAssignments.forEach(item => {
          if (item.id !== assignmentId && item.storyImportance === 'protagonist') item.storyImportance = 'supporting';
        });
      }
      ensureChapterAuthoring(target);
      if (!target.chapterCharacterIds.includes(assignmentId)) target.chapterCharacterIds.push(assignmentId);
      source.version += 1;
      source.updatedAt = now;
      if (target.id !== source.id) {
        target.version += 1;
        target.updatedAt = now;
      }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      return { project: target, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, target) };
    });
  }

  updateSharedVoice(projectId, assignmentId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      const source = findStoryProject(data, target);
      assertVersion(target, input.expectedProjectVersion);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignment = (source.castAssignments || []).find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) fail('cinematic_cast_assignment_not_found', 'Character not found.', 404);
      if (typeof input.dialogueStyle !== 'string' || input.dialogueStyle.length > 500) {
        fail('cinematic_voice_direction_invalid', 'Voice direction must not exceed 500 characters.');
      }
      assignment.dialogueStyle = input.dialogueStyle;
      assignment.updatedAt = new Date().toISOString();
      source.version += 1; source.updatedAt = assignment.updatedAt;
      for (const chapter of data.projects) {
        if (chapter.id === source.id || chapter.chapterOrigin?.projectId !== source.id) continue;
        const copy = (chapter.castAssignments || []).find(item => item.id === assignmentId);
        if (copy) { copy.dialogueStyle = assignment.dialogueStyle; copy.updatedAt = assignment.updatedAt; }
        if (copy || chapter.chapterCharacterIds?.includes(assignmentId)) {
          chapter.version += 1; chapter.updatedAt = assignment.updatedAt;
        }
      }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      return { project: target, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, target) };
    });
  }

  setChapterCharacters(projectId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      const activeIds = new Set((source.castAssignments || []).filter(item => item.active !== false).map(item => item.id));
      const characterIds = [...new Set((Array.isArray(input.characterIds) ? input.characterIds : []).map(value => String(value).trim()).filter(Boolean))];
      if (characterIds.some(id => !activeIds.has(id))) fail('cinematic_project_character_not_found', 'A selected Project Character is unavailable.', 404);
      ensureChapterAuthoring(target);
      target.chapterCharacterIds = characterIds;
      target.version += 1;
      target.updatedAt = new Date().toISOString();
      const series = target.seriesMembership ? findSeries(data, target.seriesMembership.seriesId) : null;
      return { project: target, workspace: workspace(data, series, target) };
    });
  }

  detachSharedCharacter(projectId, assignmentId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignment = (source.castAssignments || []).find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) fail('cinematic_project_character_not_found', 'Project Character not found.', 404);
      const now = new Date().toISOString();
      Object.assign(assignment, {
        sourceType: 'dossier', generatedSheet: null, characterProfileId: null,
        characterProfileVersionId: null, portraitUrl: null, identityReady: false,
        identityReadinessSnapshot: null, reuseAuthorization: null, apparentAgeRange: null,
        looks: [], updatedAt: now
      });
      source.version += 1; source.updatedAt = now;
      if (target.id !== source.id) { target.version += 1; target.updatedAt = now; }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      return { project: target, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, target) };
    });
  }

  removeSharedCharacter(projectId, assignmentId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignment = (source.castAssignments || []).find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) fail('cinematic_project_character_not_found', 'Project Character not found.', 404);
      const now = new Date().toISOString();
      assignment.active = false;
      assignment.updatedAt = now;
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      const related = orderedChapterProjects(data, series, source);
      for (const chapter of related) {
        const before = chapter.chapterCharacterIds || [];
        const next = before.filter(id => id !== assignmentId);
        if (next.length !== before.length) {
          chapter.chapterCharacterIds = next;
          if (chapter.id !== source.id) { chapter.version += 1; chapter.updatedAt = now; }
        }
      }
      source.version += 1; source.updatedAt = now;
      const current = findProject(data, target.id);
      return { project: current, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, current) };
    });
  }

  detachSharedCharacter(projectId, assignmentId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignment = (source.castAssignments || []).find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) fail('cinematic_project_character_not_found', 'Project Character not found.', 404);
      const now = new Date().toISOString();
      Object.assign(assignment, {
        sourceType: 'dossier', generatedSheet: null, characterProfileId: null,
        characterProfileVersionId: null, portraitUrl: null, identityReady: false,
        identityReadinessSnapshot: null, reuseAuthorization: null, apparentAgeRange: null,
        looks: [], updatedAt: now
      });
      source.version += 1; source.updatedAt = now;
      if (target.id !== source.id) { target.version += 1; target.updatedAt = now; }
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      return { project: target, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, target) };
    });
  }

  removeSharedCharacter(projectId, assignmentId, input, actor) {
    return this.repository.mutateSeriesWorkspaceForActor(actor, data => {
      const target = findProject(data, projectId);
      assertVersion(target, input.expectedProjectVersion);
      const source = findStoryProject(data, target);
      assertVersion(source, input.expectedStoryProjectVersion);
      const assignment = (source.castAssignments || []).find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) fail('cinematic_project_character_not_found', 'Project Character not found.', 404);
      const now = new Date().toISOString();
      assignment.active = false;
      assignment.updatedAt = now;
      const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
      const related = orderedChapterProjects(data, series, source);
      for (const chapter of related) {
        const before = chapter.chapterCharacterIds || [];
        const next = before.filter(id => id !== assignmentId);
        if (next.length !== before.length) {
          chapter.chapterCharacterIds = next;
          if (chapter.id !== source.id) { chapter.version += 1; chapter.updatedAt = now; }
        }
      }
      source.version += 1; source.updatedAt = now;
      const current = findProject(data, target.id);
      return { project: current, storyProject: source, characterId: assignmentId, workspace: workspace(data, series, current) };
    });
  }
}

function applyChapterProposalInData({ data, requested, source, proposal, actor, normalizeSetup }) {
  const series = source.seriesMembership ? findSeries(data, source.seriesMembership.seriesId) : null;
  if (proposal.status === 'applied') {
    return { project: findProject(data, proposal.targetProjectId || requested.id), proposal, workspace: workspace(data, series, requested) };
  }
  if (proposal.status !== 'pending_review') fail('cinematic_chapter_proposal_closed', 'This Chapter proposal is no longer available.', 409);
  if (source.confirmedFullStoryVersionId !== proposal.sourceFullStoryRevisionId) {
    fail('cinematic_full_story_revision_stale', 'The confirmed Full Story changed before this proposal was applied.', 409);
  }
  const existing = orderedChapterProjects(data, series, source);
  validateProposalBase(proposal, existing);
  const now = new Date().toISOString();
  if (series && proposal.scope === 'all') {
    const requiredSeasonCount = Math.max(1, ...proposal.chapters.map(item => item.seasonNumber || 1));
    while (series.seasons.length < requiredSeasonCount) {
      series.seasons.push({ id: createPrefixedId('cineseason'), number: series.seasons.length + 1, title: '' });
    }
  }
  const changedIds = new Set();
  const appliedProjects = [];
  for (const [index, chapter] of proposal.chapters.entries()) {
    let project = chapter.projectId ? existing.find(item => item.id === chapter.projectId) : null;
    if (!project) {
      if (!series) fail('cinematic_movie_chapter_count_invalid', 'A Movie cannot create another Chapter.', 409);
      if (orderedChapterProjects(data, series, source).length >= 120) fail('cinematic_series_limit', 'A Series supports at most 120 Chapters.', 409);
      const seasonId = series.seasons.find(item => item.number === (chapter.seasonNumber || 1))?.id
        || source.seriesMembership.seasonId || series.seasons[0]?.id;
      const setup = normalizeSetup({ ...source.setup, title: source.setup.title }, { allowEmptyStory: true });
      project = createCinematicProjectRecord(setup, actor);
      project.seriesMembership = { seriesId: series.id, seasonId, chapterNumber: chapter.chapterNumber || index + 1 };
      project.chapterOrigin = { projectId: source.id, projectVersion: source.version, copiedCast: true };
      project.castAssignments = (source.castAssignments || []).filter(item => item.active !== false).map(item => ({
        ...structuredClone(item), id: createPrefixedId('cinecast'), updatedAt: project.createdAt,
        looks: (item.looks || []).map(look => ({ ...structuredClone(look), id: createPrefixedId('cinelook') }))
      }));
      data.projects.unshift(project);
    }
    if (series && project.seriesMembership) {
      project.seriesMembership.seasonId = series.seasons.find(item => item.number === (chapter.seasonNumber || 1))?.id || project.seriesMembership.seasonId;
      project.seriesMembership.chapterNumber = chapter.chapterNumber || project.seriesMembership.chapterNumber;
    }
    appendChapterRevision(project, {
      title: chapter.title,
      story: chapter.story,
      source: proposal.scope === 'selected' ? 'ai' : 'regenerate',
      revisionInstruction: proposal.instruction,
      sourceFullStoryRevisionId: proposal.sourceFullStoryRevisionId,
      provenance: proposal.provenance
    }, cinematicWorkflowPolicy.authoring.storyRevisionHistoryLimit, now);
    project.chapterGeneration = chapterGeneration(proposal, proposal.sourceFullStoryRevisionId, now);
    if (project.scenes?.length || project.generationAttempts?.length) {
      project.chapterReviewState = { required: true, reason: 'chapter_text_changed', proposalId: proposal.id, createdAt: now };
    }
    project.version += 1;
    project.updatedAt = now;
    changedIds.add(project.id);
    appliedProjects.push(project);
  }
  if (series && proposal.scope === 'all') reorderAppliedChapters(existing, appliedProjects);
  proposal.status = 'applied';
  proposal.appliedAt = now;
  proposal.appliedProjectIds = appliedProjects.map(project => project.id);
  if (!changedIds.has(source.id)) {
    source.version += 1;
    source.updatedAt = now;
  }
  if (series) touch(series);
  const target = appliedProjects.find(project => project.id === proposal.targetProjectId) || appliedProjects[0] || requested;
  return { project: target, proposal, workspace: workspace(data, series, target) };
}

function workspace(data, series, currentProject = null) {
  const chapterProjects = series
    ? data.projects.filter(project => project.status !== 'archived' && project.seriesMembership?.seriesId === series.id)
    : [currentProject].filter(project => project?.status !== 'archived');
  const seasons = new Map((series?.seasons || []).map(item => [item.id, item.number]));
  const ordered = chapterProjects.sort((a, b) => series
    ? (seasons.get(a.seriesMembership.seasonId) - seasons.get(b.seriesMembership.seasonId))
      || a.seriesMembership.chapterNumber - b.seriesMembership.chapterNumber
    : 0);
  const rootProject = currentProject || ordered[0];
  if (!series && !rootProject) fail('cinematic_project_not_found', 'Cinematic Project not found.', 404);
  const storyProject = findStoryProject(data, rootProject);
  const productionProjectId = series?.id || rootProject.id;
  return {
    productionProject: {
      id: productionProjectId,
      productionProjectId,
      storyProjectId: storyProject.id,
      version: series?.version || rootProject.version,
      title: series?.title || rootProject.title,
      format: series ? 'mini-series' : rootProject.format || 'short-film',
      seasonsEnabled: Boolean(series),
      chapterCount: ordered.length,
      chapterWorkStarted: hasStartedChapterWork(ordered)
    },
    series,
    chapters: ordered.map((project, index) => ({
      ...toProjectSummary(normalizeLegacyProject(structuredClone(project))),
      productionProjectId,
      chapterId: project.id,
      productionUnitId: project.id,
      seasonId: project.seriesMembership?.seasonId || null,
      order: project.seriesMembership?.chapterNumber || index + 1,
      title: String(project.chapterTitle || project.title),
      storyBrief: String(project.chapterStory || ''),
      ...chapterRevisionProjection(project),
      ...scenePlanningProjection(project)
    }))
  };
}

function orderedChapterProjects(data, series, source) {
  if (!series) return [source];
  const seasons = new Map(series.seasons.map(item => [item.id, item.number]));
  return data.projects
    .filter(project => project.status !== 'archived' && project.seriesMembership?.seriesId === series.id)
    .sort((a, b) => (seasons.get(a.seriesMembership.seasonId) - seasons.get(b.seriesMembership.seasonId))
      || a.seriesMembership.chapterNumber - b.seriesMembership.chapterNumber);
}

function findStoryProject(data, project) {
  if (project.chapterOrigin?.projectId) {
    const origin = data.projects.find(item => item.id === project.chapterOrigin.projectId && item.status !== 'archived');
    if (origin) return origin;
  }
  if (!project.seriesMembership) return project;
  const siblings = data.projects.filter(item => item.status !== 'archived'
    && item.seriesMembership?.seriesId === project.seriesMembership.seriesId);
  return siblings.find(item => !item.chapterOrigin && (item.fullStoryVersions?.length || item.activeStorySourceVersionId))
    || siblings.find(item => item.fullStoryVersions?.length)
    || siblings.sort((a, b) => a.seriesMembership.chapterNumber - b.seriesMembership.chapterNumber)[0]
    || project;
}

function validateProposalBase(proposal, projects) {
  const current = new Map(projects.map(project => [project.id, project]));
  for (const base of proposal.baseChapterVersions || []) {
    const project = current.get(base.projectId);
    if (!project || project.version !== base.version || (project.activeChapterVersionId || null) !== base.activeChapterVersionId) {
      fail('cinematic_chapter_proposal_stale', 'Chapter content changed after this proposal was created. Review the latest Chapters and generate again.', 409);
    }
  }
}

function reorderAppliedChapters(existing, applied) {
  const appliedIds = new Set(applied.map(project => project.id));
  const retained = existing.filter(project => !appliedIds.has(project.id));
  const seasonCounts = new Map();
  for (const project of [...applied, ...retained]) {
    if (!project.seriesMembership) continue;
    const seasonId = project.seriesMembership.seasonId;
    const next = (seasonCounts.get(seasonId) || 0) + 1;
    seasonCounts.set(seasonId, next);
    project.seriesMembership.chapterNumber = next;
  }
}

function hasStartedChapterWork(projects) {
  return projects.length > 1 || projects.some(project => (
    Boolean(project.chapterGeneration)
    || Boolean(String(project.chapterStory || '').trim())
    || Boolean(project.scenes?.length)
  ));
}

function normalizeGeneratedChapters(value) {
  const chapters = (Array.isArray(value) ? value : []).slice(0, 120).map((item, index) => ({
    title: validTitle(item?.title || `Chapter ${index + 1}`),
    story: String(item?.story || '').trim().slice(0, 50000),
    seasonNumber: Math.max(1, Number(item?.seasonNumber) || 1),
    chapterNumber: Math.max(1, Number(item?.chapterNumber) || index + 1)
  })).filter(item => item.story);
  if (!chapters.length) fail('cinematic_chapters_invalid', 'At least one generated Chapter is required.');
  return chapters;
}

function validChapterStory(value) {
  return String(value || '').trim().slice(0, 50000);
}

function chapterGeneration(proposal, confirmedRevisionId, createdAt) {
  return {
    proposalId: String(proposal?.proposalId || ''),
    confirmedRevisionId,
    provenance: proposal?.provenance ? structuredClone(proposal.provenance) : null,
    createdAt
  };
}
function findProject(data, id) {
  const project = data.projects.find(item => item.id === id && item.status !== 'archived');
  if (!project) fail('cinematic_project_not_found', 'Cinematic Project not found.', 404);
  return project;
}
function findSeries(data, id) {
  const series = data.series.find(item => item.id === id);
  if (!series) fail('cinematic_series_not_found', 'Series not found.', 404);
  return series;
}
function findSeason(series, id) {
  const season = series.seasons.find(item => item.id === id);
  if (!season) fail('cinematic_season_not_found', 'Season not found.', 404);
  return season;
}
function validTitle(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) fail('cinematic_series_title_invalid', 'A title of 1 to 120 characters is required.');
  return value.trim();
}
function assertVersion(record, expected) {
  if (!Number.isInteger(expected) || expected !== record.version) fail('cinematic_version_conflict', 'This workspace changed. Refresh and try again.', 409);
}
function touch(series) { series.version += 1; series.updatedAt = new Date().toISOString(); }
function fail(code, message, statusCode = 400) { throw new RepositoryContractError(code, message, statusCode); }
