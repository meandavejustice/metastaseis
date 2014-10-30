/* global ID3, FileAPIReader */
var util = require('util');
var id3Container;

module.exports = getId3;

function getId3 (file, container) {
  var url = file.urn || file.name;
  id3Container = container;

  ID3.loadTags(url, function() {
    showTags(url);
  }, {
    tags: ['title','artist','album','picture'],
  dataReader: FileAPIReader(file)
});

}


function showTags (url) {
  var tags = ID3.getAllTags(url);

  id3Container.querySelector('.title').textContent = tags.title || "Nope";
  id3Container.querySelector('.artist').textContent = tags.artist || "Nope";
  id3Container.querySelector('.album').textContent = tags.album || "Nope";

  handleImage(tags.picture);

  id3Container.getElementById('info').style.display = 'block';
}

function handleImage(image) {
  if (image) {
    var base64String = "";

    for (var i = 0; i < image.data.length; i++) {
      base64String += String.fromCharCode(image.data[i]);
    }

    var b64 = util.format('data:%s;base64,%s',
                          image.format,
                          window.btoa(base64String));
    id3Container.querySelector('.picture').setAttribute('src', b64);
  } else {
    id3Container.querySelector('.picture').style.display = "none";
  }
}