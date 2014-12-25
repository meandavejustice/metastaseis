var h = require('hyperscript');
var controlTmp = require('./control-tmp');

module.exports = function(data) {
  return h('div.track-space',
           controlTmp(data),
           h('div.track.active',
             h('p',
               "drag file 2 edit"),
             h('div.play-cursor'),
             h('div.selection'),
             h('div.wave.selectable',
               h('canvas', {'height': '300'})),
             h('div.wave-progress.selectable',
               h('canvas', {'height': '300'}))));
}
