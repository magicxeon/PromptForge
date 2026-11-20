/** Keep native scroll geometry stable; only the thumb becomes transparent. */
export function observeIdleScrollbars(node: HTMLElement) {
  let timer: ReturnType<typeof setTimeout>;
  let pressed = false;
  let keyboardFocus = false;
  node.classList.add("idle-scrollbars");
  const wake = () => {
    node.dataset.scrollActive = "true";
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!pressed && !keyboardFocus) node.dataset.scrollActive = "false";
    }, 1500);
  };
  const down = () => {
    pressed = true;
    wake();
  };
  const up = () => {
    pressed = false;
    wake();
  };
  const key = () => {
    keyboardFocus = true;
    wake();
  };
  const focus = () => {
    keyboardFocus = node.matches(":focus-visible");
    wake();
  };
  const blur = () => {
    keyboardFocus = false;
    pressed = false;
    wake();
  };
  const events = {
    pointermove: wake,
    scroll: wake,
    wheel: wake,
    pointerdown: down,
    keydown: key,
    focus,
    blur,
  };
  Object.entries(events).forEach(([name, callback]) =>
    node.addEventListener(name, callback),
  );
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("blur", blur);
  wake();
  return () => {
    clearTimeout(timer);
    Object.entries(events).forEach(([name, callback]) =>
      node.removeEventListener(name, callback),
    );
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    window.removeEventListener("blur", blur);
  };
}
