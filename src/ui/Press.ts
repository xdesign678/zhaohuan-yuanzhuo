export function bindPress(element: HTMLElement, action: () => void): void {
  let lastTriggeredAt = 0;

  const run = (event: Event): void => {
    const now = Date.now();
    if (now - lastTriggeredAt < 360) {
      event.preventDefault();
      return;
    }

    lastTriggeredAt = now;
    event.preventDefault();
    action();
  };

  element.addEventListener('pointerup', run);
  element.addEventListener('touchend', run, { passive: false });
  element.addEventListener('click', run);
}
