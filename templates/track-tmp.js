var h = require('hyperscript');
var controlTmp = require('./control-tmp');

module.exports = function() {
  return h('div.track-space',
           controlTmp(),
           h('div.track.active',
             h('p',
               "drag file 2 edit"),
             h('div.play-cursor'),
             h('canvas.wave', { 'width': '1200', 'height': '300'}),
             h('div.wave-progress',
               h('canvas', {'width': '1200', 'height': '300'}))));
}