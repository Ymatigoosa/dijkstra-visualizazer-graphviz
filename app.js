var Graph = require('./graph');
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

/*var g = new Graph('a b 2 b c 3');
var images = g.visualizeDijkstra('a');
g.eventEmitter.on('visualizeDijkstraReady',function(images){
  console.log(JSON.stringify(images.length));
  console.log(JSON.stringify(images[0]));
  //console.log(new Buffer(images[0]).toString('base64'));
});*/

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req,res) {
  res.sendfile( __dirname + '/public/index.html');
});

app.get('/ajax', function(req,res) {
  //res.sendfile( __dirname + '/public/index.html');
  var graph_str = req.query.graphStr;
  var start_node_name = req.query.startNodeName;
  //console.log(req.body);
  try {
    var g = new Graph(graph_str);
    g.visualizeDijkstra(start_node_name);
    g.eventEmitter.once('visualizeDijkstraReady',function(images) {
      //console.log(JSON.stringify({images : images}));
      res.json({images : images});
      console.log('sended '+images.length+' images');
    });
  } catch(e) {
    console.log(e);
    res.json({error : e})
  }
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('\"Алгоритм Дейкстры поиска оптимальных марштутов на графе\"\nСервер запущен.\nОткройте в браузере следующий адрес 127.0.0.1:' + app.get('port'));
});
