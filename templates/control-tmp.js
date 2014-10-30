var h = require('hyperscript');

module.exports = function() {
  return h('div.control',
           h('span.de', "deactivate"),
           h('div.volume',
             h('input', {"type": 'range', "min": '0', "max": '11', "step": "1", "value": "5"})),
           h('span.mute', "mute"),
           h('div.info',
             h('p', "Title: ",
               h('i.title', {'contentEditable': true}, "Track 1")),
             h('article.info',
               h('p', "Current Time: ",
                 h('i.cur', "00:00:00")),
               h('p', "Duration: ",
                 h('i.dur', "00:00:00")),
               h('p', "Remaining: ",
                 h('i.rem', "00:00:00")))),
           h('span.collapse', "collapse"));
}
