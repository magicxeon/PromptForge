/* Community Create-panel handoff into existing Studio modes. */
(() => {
  const modeByWorkflow = { headshot: 'headshot', character: 'character-sheet', scene: 'normal' };
  function launch(workflow) {
    if (workflow === 'playground') return window.ModelPromptForgeRouter?.navigate('/playground');
    const mode = modeByWorkflow[workflow] || 'normal';
    window.ModelPromptForgeRouter?.navigate('/studio');
    window.setTimeout(() => document.querySelector(`.mode-chip[data-mode="${mode}"]`)?.click(), 0);
  }
  window.ModelPromptForgeCommunityCreateLauncher = { launch };
})();
