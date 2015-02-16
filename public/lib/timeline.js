// need to generate these points, like, way smarter
// need to be multiples of 5 but still representative of minutes
// need to adjust width of timelineEl based on this

var h = require('hyperscript');
var formatTime = require('./format-time');
var timelineEl = document.querySelector('.timeline');

function calculatePoints(duration) {
  return duration / 5;
}

function point(num) {
  return h('li',
           h('span', num));
}

function getPointLength() {
  return timelineEl.children.length
}

// fix formatTime to work with low numbers

function getPoints(cur, max) {
  if (cur < max) {
    cur = cur + 5;
    timelineEl.appendChild(point(formatTime(cur)));
    getPoints(cur, max);
  }
}

function update(duration, clean) {
  console.log('duration::', duration);
  var nuPointLength = calculatePoints(duration);

  if (clean) {
    timelineEl.innerHTML = '';
    getPoints(-5, duration);
    timelineEl.style.width = timelineEl.children.length * 100 + 'px';
  } else {
    if (nuPointLength < getPointLength()) return;
    var w = timelineEl.offsetWidth;
    timelineEl.innerHTML = '';
    getPoints(-5, duration);
    if (timelineEl.children.length * 100 > w) {
      timelineEl.style.width = timelineEl.children.length * 100 + 'px';
    }
  }
}

module.exports = {
  update: update
};