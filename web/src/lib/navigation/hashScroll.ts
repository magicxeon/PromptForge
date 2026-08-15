export function scrollToHashTarget(
  hash: string,
  behavior: ScrollBehavior = 'smooth'
) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior, block: 'start' });
  return true;
}

export function scheduleHashTargetScroll(hash: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToHashTarget(hash);
    });
  });
}
