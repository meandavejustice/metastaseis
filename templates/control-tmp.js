var h = require('hyperscript');

module.exports = function(data) {
  return h('div.control',
           h('header', {"data-tip-content": data.title, "data-has-tip": "right"},
             h('p', data.title)),
           h('ul.actions',
             h('li.activate.active', {"data-tip-content": "activate", "data-has-tip": "bottom"}),
             h('li.edit.active', {"data-tip-content": "edit", "data-has-tip": "bottom"}),
             h('li.mute', {"data-tip-content": "mute", "data-has-tip": "bottom"}),
             h('li.export', {"data-tip-content": "export", "data-has-tip": "bottom"}),
             h('li.collapse', {"data-tip-content": "collapse", "data-has-tip": "bottom"}),
             h('li.remove', {"data-tip-content": "remove", "data-has-tip": "bottom"})),

           h('article.info',
             h('div.volume',
               h('span.volume-bar'),
               h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50", "style": "display: hidden;"})),
             h('p', "Current Time: ",
               h('i.cur', "00:00:00")),
             h('p', "Duration: ",
               h('i.dur', "00:00:00")),
             h('p', "Remaining: ",
               h('i.rem', "00:00:00"))));
}