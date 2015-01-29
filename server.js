var http = require("http");
var st = require("st");
var Router = require("routes-router");

var app = Router()
var port = 8000;

var staticHandler = st({
  path: __dirname + '/public',
  index: 'index.html',
  cache: false
});

app.addRoute("*", function(req, res) {
  staticHandler(req, res);
})

var server = http.createServer(app);
server.listen(port);

console.log("Server listening on port: ", port);