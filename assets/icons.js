/* Simple outline icons used across the assessment instead of emoji (24×24, stroke = currentColor). */
(function (root) {
  'use strict';
  const P = {
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    speak: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.5-4 3-6 6-6s5.5 2 6 6"/><path d="M16.5 6.5a3 3 0 0 1 0 4M19 4.5a6 6 0 0 1 0 8"/>',
    game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r=".8"/><circle cx="17.5" cy="13.8" r=".8"/>',
    cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M7 3h11a2 2 0 0 1 2 2v13"/><circle cx="9" cy="11.5" r="2"/><path d="m5.5 18 3-3 3 3"/>',
    board: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6"/>',
    motion: '<circle cx="15" cy="12" r="4.5"/><path d="M3 9h5M2 12h6M3 15h5"/>',
    eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    basket: '<path d="M3 10h18l-2 10H5z"/><path d="M7 10l4-6M17 10l-4-6M9 14v3M12 14v3M15 14v3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4a1.5 1.5 0 0 1 3 0v6m0-.5V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.5 7-2.5 0-4-1-5.5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.5L8 14"/>'
  };
  root.VBIcon = (name, cls = '') => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  root.VBIcon.names = Object.keys(P);
})(window);
