/**
 * ModelPromptForge - Community official taxonomy confirmation control.
 */
(function () {
  let catalogPromise = null;
  let catalog = null;
  let selectedTagIds = new Set();
  let suggestionByTagId = new Map();
  let mount = null;
  let customTagText = '';

  const translate = (key, fallback, variables = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;

  function loadCatalog() {
    if (!catalogPromise) {
      const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
      catalogPromise = apiFetch('/api/community/taxonomy')
        .then(async response => {
          if (!response.ok) throw new Error('Community taxonomy is unavailable.');
          return response.json();
        })
        .catch(error => {
          catalogPromise = null;
          throw error;
        });
    }
    return catalogPromise;
  }

  async function initialize({ mountElement, suggestion = {} } = {}) {
    mount = mountElement || document.getElementById('share-modal-taxonomy-picker');
    suggestionByTagId = new Map((suggestion.suggestions || []).map(item => [item.tagId, item]));
    selectedTagIds = new Set(suggestionByTagId.keys());
    customTagText = '';

    try {
      catalog = await loadCatalog();
    } catch (error) {
      catalog = null;
      console.warn('[CommunityTaxonomy] Catalog loading failed:', error.message);
    }
    render();
  }

  function render() {
    if (!mount) return;
    mount.replaceChildren();

    const selectedRegion = document.createElement('div');
    selectedRegion.className = 'community-taxonomy-selection';
    selectedRegion.setAttribute('aria-live', 'polite');

    if (selectedTagIds.size === 0) {
      const empty = document.createElement('p');
      empty.className = 'community-taxonomy-empty';
      empty.textContent = translate(
        'community.taxonomy.noSuggestions',
        'No confident suggestions yet. Add an official tag if one applies.'
      );
      selectedRegion.appendChild(empty);
    } else {
      selectedTagIds.forEach(tagId => selectedRegion.appendChild(createSelectedTag(tagId)));
    }
    mount.appendChild(selectedRegion);

    if (catalog) {
      const addRow = document.createElement('div');
      addRow.className = 'community-taxonomy-add-row';

      const select = document.createElement('select');
      select.id = 'share-modal-taxonomy-add';
      select.className = 'custom-select community-taxonomy-select';
      select.setAttribute('aria-label', translate('community.taxonomy.addOfficial', 'Add official tag'));

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = translate('community.taxonomy.addOfficial', 'Add official tag');
      select.appendChild(placeholder);

      catalog.dimensions.forEach(dimension => {
        const group = document.createElement('optgroup');
        group.label = localizedLabel(dimension.labels, dimension.id);
        dimension.tags.filter(tag => !selectedTagIds.has(tag.id)).forEach(tag => {
          const option = document.createElement('option');
          option.value = tag.id;
          option.textContent = localizedLabel(tag.labels, tag.id);
          group.appendChild(option);
        });
        if (group.children.length) select.appendChild(group);
      });

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'btn-neon-outline community-taxonomy-add';
      addButton.textContent = translate('community.taxonomy.add', 'Add');
      addButton.disabled = select.options.length <= 1;
      addButton.addEventListener('click', () => {
        if (!select.value) return;
        selectedTagIds.add(select.value);
        render();
      });

      addRow.append(select, addButton);
      mount.appendChild(addRow);
    }

    const customLabel = document.createElement('label');
    customLabel.className = 'community-taxonomy-custom-field';
    const customTitle = document.createElement('span');
    customTitle.className = 'sub-label';
    customTitle.textContent = translate('community.taxonomy.customTags', 'Custom search tags');
    const customInput = document.createElement('input');
    customInput.id = 'share-modal-custom-tags';
    customInput.type = 'text';
    customInput.className = 'custom-select';
    customInput.value = customTagText;
    customInput.placeholder = translate(
      'community.taxonomy.customPlaceholder',
      'e.g. wedding, influencer, summer campaign'
    );
    customInput.setAttribute('aria-describedby', 'share-modal-custom-tags-help');
    customInput.addEventListener('input', () => {
      customTagText = customInput.value;
    });
    const help = document.createElement('small');
    help.id = 'share-modal-custom-tags-help';
    help.className = 'community-taxonomy-help';
    help.textContent = translate(
      'community.taxonomy.customHelp',
      'Custom tags improve search but do not affect category ranking or Trending.'
    );
    customLabel.append(customTitle, customInput, help);
    mount.appendChild(customLabel);
  }

  function createSelectedTag(tagId) {
    const suggestion = suggestionByTagId.get(tagId);
    const tag = findTag(tagId);
    const label = document.createElement('label');
    label.className = 'community-taxonomy-chip';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.value = tagId;
    checkbox.addEventListener('change', () => {
      selectedTagIds.delete(tagId);
      render();
    });

    const name = document.createElement('span');
    name.textContent = localizedLabel(tag?.labels, tagId);
    label.append(checkbox, name);

    if (suggestion?.confidenceLevel) {
      const confidence = document.createElement('small');
      confidence.className = `community-taxonomy-confidence is-${suggestion.confidenceLevel}`;
      confidence.textContent = translate(
        `community.taxonomy.confidence.${suggestion.confidenceLevel}`,
        suggestion.confidenceLevel
      );
      label.appendChild(confidence);
    }
    return label;
  }

  function getSelection() {
    const customInput = document.getElementById('share-modal-custom-tags');
    const customTags = String(customInput?.value ?? customTagText)
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    return {
      officialTags: [...selectedTagIds],
      customTags
    };
  }

  function findTag(tagId) {
    for (const dimension of catalog?.dimensions || []) {
      const tag = dimension.tags.find(item => item.id === tagId);
      if (tag) return tag;
    }
    return null;
  }

  function localizedLabel(labels, fallback) {
    if (!labels || typeof labels !== 'object') return fallback;
    const locale = window.ModelPromptForgeI18n?.getLocale?.() || 'en';
    return labels[locale] || labels.en || Object.values(labels).find(Boolean) || fallback;
  }

  window.ModelPromptForgeCommunityTaxonomyPicker = {
    initialize,
    getSelection
  };
})();
