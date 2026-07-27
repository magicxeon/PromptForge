(() => {
  const PREFIX = 'mpf_character_profile_state_v1';
  const actorId = () =>
    window.ModelPromptForgeActorContext?.getActiveMockUserId?.() || window.state?.userId || 'usr_demo';
  const key = () => `${PREFIX}:${actorId()}`;

  function read() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key()) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  function write(patch = {}) {
    const next = { ...read(), ...patch };
    sessionStorage.setItem(key(), JSON.stringify(next));
    return next;
  }

  function clearCastingPlan() {
    const next = read();
    delete next.castingPlan;
    sessionStorage.setItem(key(), JSON.stringify(next));
  }

  window.addEventListener('modelpromptforge:actorchange', () => {
    window.dispatchEvent(new CustomEvent('modelpromptforge:characterprofilestatechange'));
  });

  window.ModelPromptForgeCharacterProfileState = { read, write, clearCastingPlan };
})();
