import crypto from 'crypto';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';

const DESTINATIONS = new Set(['character_sheet', 'scene_builder', 'playground']);
const SOURCE_TYPES = new Set(['generation', 'community_post']);
const HANDOFF_TTL_MS = 30 * 60_000;

export class FaceReferenceHandoffService {
  constructor({
    generationRepository = generationResultRepo,
    postRepository = communityPostRepo,
    now = () => Date.now(),
    secret = process.env.FACE_REFERENCE_HANDOFF_SECRET
      || process.env.HISTORY_CURSOR_SECRET
      || 'local-face-reference-handoff'
  } = {}) {
    this.generationRepository = generationRepository;
    this.postRepository = postRepository;
    this.now = now;
    this.secret = secret;
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const sourceType = normalizedMember(input.sourceType, SOURCE_TYPES, 'face_reference_source_invalid');
    const destination = normalizedMember(input.destination, DESTINATIONS, 'face_reference_destination_invalid');
    const sourceId = String(input.sourceId || '').trim();
    if (!sourceId) {
      throw new RepositoryContractError(
        'face_reference_source_required',
        'A face reference source ID is required.'
      );
    }

    const resolved = sourceType === 'generation'
      ? await this.resolveOwnedGeneration(sourceId, actor)
      : await this.resolveCommunityPost(sourceId, actor);
    const expiresAtMs = this.now() + HANDOFF_TTL_MS;
    const authorization = {
      version: 1,
      actorUserId: actor.userId,
      sourceType,
      sourceId,
      jobId: resolved.generation.id,
      destination,
      expiresAt: new Date(expiresAtMs).toISOString()
    };

    return {
      handoffVersion: 1,
      destination,
      referenceRole: 'face_reference',
      referenceValue: {
        source: 'history',
        jobId: resolved.generation.id,
        imageUrl: resolved.generation.imageUrl,
        referenceId: null
      },
      source: {
        type: sourceType,
        id: sourceId,
        ownerUserId: resolved.generation.ownerUserId,
        ownerUsername: resolved.generation.ownerUsername || null
      },
      attribution: {
        creatorDisplayName: resolved.creatorDisplayName || resolved.generation.ownerUsername || null,
        communityPostId: resolved.communityPostId || null
      },
      authorizationToken: signAuthorization(authorization, this.secret),
      expiresAt: authorization.expiresAt
    };
  }

  verifyAuthorization(token, actorContext, expectedJobId = null) {
    const actor = assertActorContext(actorContext);
    const authorization = verifySignedAuthorization(token, this.secret);
    if (!authorization
      || authorization.version !== 1
      || authorization.actorUserId !== actor.userId
      || !DESTINATIONS.has(authorization.destination)
      || !SOURCE_TYPES.has(authorization.sourceType)
      || Date.parse(authorization.expiresAt || '') <= this.now()
      || (expectedJobId && authorization.jobId !== expectedJobId)) {
      throw new RepositoryContractError(
        'face_reference_handoff_invalid',
        'The Face reference authorization is invalid or expired.',
        403
      );
    }
    return authorization;
  }

  async resolveOwnedGeneration(sourceId, actor) {
    const generation = await this.generationRepository.findByIdForOwner(sourceId, actor.userId);
    assertEligibleGeneration(generation);
    return { generation, creatorDisplayName: actor.displayName || actor.username };
  }

  async resolveCommunityPost(sourceId, actor) {
    const post = await this.postRepository.findById(sourceId);
    const isOwner = post?.ownerUserId === actor.userId;
    const publiclyReusable = post?.status === 'published'
      && post.visibility === 'public'
      && post.faceReusePolicy === 'public_reusable';
    if (!post
      || post.sourceGenerationMode !== 'headshot'
      || (!isOwner && !publiclyReusable)) {
      throw new RepositoryContractError(
        'face_reference_reuse_unavailable',
        'This Community face is not available for reuse.',
        403
      );
    }
    const generation = await this.generationRepository.findById(post.sourceGenerationResultId);
    assertEligibleGeneration(generation);
    return {
      generation,
      creatorDisplayName: post.creatorDisplayName || post.ownerUsername || null,
      communityPostId: post.id
    };
  }
}

function assertEligibleGeneration(generation) {
  if (!generation || generation.status !== 'completed' || generation.mode !== 'headshot' || !generation.imageUrl) {
    throw new RepositoryContractError(
      'face_reference_source_ineligible',
      'Only a completed Face Creation result can be used as a Face reference.',
      409
    );
  }
}

function normalizedMember(value, allowed, code) {
  const normalized = String(value || '').trim();
  if (!allowed.has(normalized)) {
    throw new RepositoryContractError(code, 'The requested Face reference handoff is invalid.');
  }
  return normalized;
}

function signAuthorization(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySignedAuthorization(token, secret) {
  if (typeof token !== 'string') return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export const faceReferenceHandoffService = new FaceReferenceHandoffService();
