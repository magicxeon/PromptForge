(() => {
  let activeRoute = null;
  let activeModel = null;
  let requestVersion = 0;
  let manageMode = false;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    window.addEventListener('modelpromptforge:route', event => activate(event.detail));
    window.addEventListener('modelpromptforge:actorchange', refresh);
    window.addEventListener('modelpromptforge:languagechange', refresh);
    activate(window.ModelPromptForgeRouter?.current?.());
  }

  function activate(route) {
    const match = String(route?.pathname || '').match(/^\/creators\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) {
      activeRoute = null;
      activeModel = null;
      manageMode = false;
      return;
    }
    activeRoute = {
      handle: decodeURIComponent(match[1]),
      tab: window.ModelPromptForgeCreatorProfileTabs.tabFromPath(route.pathname)
    };
    manageMode = route?.state?.openProfileManager === true && activeRoute.tab === 'overview';
    load();
  }

  function refresh() {
    if (activeRoute) load();
  }

  async function openOwnProfile() {
    const profile = await window.ModelPromptForgeCommunityCreatorApi.getOwnProfile();
    window.ModelPromptForgeRouter.navigate(`/creators/${encodeURIComponent(profile.handle)}`);
  }

  async function load() {
    const mount = document.getElementById('creator-profile-page');
    if (!mount || !activeRoute) return;
    const version = ++requestVersion;
    renderStatus(mount, t('community.creator.loading', 'Loading creator profile...'));
    try {
      const model = await window.ModelPromptForgeCommunityCreatorApi.getPage(
        activeRoute.handle,
        { tab: activeRoute.tab, limit: 24 }
      );
      if (version !== requestVersion) return;
      activeModel = model;
      render(mount, model);
    } catch (error) {
      if (version !== requestVersion) return;
      renderStatus(mount, error.message || t(
        'community.creator.unavailable',
        'Creator profile is unavailable.'
      ), true);
    }
  }

  function render(mount, model) {
    mount.replaceChildren();
    const headerMount = document.createElement('div');
    const tabsMount = document.createElement('div');
    const manageMount = document.createElement('div');
    const contentMount = document.createElement('div');
    contentMount.className = 'creator-profile-content';
    mount.append(headerMount, tabsMount, manageMount, contentMount);
    window.ModelPromptForgeCreatorProfileHeader.render({
      mount: headerMount,
      model,
      onEdit: () => openEditor(model),
      onManage: () => {
        if (model.selectedTab !== 'overview') {
          window.ModelPromptForgeRouter.navigate(
            `/creators/${encodeURIComponent(model.profile.handle)}`,
            { state: { openProfileManager: true } }
          );
          return;
        }
        manageMode = !manageMode;
        renderManagePanel(manageMount, model);
      },
      onFollowChanged: load
    });
    window.ModelPromptForgeCreatorProfileTabs.render({ mount: tabsMount, model });
    renderManagePanel(manageMount, model);
    if (model.selectedTab === 'overview') {
      window.ModelPromptForgeCreatorProfileOverview.render({ mount: contentMount, model });
    } else {
      renderTab(contentMount, model);
    }
  }

  function renderTab(mount, model) {
    const tab = model.tabData?.kind || model.selectedTab;
    const page = model.tabData?.page || { items: [] };
    const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
      title: t(`community.creator.tab.${tab}`, tabLabel(tab)),
      count: page.totalApprox ?? page.items?.length ?? 0,
      emptyText: t('community.creator.sectionEmpty', 'Nothing public here yet.')
    });
    if (!page.items?.length) {
      section.setEmpty();
    } else if (tab === 'characters') {
      window.ModelPromptForgeCommunityCharacterSection.renderItems(
        section.body,
        page.items,
        { variant: 'directory' }
      );
    } else {
      section.body.appendChild(
        window.ModelPromptForgeCreatorProfileComponents.createPostGrid(page.items, {
          className: tab === 'gallery' ? 'is-gallery' : '',
          onOpen: window.ModelPromptForgeCreatorProfileComponents.openCommunityItem
        })
      );
    }
    mount.replaceChildren(section.element);
  }

  function renderManagePanel(mount, model) {
    mount.replaceChildren();
    if (!manageMode || !model.viewer.isOwner || !model.management) return;
    const panel = document.createElement('section');
    panel.className = 'creator-profile-manage-panel';
    const heading = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = t('community.creator.managePresentation', 'Manage profile presentation');
    const help = document.createElement('p');
    help.textContent = t(
      'community.creator.manageHelp',
      'Choose a public cover and the work shown first on your Overview.'
    );
    heading.append(title, help);
    const form = document.createElement('form');
    const candidates = uniqueItems([
      ...(model.overview?.featured?.items || []),
      ...(model.overview?.templates?.items || []),
      ...(model.overview?.comparisons?.items || []),
      model.overview?.latestCollection
    ].filter(Boolean));
    const cover = selectField(
      t('community.creator.coverWork', 'Cover work'),
      candidates,
      model.management.presentation.coverPostId
    );
    const featured = multiSelectField(
      t('community.creator.featuredWorks', 'Featured works'),
      candidates,
      model.management.presentation.featuredPostIds || []
    );
    const save = actionButton(t('community.creator.savePresentation', 'Save presentation'), 'primary');
    save.type = 'submit';
    const status = document.createElement('p');
    status.className = 'creator-profile-action-error';
    status.setAttribute('role', 'status');
    status.hidden = true;
    form.append(cover.wrapper, featured.wrapper, save, status);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      save.disabled = true;
      status.hidden = true;
      try {
        await window.ModelPromptForgeCommunityCreatorApi.updateOwnPresentation({
          recordVersion: model.management.recordVersion,
          presentation: {
            ...model.management.presentation,
            coverPostId: cover.control.value || null,
            featuredPostIds: [...featured.control.selectedOptions].map(option => option.value)
          }
        });
        manageMode = false;
        await load();
      } catch (error) {
        status.textContent = error.message || t(
          'community.creator.actionFailed',
          'The creator profile could not be updated.'
        );
        status.hidden = false;
      } finally {
        save.disabled = false;
      }
    });
    panel.append(heading, form);
    mount.appendChild(panel);
  }

  function openEditor(model) {
    document.getElementById('creator-profile-editor-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'creator-profile-editor-dialog';
    dialog.className = 'creator-profile-editor-dialog';
    const form = document.createElement('form');
    const heading = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = t('community.creator.edit', 'Edit creator profile');
    const close = actionButton('\u00d7', 'icon');
    close.setAttribute('aria-label', t('community.creator.closeEditor', 'Close editor'));
    close.addEventListener('click', () => dialog.close());
    heading.append(title, close);
    const fields = {
      displayName: textField(t('community.creator.displayName', 'Display name'), model.profile.displayName, 80),
      headline: textField(t('community.creator.headline', 'Headline'), model.profile.headline || '', 120),
      bio: textareaField(t('community.creator.bio', 'Bio'), model.profile.bio || '', 500),
      location: textField(t('community.creator.location', 'Location'), model.profile.locationText || '', 100),
      website: textField(t('community.creator.website', 'Website'), model.profile.websiteUrl || '', 300, 'url'),
      roles: textField(t('community.creator.roles', 'Creator roles'), model.profile.creatorRoles.join(', '), 180),
      languages: textField(t('community.creator.languages', 'Languages'), model.profile.languageCodes.join(', '), 120),
      categories: textField(t('community.creator.categories', 'Content categories'), model.profile.contentCategoryCodes.join(', '), 180)
    };
    const error = document.createElement('p');
    error.className = 'creator-profile-action-error';
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const footer = document.createElement('footer');
    const cancel = actionButton(t('community.creator.cancel', 'Cancel'), 'secondary');
    cancel.addEventListener('click', () => dialog.close());
    const save = actionButton(t('community.creator.save', 'Save profile'), 'primary');
    save.type = 'submit';
    footer.append(cancel, save);
    form.append(
      heading,
      ...Object.values(fields).map(item => item.wrapper),
      error,
      footer
    );
    form.addEventListener('submit', async event => {
      event.preventDefault();
      save.disabled = true;
      error.hidden = true;
      try {
        await window.ModelPromptForgeCommunityCreatorApi.updateOwnProfile({
          displayName: fields.displayName.control.value,
          bio: fields.bio.control.value,
          recordVersion: model.management.recordVersion,
          presentation: {
            ...model.management.presentation,
            headline: fields.headline.control.value,
            locationText: fields.location.control.value,
            websiteUrl: fields.website.control.value || null,
            creatorRoles: csv(fields.roles.control.value),
            languageCodes: csv(fields.languages.control.value),
            contentCategoryCodes: csv(fields.categories.control.value)
          }
        });
        dialog.close();
        await load();
      } catch (error) {
        showError(error);
      }
    });
    function showError(requestError) {
      error.textContent = requestError.message || t(
        'community.creator.actionFailed',
        'The creator profile could not be updated.'
      );
      error.hidden = false;
      save.disabled = false;
    }
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal();
  }

  function textField(label, value, maxLength, type = 'text') {
    const control = document.createElement('input');
    control.type = type;
    control.value = value;
    control.maxLength = maxLength;
    return field(label, control);
  }

  function textareaField(label, value, maxLength) {
    const control = document.createElement('textarea');
    control.value = value;
    control.maxLength = maxLength;
    control.rows = 4;
    return field(label, control);
  }

  function field(label, control) {
    const wrapper = document.createElement('label');
    const copy = document.createElement('span');
    copy.textContent = label;
    wrapper.append(copy, control);
    return { wrapper, control };
  }

  function selectField(label, items, selectedValue) {
    const control = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t('community.creator.noCover', 'No cover selected');
    control.appendChild(empty);
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title || t('community.creator.untitled', 'Untitled');
      option.selected = item.id === selectedValue;
      control.appendChild(option);
    });
    return field(label, control);
  }

  function multiSelectField(label, items, selectedValues) {
    const selected = new Set(selectedValues);
    const control = document.createElement('select');
    control.multiple = true;
    control.size = Math.min(4, Math.max(2, items.length));
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title || t('community.creator.untitled', 'Untitled');
      option.selected = selected.has(item.id);
      control.appendChild(option);
    });
    return field(label, control);
  }

  function actionButton(label, variant) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `creator-profile-button is-${variant}`;
    button.textContent = label;
    return button;
  }

  function renderStatus(mount, message, isError = false) {
    const status = document.createElement('section');
    status.className = `creator-profile-status${isError ? ' is-error' : ''}`;
    status.textContent = message;
    mount.replaceChildren(status);
  }

  const csv = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  const uniqueItems = items => [...new Map(items.map(item => [item.id, item])).values()];
  const tabLabel = tab => tab.charAt(0).toUpperCase() + tab.slice(1);

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCreatorProfilePage = { initialize, openOwnProfile };
})();
