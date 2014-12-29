var http = require("http");
var st = require("st");
var config = require('./config.json');
var Router = require("routes-router");
var formidable = require('formidable');
var nodemailer = require('nodemailer');
var util = require('util');

// mail transporter obj
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: config.user,
    pass: config.password
  }
});

var app = Router()
var port = 8000;

var staticHandler = st({
  path: __dirname + '/public',
  index: 'index.html',
  cache: false
});

app.addRoute("/feedback", feedback);
app.addRoute("/upload", upload);

app.addRoute("*", function(req, res) {
  staticHandler(req, res);
})

var server = http.createServer(app);
server.listen(port);

console.log("Server listening on port: ", port);

function feedback(req, res) {
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/upload" enctype="multipart/form-data" method="post" style="width: 600px; margin: 80px auto;">'+
      '<h2 style="text-align: center;color: #868686;">Feedback</h2>'+
      '<input type="text" placeholder="who are you?" name="who" style="width: 100%;height: 50px;font-size: 20px;padding: 10px; margin-bottom: 5px;"><br>'+
      '<input type="text" placeholder="what should I name this?" name="title" style="width: 100%;height: 50px;font-size: 20px;padding: 10px; margin-bottom: 5px;"><br>'+
      '<textarea type="text" placeholder="anything else?" name="other" style="width: 100%;height: 200px;font-size: 20px;padding: 10px; margin-bottom: 5px;"></textarea><br>'+
      '<input type="submit" value="Send">'+
      '</form>'
  );
}

function upload(req, res) {
  if (req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields) {
      sendMail(fields);
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('thank you for your feedback! \n\n');
      res.end(util.inspect({fields: fields}));
    });

    return;
  }
}

function sendMail(fields) {
  var msg = "Who: " + fields['who'] + '\n' +
      "Title: " + fields['title'] + '\n' +
      "other: " + fields['other'];

  var mailOptions = {
    from: 'Wave Editor ✔ <dat.boi.dave@idonevenknow.com>',
    to: config.user,
    subject: 'wave editor feedback from '+ fields['who'] +'✔',
    text: msg
  };

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      console.log(error);
    }else{
      console.log('Message sent: ' + info.response);
    }
  });
}