var h = require('hyperscript');
var controlTmp = require('./control-tmp');

module.exports = function() {
  return h('div.track-space',
           controlTmp(),
           h('div.track.active',
             h('p',
               "drag file 2 edit"),
             h('div.play-cursor'),
             h('div.selection'),
             h('canvas.wave.selectable', { 'width': '1200', 'height': '300'}),
             h('div.wave-progress.selectable',
               h('canvas', {'width': '1200', 'height': '300'}))));
}