var h = require('hyperscript');

module.exports = function(data) {
  return h('div.control',
           h('header',
             h('p', data.title, {"contenteditable": "true"})),
           h('ul.actions',
             h('li.activate.active', {"title": "activate"}),
             h('li.edit.active', {"title": "edit"}),
             h('li.mute', {"title": "mute"}),
             h('li.export', {"title": "export"}),
             h('li.collapse', {"title": "collapse"}),
             h('li.remove', {"title": "remove"})),
           h('div.volume',
             h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50"})),
           h('article.info',
             h('p', "Current Time: ",
               h('i.cur', "00:00:00")),
             h('p', "Duration: ",
               h('i.dur', "00:00:00")),
             h('p', "Remaining: ",
               h('i.rem', "00:00:00"))));
  // h('br'),
  // h('span.upload', "upload to soundcloud"));
}

// module.exports = function(data) {
//   return h('div.control',
//            h('span.de', "deactivate"),
//            h('div.volume',
//              h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50"})),
//            h('span.mute', "mute"),
//            h('span.selecting', "hide selection"),
//            h('div.info',
//              h('p', "Title: ",
//                h('i.title', {'contentEditable': true}, data.title)),
//              h('article.info',
//                h('p', "Current Time: ",
//                  h('i.cur', "00:00:00")),
//                h('p', "Duration: ",
//                  h('i.dur', "00:00:00")),
//                h('p', "Remaining: ",
//                  h('i.rem', "00:00:00")))),
//            h('span.collapse', "collapse"),
//            h('span.remove', "remove"),
//            h('span.export', "export"));
//   // h('br'),
//   // h('span.upload', "upload to soundcloud"));
// }
