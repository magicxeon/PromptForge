(() => {
  let active = false;
  let loading = false;
  let model = { overview: null, users: [], generations: [], posts: [], auditEvents: [], ledger: [], selectedUserId: null };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const translate = (key, fallback, variables = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;
  const formatDate = value => value
    ? (window.ModelPromptForgeI18n?.formatDate?.(value, { dateStyle: 'medium', timeStyle: 'short' }) || String(value))
    : '';
  const isAdmin = () => window.state?.userRole === 'admin';
  const canAccess = () => ['admin', 'support'].includes(window.state?.userRole || 'user');

  function mount() {
    const page = document.getElementById('admin-page');
    if (!page || page.dataset.mounted === 'true') return page;
    page.dataset.mounted = 'true';
    page.innerHTML = `<header class="admin-page-header"><div><span class="community-home-kicker" data-i18n="admin.kicker">INTERNAL OPERATIONS</span><h2 data-i18n="admin.title">Admin & Support</h2><p data-i18n="admin.description">Moderation, credit adjustments and append-only audit records.</p></div><button type="button" data-admin-action="refresh" data-i18n="common.action.refresh">Refresh</button></header><section id="admin-overview" class="admin-overview-grid" aria-live="polite"></section><section class="admin-grid"><article class="admin-section"><h3 data-i18n="admin.users.title">Users</h3><p data-i18n="admin.users.description">Mock user status, role and available credits.</p><div id="admin-users" class="admin-list"></div></article><article class="admin-section"><h3 data-i18n="admin.generations.title">Recent generations</h3><p data-i18n="admin.generations.description">Latest completed or failed generation records.</p><div id="admin-generations" class="admin-list"></div></article><article class="admin-section"><h3 data-i18n="admin.posts.title">Community posts</h3><p data-i18n="admin.posts.description">Hiding or removing a post always needs a reason and creates an audit event.</p><div id="admin-posts" class="admin-list"></div></article><article class="admin-section"><h3 data-i18n="admin.credits.title">Credit ledger</h3><p data-i18n="admin.credits.description">Choose a user to inspect their ledger. Only admins can adjust credits.</p><label><span class="sr-only" data-i18n="admin.users.user">User</span><select id="admin-user-select"></select></label><form id="admin-adjustment-form" class="admin-adjustment-form" ${isAdmin() ? '' : 'hidden'}><input id="admin-adjustment-reason" maxlength="240" data-i18n-placeholder="admin.credits.reasonPlaceholder" placeholder="Adjustment reason" required><input id="admin-adjustment-delta" type="number" step="1" data-i18n-placeholder="admin.credits.deltaPlaceholder" placeholder="+/- credits" required><button type="submit" data-i18n="admin.credits.adjust">Adjust</button></form><div id="admin-ledger" class="admin-list"></div></article></section><section class="admin-section"><h3 data-i18n="admin.audit.title">Audit events</h3><p data-i18n="admin.audit.description">Operational audit records cannot be edited through the application.</p><div id="admin-audit-events" class="admin-list"></div><div id="admin-status" class="admin-status" role="status"></div></section>`;
    page.onclick = onClick;
    page.querySelector('#admin-user-select')?.addEventListener('change', event => loadLedger(event.target.value));
    page.querySelector('#admin-adjustment-form')?.addEventListener('submit', onAdjustment);
    window.ModelPromptForgeI18n?.translateDom?.(page);
    return page;
  }

  async function activate() {
    active = true;
    await window.ModelPromptForgeI18n?.loadNamespaces?.(['admin', 'common']);
    const page = mount();
    if (!page) return;
    if (!canAccess()) {
      page.dataset.mounted = '';
      page.innerHTML = `<section class="admin-section"><h3>${escapeHtml(translate('admin.access.title', 'Admin access required'))}</h3><p>${escapeHtml(translate('admin.access.description', 'Switch to an admin or support mock user to open internal operations.'))}</p></section>`;
      return;
    }
    await refresh();
  }

  async function refresh() {
    if (loading || !canAccess()) return;
    loading = true;
    setStatus(translate('admin.status.loading', 'Loading backoffice data...'));
    try {
      const [overview, usersPage, generationsPage, postsPage, auditPage] = await Promise.all([
        window.ModelPromptForgeAdminApi.getOverview(),
        window.ModelPromptForgeAdminApi.listUsers(),
        window.ModelPromptForgeAdminApi.listGenerations(),
        window.ModelPromptForgeAdminApi.listPosts(),
        window.ModelPromptForgeAdminApi.listAuditEvents()
      ]);
      model.overview = overview;
      model.users = usersPage.items || [];
      model.generations = generationsPage.items || [];
      model.posts = postsPage.items || [];
      model.auditEvents = auditPage.items || [];
      model.selectedUserId = model.users.some(user => user.id === model.selectedUserId) ? model.selectedUserId : model.users[0]?.id || null;
      render();
      if (model.selectedUserId) await loadLedger(model.selectedUserId, false);
      setStatus(translate('admin.status.current', 'Backoffice data is current.'));
    } catch (error) {
      setStatus(error.message || translate('admin.error.load', 'Unable to load backoffice data.'));
    } finally {
      loading = false;
    }
  }

  async function loadLedger(userId, rerender = true) {
    if (!userId || !canAccess()) return;
    model.selectedUserId = userId;
    try {
      const page = await window.ModelPromptForgeAdminApi.getLedger(userId);
      model.ledger = page.items || [];
      if (rerender) render(); else renderLedger();
    } catch (error) {
      setStatus(error.message || translate('admin.error.ledger', 'Unable to load credit ledger.'));
    }
  }

  function render() {
    const page = mount();
    if (!page) return;
    page.querySelector('#admin-overview').innerHTML = overviewMarkup(model.overview);
    const userSelect = page.querySelector('#admin-user-select');
    userSelect.innerHTML = model.users.map(user => `<option value="${escapeHtml(user.id)}" ${user.id === model.selectedUserId ? 'selected' : ''}>${escapeHtml(user.displayName)} (${escapeHtml(user.role)})</option>`).join('');
    page.querySelector('#admin-users').innerHTML = model.users.length ? model.users.map(userMarkup).join('') : emptyMarkup(translate('admin.empty.users', 'No users are available.'));
    page.querySelector('#admin-generations').innerHTML = model.generations.length ? model.generations.map(generationMarkup).join('') : emptyMarkup(translate('admin.empty.generations', 'No generation records are available.'));
    page.querySelector('#admin-posts').innerHTML = model.posts.length ? model.posts.map(postMarkup).join('') : emptyMarkup(translate('admin.empty.posts', 'No community posts are available.'));
    page.querySelector('#admin-audit-events').innerHTML = model.auditEvents.length ? model.auditEvents.map(auditMarkup).join('') : emptyMarkup(translate('admin.empty.audit', 'No audit events yet.'));
    page.querySelector('#admin-adjustment-form').hidden = !isAdmin();
    renderLedger();
  }

  function renderLedger() {
    const target = document.getElementById('admin-ledger');
    if (!target) return;
    target.innerHTML = model.ledger.length ? model.ledger.map(entry => `<div class="admin-row"><div><strong>${escapeHtml(entry.operationType || translate('admin.credits.ledger', 'ledger'))}</strong><small>${escapeHtml(entry.reasonCode || translate('admin.common.noReason', 'No reason'))} - ${escapeHtml(formatDate(entry.createdAt))}</small></div><strong>${Number(entry.availableDelta || 0) > 0 ? '+' : ''}${escapeHtml(entry.availableDelta ?? entry.amountCredits ?? 0)}</strong></div>`).join('') : emptyMarkup(translate('admin.empty.ledger', 'No ledger entries for this user.'));
  }

  function overviewMarkup(overview) {
    if (!overview) return emptyMarkup(translate('admin.empty.summary', 'No summary available.'));
    return [
      [translate('admin.overview.activeUsers', 'Active users'), overview.users?.active ?? 0],
      [translate('admin.overview.generationJobs', 'Generation jobs'), overview.generationJobs?.totalApprox ?? 0],
      [translate('admin.overview.communityPosts', 'Community posts'), overview.communityPosts?.totalApprox ?? 0],
      [translate('admin.overview.auditEvents', 'Audit events'), overview.auditEvents?.totalApprox ?? 0]
    ].map(([label, value]) => `<div class="admin-stat"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function postMarkup(post) {
    const actionable = ['published', 'active', 'reported'].includes(post.status) && canAccess();
    return `<div class="admin-row"><div><strong>${escapeHtml(post.title || post.id)}</strong><small>${escapeHtml(post.ownerUsername || post.ownerUserId)} - ${escapeHtml(post.status)} - ${escapeHtml(post.visibility)}</small></div>${actionable ? `<div class="admin-row-actions"><button type="button" data-admin-action="hide" data-post-id="${escapeHtml(post.id)}">${escapeHtml(translate('admin.posts.hide', 'Hide'))}</button><button type="button" data-admin-action="remove" data-post-id="${escapeHtml(post.id)}">${escapeHtml(translate('admin.posts.remove', 'Remove'))}</button></div>` : ''}</div>`;
  }

  function userMarkup(user) {
    const credits = user.credits?.availableCredits ?? 0;
    return `<div class="admin-row"><div><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.username)} - ${escapeHtml(user.role)} - ${escapeHtml(user.status)}</small></div><strong>${escapeHtml(credits)} cr</strong></div>`;
  }

  function generationMarkup(job) {
    return `<div class="admin-row"><div><strong>${escapeHtml(job.id || job.jobId || translate('admin.generations.generation', 'generation'))}</strong><small>${escapeHtml(job.username || job.ownerUsername || translate('admin.common.unknown', 'unknown'))} - ${escapeHtml(job.status || 'completed')}</small></div><small>${escapeHtml(formatDate(job.createdAt || job.timestamp))}</small></div>`;
  }

  function auditMarkup(event) {
    return `<div class="admin-row"><div><strong>${escapeHtml(event.action)}</strong><small>${escapeHtml(event.actorUserId)} &rarr; ${escapeHtml(event.targetType)}:${escapeHtml(event.targetId)}${event.reason ? ` - ${escapeHtml(event.reason)}` : ''}</small></div><small>${escapeHtml(formatDate(event.createdAt))}</small></div>`;
  }
  const emptyMarkup = message => `<div class="admin-row"><small>${escapeHtml(message)}</small></div>`;

  async function onClick(event) {
    const button = event.target.closest('[data-admin-action]');
    if (!button) return;
    const action = button.dataset.adminAction;
    if (action === 'refresh') return refresh();
    const postId = button.dataset.postId;
    if (!postId || !['hide', 'remove'].includes(action)) return;
    const reason = (await window.AppDialog.prompt(
      translate('admin.posts.reasonMessage', 'Enter the reason for this moderation action.'),
      {
        title: translate(action === 'hide' ? 'admin.posts.hideTitle' : 'admin.posts.removeTitle', action === 'hide' ? 'Hide community post' : 'Remove community post'),
        inputLabel: translate('admin.posts.reasonLabel', 'Reason'),
        placeholder: translate('admin.posts.reasonPlaceholder', 'Explain why this action is required'),
        confirmLabel: translate('common.action.confirm', 'Confirm'),
        cancelLabel: translate('common.action.cancel', 'Cancel'),
        required: true
      }
    ))?.trim();
    if (!reason) return;
    try {
      button.disabled = true;
      await window.ModelPromptForgeAdminApi.moderatePost(postId, action, reason);
      setStatus(translate('admin.status.moderated', 'Post updated and recorded in the audit log.'));
      await refresh();
    } catch (error) {
      setStatus(error.message || translate('admin.error.moderation', 'Moderation failed.'));
    } finally {
      button.disabled = false;
    }
  }

  async function onAdjustment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const reason = form.querySelector('#admin-adjustment-reason').value.trim();
    const deltaCredits = form.querySelector('#admin-adjustment-delta').value;
    if (!model.selectedUserId || !reason || !deltaCredits) return;
    try {
      await window.ModelPromptForgeAdminApi.adjustCredits(model.selectedUserId, deltaCredits, reason);
      form.reset();
      setStatus(translate('admin.status.creditAdjusted', 'Credit adjustment recorded in the ledger and audit log.'));
      await refresh();
    } catch (error) {
      setStatus(error.message || translate('admin.error.creditAdjustment', 'Credit adjustment failed.'));
    }
  }

  function setStatus(message) {
    const target = document.getElementById('admin-status');
    if (target) target.textContent = message;
  }

  window.addEventListener('modelpromptforge:actorchange', () => {
    if (active) model = { overview: null, users: [], generations: [], posts: [], auditEvents: [], ledger: [], selectedUserId: null };
  });
  window.addEventListener('modelpromptforge:languagechange', () => {
    const page = document.getElementById('admin-page');
    if (!active || !page) return;
    window.ModelPromptForgeI18n?.translateDom?.(page);
    if (canAccess() && model.overview) render();
  });
  window.ModelPromptForgeAdminPanel = { activate, refresh };
})();
