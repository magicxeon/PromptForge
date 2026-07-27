(() => {
  let currentProfile = null;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function activate(characterId) {
    const page = document.getElementById('character-profile-page');
    if (!page || !characterId) return;
    if (currentProfile?.id !== characterId) {
      window.ModelPromptForgeCharacterProfileViewMode?.reset?.();
    }
    page.setAttribute('aria-busy', 'true');
    page.innerHTML = `<p class="character-profile-state">${t('character-profiles.states.loading', 'Loading Character...')}</p>`;
    try {
      let profile;
      try {
        profile = await window.ModelPromptForgeCharacterProfileApi.getOwn(characterId);
      } catch {
        profile = await window.ModelPromptForgeCharacterProfileApi.getPublic(characterId);
      }
      currentProfile = profile;
      render(page, profile);
    } catch (error) {
      page.innerHTML = `<section class="character-profile-state"><h2>${t('character-profiles.states.unavailable', 'Character unavailable')}</h2><p>${escapeHtml(error.message)}</p></section>`;
    } finally {
      page.setAttribute('aria-busy', 'false');
    }
  }

  function render(page, profile) {
    const version = (profile.versions || []).find(item => item.id === profile.activeVersionId)
      || profile.versions?.[0]
      || null;
    const approved = profile.status === 'approved';
    const characterType = window.ModelPromptForgeCharacterTypeControl
      ?.normalizeType?.(profile.characterType) || 'reusable_model';
    const hasCanonical = approved || Boolean(
      characterType === 'styled_character'
        ? version?.canonicalCharacterSheetAssetId
        : version?.castingExportGenerationResultId
    );
    const image = hasCanonical
      ? actorMediaUrl(`/api/community/character-profiles/${encodeURIComponent(profile.id)}/image`)
      : '';
    const ownerProfile = profile.isOwner === true;
    const isOwner = ownerProfile
      && !window.ModelPromptForgeCharacterProfileViewMode?.isPreviewing?.();
    page.replaceChildren();

    window.ModelPromptForgeBreadcrumbs?.setResource?.({
      type: 'character-profile',
      id: profile.id,
      label: profile.displayName
    });

    const contextMount = document.createElement('header');
    contextMount.className = 'character-profile-context';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'character-profile-back';
    back.textContent = t('common.action.back', 'Back');
    back.addEventListener('click', () => window.ModelPromptForgeRouter.back({
      canonicalParent: '/community/characters'
    }));
    const viewMount = document.createElement('div');
    viewMount.className = 'character-profile-view-mode';
    contextMount.append(back, viewMount);

    const heroMount = document.createElement('div');
    const statsMount = document.createElement('div');
    const lower = document.createElement('div');
    lower.className = `character-profile-lower${isOwner && approved ? ' has-settings' : ''}`;
    const worksMount = document.createElement('section');
    worksMount.className = 'character-profile-works';
    const sharingMount = document.createElement('div');
    lower.append(worksMount);
    if (isOwner && approved) lower.appendChild(sharingMount);
    page.append(contextMount, heroMount, statsMount, lower);

    window.ModelPromptForgeCharacterProfileViewMode?.render?.({
      mount: viewMount,
      isOwner: ownerProfile,
      onChange: () => render(page, profile)
    });
    window.ModelPromptForgeCharacterProfileHero?.render?.({
      mount: heroMount,
      model: buildHeroModel({
        profile,
        image,
        characterType,
        isOwner,
        approved,
        hasCanonical
      }),
      actions: buildActions({ page, profile, version, isOwner, approved, characterType })
    });
    window.ModelPromptForgeCharacterProfileStats?.render?.({
      mount: statsMount,
      stats: profile.stats || {}
    });
    void window.ModelPromptForgeCharacterProfileWorks?.render?.({
      mount: worksMount,
      profileId: profile.id,
      isOwner,
      onCreate: () => window.ModelPromptForgeCharacterHandoff.useCharacter(
        profile.id,
        'scene_builder'
      )
    });
    if (isOwner && approved) {
      window.ModelPromptForgeCharacterSharingPanel?.render?.({
        mount: sharingMount,
        profile,
        onSave: async values => {
          await window.ModelPromptForgeCharacterProfileApi.updateSharing(
            profile.id,
            values
          );
          await activate(profile.id);
        }
      });
    }
  }

  function buildHeroModel({
    profile,
    image,
    characterType,
    isOwner,
    approved,
    hasCanonical
  }) {
    const availability = profile.reuseStatus === 'available'
      || profile.reusePolicy === 'public_reusable'
      ? 'available'
      : profile.reuseStatus === 'view_only' || profile.reusePolicy === 'view_only'
        ? 'view-only'
        : 'owner-only';
    return {
      id: profile.id,
      displayName: profile.displayName,
      imageUrl: image,
      emptyMediaLabel: hasCanonical
        ? t('character-profiles.states.mediaUnavailable', 'Character image unavailable')
        : t('character-profiles.states.castingRequired', 'Casting export required'),
      ownerLabel: profile.ownerUsernameSnapshot || profile.ownerUsername || 'Creator',
      ownerRoute: profile.ownerUsername
        ? `/creators/${encodeURIComponent(profile.ownerUsername)}`
        : '',
      description: profile.shortDescription || '',
      personality: profile.personalitySummary
        || t('character-profiles.page.noPersonality', 'No personality description yet.'),
      characterTypeLabel: typeLabel(characterType),
      availability,
      availabilityLabel: statusLabel(profile),
      isOwner,
      approved,
      canDownload: isOwner && Boolean(image),
      isCommunityPublic: profile.visibility === 'public',
      badges: [
        {
          label: typeLabel(characterType),
          className: `character-type-badge ${characterType === 'styled_character'
            ? 'is-styled'
            : 'is-reusable'}`
        },
        ...(profile.intendedUses || []).map(use => ({ label: useLabel(use) }))
      ]
    };
  }

  function buildActions({ page, profile, version, isOwner, approved, characterType }) {
    const actions = [];
    const styled = characterType === 'styled_character';
    const destinations = new Set(profile.destinationCapabilities || (
      styled ? ['scene_builder'] : ['fashion_blueprint', 'scene_builder']
    ));
    if (approved && (profile.handoffAvailable || isOwner)) {
      if (destinations.has('scene_builder')) {
        actions.push({
          id: 'scene',
          label: t('character-profiles.actions.useScene', 'Use in Scene Builder'),
          variant: 'primary',
          onClick: () => window.ModelPromptForgeCharacterHandoff.useCharacter(
            profile.id,
            'scene_builder'
          )
        });
      }
      if (destinations.has('fashion_blueprint')) {
        actions.push({
          id: 'fashion',
          label: t('character-profiles.actions.useFashion', 'Use in Fashion Blueprint'),
          variant: 'secondary',
          onClick: async () => {
            await window.ModelPromptForgeCharacterHandoff.useCharacter(
              profile.id,
              'fashion_blueprint'
            );
            await window.AppDialog?.alert?.(
              t('character-profiles.actions.fashionPrepared', 'Character selected. Fashion Blueprint will use it when that workspace opens.'),
              { title: t('character-profiles.actions.characterSelected', 'Character selected') }
            );
          }
        });
      }
    }
    if (!isOwner) return actions;
    actions.push({
      id: 'edit',
      label: t('character-profiles.actions.edit', 'Edit Character'),
      variant: 'owner',
      onClick: () => window.ModelPromptForgeCharacterProfileEditor.openEdit(
        profile,
        updated => {
          currentProfile = updated;
          render(page, updated);
        }
      )
    });
    if (styled && profile.status === 'draft') {
      actions.push(approvalAction(page, profile, version, 'approveStyled'));
    } else if (!styled && ['draft', 'export_pending'].includes(profile.status)) {
      actions.push(castingAction(profile, version, 'generateCasting'));
    }
    if (!styled && profile.status === 'review') {
      actions.push(approvalAction(page, profile, version, 'approve'));
      actions.push(castingAction(profile, version, 'regenerateCasting'));
    }
    if (styled) {
      actions.push({
        id: 'convert',
        label: t('character-profiles.actions.convertReusable', 'Create Reusable Model'),
        variant: 'owner',
        onClick: async () => {
          const converted = await window.ModelPromptForgeCharacterProfileApi
            .convertToReusable(profile.id);
          const activeVersion = (converted.versions || [])
            .find(item => item.id === converted.activeVersionId);
          await window.ModelPromptForgeCharacterCastingExport.begin(
            converted.id,
            activeVersion?.id || converted.activeVersionId
          );
        }
      });
    }
    return actions;
  }

  function approvalAction(page, profile, version, labelKey) {
    return {
      id: 'approve',
      label: t(`character-profiles.actions.${labelKey}`, 'Approve Character'),
      variant: 'owner',
      onClick: async () => {
        await window.ModelPromptForgeCharacterProfileApi.approve(profile.id, {
          characterProfileVersionId: version?.id || profile.activeVersionId,
          consentDeclarationVersion: 'character-rights-v1'
        });
        await activate(profile.id);
      }
    };
  }

  function castingAction(profile, version, labelKey) {
    return {
      id: 'casting',
      label: t(`character-profiles.actions.${labelKey}`, 'Generate Casting Export'),
      variant: 'owner',
      onClick: () => window.ModelPromptForgeCharacterCastingExport.begin(
        profile.id,
        version?.id || profile.activeVersionId
      )
    };
  }

  function statusLabel(profile) {
    if (profile.reuseStatus === 'available' || profile.reusePolicy === 'public_reusable') {
      return t('character-profiles.status.available', 'Available to use');
    }
    if (profile.reuseStatus === 'view_only' || profile.reusePolicy === 'view_only') {
      return t('character-profiles.status.viewOnly', 'View only');
    }
    if (profile.status !== 'approved') return t('character-profiles.status.draft', 'Owner draft');
    return t('character-profiles.status.ownerOnly', 'Owner only');
  }

  const useLabel = use => ({
    fashion: t('character-profiles.uses.fashion', 'Fashion'),
    scene_story: t('character-profiles.uses.scene', 'Scene / Story'),
    general: t('character-profiles.uses.general', 'General')
  })[use] || use;
  const typeLabel = value => value === 'styled_character'
    ? t('character-profiles.type.outfitBound', 'Outfit bound')
    : t('character-profiles.type.reusable', 'Reusable Model');
  const actorMediaUrl = value =>
    window.ModelPromptForgeActorContext?.appendActorQuery?.(value) || value;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  window.addEventListener('modelpromptforge:route', event => {
    const match = event.detail.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.addEventListener('modelpromptforge:actorchange', () => {
    const match = location.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.addEventListener('modelpromptforge:languagechange', () => {
    const match = location.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.ModelPromptForgeCharacterProfilePage = { activate };
})();
