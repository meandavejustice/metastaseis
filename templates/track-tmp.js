var h = require('hyperscript');

module.exports = function() {
  return h('div.track.active',
           h('p',
             "drag file 2 edit"),
           h('div.play-cursor'),
           h('div.selection'),
           h('div.wave.selectable',
             h('canvas', {'height': '300', 'draggable': 'false'})),
           h('div.wave-progress.selectable',
             h('canvas', {'height': '300', 'draggable': 'false'})));
}
