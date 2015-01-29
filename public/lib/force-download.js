module.exports = function(url, title) {
  var link = window.document.createElement('a');
  link.href = url;
  link.download = title || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
}