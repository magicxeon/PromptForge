import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { collectionRepo } from '../../repositories/collections/CollectionRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { communityClassificationService } from './CommunityClassificationService.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

export class CommunityCollectionShareService {
  constructor({
    collectionRepository = collectionRepo,
    generationRepository = generationResultRepo,
    postRepository = communityPostRepo,
    profileService = creatorProfileService,
    classificationService = communityClassificationService
  } = {}) {
    this.collectionRepository = collectionRepository;
    this.generationRepository = generationRepository;
    this.postRepository = postRepository;
    this.profileService = profileService;
    this.classificationService = classificationService;
  }

  async publish(collectionId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const collection = await this.collectionRepository.findByIdForOwner(
      collectionId,
      actor.userId
    );
    if (!collection || collection.status === 'deleted') {
      throw new RepositoryContractError(
        'collection_not_found',
        'Owned Collection not found.',
        404
      );
    }

    const existing = (await this.postRepository.readAll()).find(post =>
      post.ownerUserId === actor.userId
      && post.sourceCollectionId === collection.id
      && post.status !== 'removed'
      && post.status !== 'owner_unpublished'
    );
    if (existing) {
      throw new RepositoryContractError(
        'community_collection_already_shared',
        'This Collection is already shared.',
        409
      );
    }

    const memberIds = collectionMemberIds(collection);
    const resolvedMembers = await Promise.all(memberIds.map(id =>
      this.generationRepository.findByIdForOwner(id, actor.userId)
    ));
    const members = resolvedMembers.filter(member =>
      member?.imageUrl && member.status !== 'deleted'
    );
    if (members.length === 0) {
      throw new RepositoryContractError(
        'community_collection_empty',
        'Add at least one available image before sharing this Collection.',
        409
      );
    }

    const coverId = collection.coverGenerationResultId || collection.coverJobId;
    const cover = members.find(member => member.id === coverId) || members[0];
    const snapshot = {
      schemaVersion: 1,
      itemCount: members.length,
      items: members.map((member, index) => ({
        itemId: `item_${String(index + 1).padStart(3, '0')}`,
        imageUrl: member.imageUrl,
        thumbnailUrl: member.thumbnailUrl || member.imageUrl,
        providerDisplayName: displayLabel(
          member.providerDisplayName || member.provider
        ),
        modelDisplayName: displayLabel(
          member.modelDisplayName || member.submodel || member.model
        ),
        createdAt: member.createdAt || timestampToIso(member.timestamp)
      }))
    };
    const profile = await this.profileService.ensureProfileForActor(actor);
    const classification = await this.classificationService.classifyGeneration(
      cover,
      {
        authoringMode: 'collection',
        finalPromptSnapshot: [collection.name, collection.description, collection.story]
          .filter(Boolean)
          .join(', ')
      }
    );
    const taxonomy = await this.classificationService.preparePublishTaxonomy(
      classification,
      {
        officialTags: input.officialTags,
        customTags: input.customTags
      }
    );
    const post = await this.postRepository.create({
      title: normalizeText(input.title || collection.name, 120) || 'Image Collection',
      description: normalizeText(input.description ?? collection.description, 1000),
      postType: 'collection',
      creatorProfileId: profile.id,
      sourceCollectionId: collection.id,
      imageUrl: cover.imageUrl,
      thumbnailUrl: cover.thumbnailUrl || cover.imageUrl,
      promptVisibility: 'hidden',
      collectionSnapshot: snapshot,
      workflowSnapshot: { collection: snapshot },
      visibility: 'public',
      reusePolicy: 'view_only',
      ...taxonomy
    }, actor);

    return {
      ...buildCommunityPostPublicView(post),
      viewer: { isOwner: true }
    };
  }
}

function collectionMemberIds(collection) {
  const ids = Array.isArray(collection.jobIds)
    ? collection.jobIds
    : (Array.isArray(collection.items)
      ? collection.items.map(item => item.generationResultId || item.jobId)
      : []);
  return [...new Set(ids.filter(id => typeof id === 'string' && id))];
}

function normalizeText(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function timestampToIso(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : null;
}

function displayLabel(value) {
  if (typeof value === 'string') return value;
  return value?.en || value?.th || value?.ja || null;
}

export const communityCollectionShareService = new CommunityCollectionShareService();
