module.exports = {
  cut: cutBuffer,
  copy: copyBuffer,
  paste: pasteBuffer
};

// copy the buffer to our clipboard, without removing the original section from buffer.
function copyBuffer(context, clipboard, buffer) {
  clipboard.buffer.getChannelData(0).set(
    buffer.getChannelData(0).subarray(clipboard.start, clipboard.end));
}

// cut the buffer portion to our clipboard, sets empty space in place of the portion
// in the source buffer.
function cutBuffer(context, clipboard, buffer) {
  var start = clipboard.start;
  var end = clipboard.start;

  clipboard.buffer = context.createBuffer(1, end - start, 44100);
  clipboard.buffer.getChannelData(0).set(buffer.getChannelData(0).subarray(start, end));

  var nuOldBuffer = context.createBuffer(2, buffer.length, buffer.sampleRate);
  var emptyBuf = context.createBuffer(2, end - start, buffer.sampleRate);
  nuOldBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(0, start))
  nuOldBuffer.getChannelData(0).set(emptyBuf.getChannelData(0), start);
  nuOldBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(end, buffer.length), end);
  buffer = nuOldBuffer;
}

// insert our clipboard at a specific point in buffer.
function pasteBuffer(context, clipboard, buffer, at) {
  var start = clipboard.start;
  var end = clipboard.end;

  // create replacement buffer with enough space for cliboard part
  var nuPastedBuffer = context.createBuffer(2, buffer.length + (end - start), buffer.sampleRate);
  // if our clip start point is not at '0' then we need to set the original
  // chunk, up to the clip start point
  if (at > 0) {
    nuPastedBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(0, at));
  }
  // add the clip data
  nuPastedBuffer.getChannelData(0).set(clipboard.getChannelData(0), at);

  // if our clip end point is not at the end of the original buffer then
  // we need to add remaining data from the original buffer;
  if (!end >= buffer.length) {
    nuPastedBuffer.getChannelData(0).set(buffer.getChannelData(0), (at + (end - start)));
  }

  buffer = nuPastedBuffer;
}

// function callEachChannel(buf, func) {
//   var numChannels = buf.numberOfChannels();
//   for (var i=0; i < numChannels; i++) {
//     func(buf.getChannelData(i));
//   }
// }
