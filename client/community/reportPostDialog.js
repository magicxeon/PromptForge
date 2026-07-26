(() => {
  let busy = false;

  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  const REASONS = [
    'copyright_or_ownership',
    'inappropriate_content',
    'misleading_or_spam',
    'private_information',
    'wrong_category',
    'other'
  ];

  async function open(postId) {
    if (!postId || busy) return null;
    await window.ModelPromptForgeI18n?.loadNamespaces?.(['community']);
    const reason = await window.AppDialog.select(
      translate('community.report.chooseReason', 'Why are you reporting this post?'),
      {
        title: translate('community.report.title', 'Report post'),
        inputLabel: translate('community.report.reason', 'Reason'),
        confirmLabel: translate('community.report.continue', 'Continue'),
        cancelLabel: translate('common.action.cancel', 'Cancel'),
        options: REASONS.map(value => ({
          value,
          label: translate(`community.report.reason.${value}`, formatReason(value))
        }))
      }
    );
    if (!reason) return null;

    const details = await window.AppDialog.prompt(
      translate(
        'community.report.detailsHelp',
        'Add a short note for the moderation team. Do not include private information.'
      ),
      {
        title: translate('community.report.detailsTitle', 'Report details'),
        inputLabel: translate('community.report.details', 'Details'),
        confirmLabel: translate('community.report.submit', 'Submit report'),
        cancelLabel: translate('common.action.cancel', 'Cancel'),
        required: reason === 'other',
        placeholder: translate('community.report.detailsPlaceholder', 'Optional context'),
        value: ''
      }
    );
    if (details === null) return null;

    busy = true;
    try {
      const result = await window.ModelPromptForgeCommunityModerationApi.reportPost(postId, {
        reason,
        details
      });
      await window.AppDialog.alert(
        result.created
          ? translate('community.report.success', 'Thank you. Your report was submitted.')
          : translate('community.report.duplicate', 'You already submitted this report.'),
        { title: translate('community.report.received', 'Report received') }
      );
      return result;
    } catch (error) {
      await window.AppDialog.alert(
        error?.message || translate('community.report.failed', 'The report could not be submitted.'),
        { title: translate('community.report.failedTitle', 'Report failed') }
      );
      return null;
    } finally {
      busy = false;
    }
  }

  function formatReason(value) {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  window.ModelPromptForgeReportPostDialog = { open };
})();
