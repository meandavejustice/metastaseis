var frequency = 44100;

module.exports = function (context, start, end, frequency) {
  return {
    start: start,
    end: end,
    buffer: context.createBuffer(1, end - start, frequency)
  }
}