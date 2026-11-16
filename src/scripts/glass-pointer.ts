/**
 * Moves the specular highlight on glass surfaces toward the pointer.
 * One delegated listener, rAF-throttled, fine pointers only.
 */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let target: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  let queued = false;

  const flush = () => {
    queued = false;
    if (!target) return;
    const r = target.getBoundingClientRect();
    target.style.setProperty('--mx', `${x - r.left}px`);
    target.style.setProperty('--my', `${y - r.top}px`);
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.glass, .glass-strong');
      if (!el) return;
      target = el;
      x = e.clientX;
      y = e.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    },
    { passive: true },
  );
}
