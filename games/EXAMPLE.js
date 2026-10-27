/* Copy as games/<id>.js, then add metadata to catalog.js and translations to i18n.js. */
(function () {
  'use strict';
  window.AsobiGameRunners ||= Object.create(null);
  window.AsobiGameRunners['example-id'] = function (root) {
    let points = 0;
    // DOM IDs should be unique to your game. Use user text through textContent.
    root.innerHTML = `<div class="game-wrap"><h2>🎮</h2><button type="button" id="example-tap"></button><p id="example-points" role="status">0</p></div>`;
    const button = root.querySelector('#example-tap');
    const output = root.querySelector('#example-points');
    const onTap = () => { output.textContent = ++points; saveRecord('example-id', points); };
    button.addEventListener('click', onTap);
    const cleanup = () => button.removeEventListener('click', onTap);
    // Add the new game's own translated keys to i18n.js before publishing.
    cleanup.retranslate = () => { button.textContent = tr('start'); };
    cleanup.retranslate();
    return cleanup;
  };
})();
