module.exports = function (totalSec, ms) {
  var minutes = parseInt( totalSec / 60 ) % 60;
  var seconds = totalSec % 60;

  if (ms) {
    return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds.toFixed(2) : seconds.toFixed(2))).replace('.', ':');
  } else {
    return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" +  parseInt(seconds) : parseInt(seconds)));
  }
}