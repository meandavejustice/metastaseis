module.exports = function (totalSec) {
  var minutes = parseInt( totalSec / 60 ) % 60;
  var seconds = totalSec % 60;

  return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds.toFixed(2) : seconds.toFixed(2))).replace('.', ':');
}