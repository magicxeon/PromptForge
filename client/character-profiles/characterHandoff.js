(() => {
  async function useCharacter(characterProfileId, destination = 'scene_builder') {
    const handoff = await window.ModelPromptForgeCharacterProfileApi.createHandoff(
      characterProfileId,
      destination
    );
    window.ModelPromptForgeCharacterProfileState.write({ activeHandoff: handoff });
    if (destination === 'scene_builder') {
      window.ModelPromptForgeRouter.navigate('/studio');
      window.setTimeout(() => {
        const referenceUrl =
          window.ModelPromptForgeActorContext?.appendActorQuery?.(handoff.characterReferenceUrl)
          || handoff.characterReferenceUrl;
        window.ModelPromptForgeCrossModeHandoff?.applyCharacterSheetToSceneBuilder?.({
          sourceMode: 'character-profile',
          sourceJobId: handoff.characterReferenceAssetId,
          sourceImageUrl: referenceUrl,
          sourceSelections: handoff.compatibleAttributeSnapshot || {}
        }, { useAsCharacterRef: true });
        window.ModelPromptForgeCharacterProfileState.write({ activeHandoff: handoff });
      }, 0);
    } else {
      window.dispatchEvent(new CustomEvent('modelpromptforge:characterhandoff', { detail: handoff }));
    }
    return handoff;
  }

  function enrichGenerationPayload(payload) {
    const handoff = window.ModelPromptForgeCharacterProfileState.read().activeHandoff;
    if (!handoff?.characterProfileContext) return payload;
    const activeReferenceIds = Array.isArray(payload.characterReferenceJobIds)
      ? payload.characterReferenceJobIds
      : [];
    if (payload.imageReferences?.characterReference !== true
      || !activeReferenceIds.includes(handoff.characterReferenceAssetId)) {
      clear();
      return payload;
    }
    return {
      ...payload,
      characterProfileContext: handoff.characterProfileContext
    };
  }

  function clear() {
    window.ModelPromptForgeCharacterProfileState.write({ activeHandoff: null });
  }

  window.ModelPromptForgeCharacterHandoff = { useCharacter, enrichGenerationPayload, clear };
})();
