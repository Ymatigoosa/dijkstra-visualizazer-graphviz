var graphviz = require('graphviz');
var events = require('events');
var spawn  = require('child_process').spawn;
var exec  = require('child_process').exec;
var execFile  = require('child_process').execFile;
var path = require('path');

/* Helping functions */
function isset(o) {
    return typeof(o) !== 'undefined';
}
function issting(o) {
    return typeof(o) === 'string';
}
function isarray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}

/**
 * Node class
 */
Node = function(name) {
  if(!issting(name)) {
    throw 'bad Node(name) arguments';
  }
  this.name = name;
  this.state = Node.UNUSED;
  this.weight = Node.INFINITE;
  this.path = new Array();
};

Node.CURRENT = 0x1;
Node.USED = 0x2;
Node.UNUSED = 0x4;
Node.INFINITE = 0x7FFFFFFF;

Node.prototype = {
  pathToString : function() {
    var result = '';
    if(this.path.length>0) {
      result += this.path[0].start.name;
      for(var i=0;i<this.path.length;++i) {
        result += '->'+this.path[i].end.name;
      }
    }
    return result/*==='' ? ' ' : result*/;
  }
}
/**
 * Edge class
 */
Edge = function(start, end, weight, graph) {
  if(!issting(start) || !issting(end) || !issting(weight)) {
    throw 'bad Edge(start, end, weight) arguments';
  }
  this.start = graph.nodes[start];
  this.end = graph.nodes[end];
  this.weight = parseInt(weight);
  this.state = Edge.CLEAN;
};

Edge.CURRENT = 0x1;
Edge.CLEAN = 0x2;

/**
 * Graph class
 */
Graph = function(string) {
	this.setupFromString(string);
  return this;
};

Graph.prototype = {
  eventEmitter : new events.EventEmitter(),
  addEdge : function(start, end, weight) {
    var bad_input = !issting(start) || !issting(end) || !issting(weight)
                    || start==='' || end==='' || weight==='';
    if(bad_input) {
      throw 'bad addEdge(start, end, weight) arguments';
    }
    if( !isset(this.nodes[start]) ) {
      this.nodes[start] = new Node(start);
      ++this._countOfNodes;
    }
    if( !isset(this.nodes[end]) ) {
      this.nodes[end] = new Node(end);
      ++this._countOfNodes;
    }
    this.adjacencyMatrix[start] = this.adjacencyMatrix[start] || {};
    this.adjacencyMatrix[start][end] = new Edge(start, end, weight, this);
  },

  setupFromString : function(string) {
    this._clean();
    if(string) {
      var nodes_and_weights_list = string.split(/\W+/);
      var i=0;
      var start,end,weight;
      while (i<nodes_and_weights_list.length) {
        start = nodes_and_weights_list[i];
        i++;
        end = nodes_and_weights_list[i];
        i++;
        weight = nodes_and_weights_list[i];
        this.addEdge(start, end, weight);
        i++;
      }
    }
    //console.log(JSON.stringify(this),'\n');
    return this;
  },

  countOfNodes : function() {
    return this._countOfNodes;
  },

  visualizeDijkstra : function(start) {
    if( this._findLoops() ) {
      throw 'cannot use Dijkstra for graph with loops';
    }
    if( !issting(start) ) {
      throw 'bad Graph.dijkstra(start) arguments\n'+typeof(start)+'\n'+start;
    }
    this.nodes[start].weight = 0;
    var dot_scripts = [];
    var current_node;
    var next_node = null;
    var current_edge;
    var used_count = 0;
    var node_edited;

    // corrent variables
    while (used_count<this.countOfNodes()) {

      // finding next node
      next_node = null;
      for(var name in this.nodes) {
        current_node = this.nodes[name];
        if (current_node.state!==Node.USED &&
            (next_node===null || current_node.weight < next_node.weight)) {
          next_node = current_node;
        }
      }
      current_node = next_node;
      current_node.state = Node.CURRENT;
      if(next_node.weight!==Node.INFINITE) {
        dot_scripts.push(this._getDotScript('Выбрана новая вершина \\"'+current_node.name+'\\"'));

        // correct node weights
        for(var end in this.adjacencyMatrix[current_node.name]) {
          current_edge = this.adjacencyMatrix[current_node.name][end];
          current_edge.state = Edge.CURRENT;
          if( current_edge.weight < 0 ) {
            throw 'cannot use Dijkstra for graph with negative edge weight (for node '
                    + current_edge.start.name
                    + '->'
                    + current_edge.end.name
                    +' weight='
                    + current_edge.weight
                    + ')';
          }
          node_edited = false;
          if(current_edge.end.weight > current_edge.start.weight + current_edge.weight) {
            node_edited = true;
            current_edge.end.weight = current_edge.start.weight + current_edge.weight;
            current_edge.end.path = current_edge.start.path.slice(0);
            current_edge.end.path.push(current_edge);
          }
          dot_scripts.push(this._getDotScript('Вершина \\"'+current_edge.end.name+'\\" '+(node_edited?'изменена':'не изменена')));
          current_edge.state = Edge.CLEAN;
        }
      }
      // ending iteration
      current_node.state = Node.USED;
      used_count++;
      dot_scripts.push(this._getDotScript('Вершина \\"'+current_node.name+'\\" помечена как использоанная'));
    } // end of while

    // visualize final graph
    this._cleanGraphState();
    dot_scripts.push(this._getDotScript('Итоговый граф'));
    this._visualizeGraphs(dot_scripts);
  },

  _cleanGraphState : function() {
    for(var name in this.nodes) {
      this.nodes[name].state = Node.UNUSED;
    }
  },

  _clean : function() {
    this.adjacencyMatrix = {};
    this.nodes = {};
    this._countOfNodes = 0;
    this._imgNumber = 0;
  },

  _getDotScript : function(description) {
    var g = graphviz.digraph('G');
    g.set('label', description);
    //g.setGraphVizPath( '/usr/bin' );
    var tlabel, tcolor;
    //set up nodes
    for( var name in this.nodes ) {
      tlabel = name + '\\n' + (this.nodes[name].weight===Node.INFINITE?'inf.':this.nodes[name].weight) + '\\n' + this.nodes[name].pathToString();
      if( this.nodes[name].state===Node.CURRENT ) {
        tcolor = 'orange';
      } else if ( this.nodes[name].state===Node.USED ) {
        tcolor = 'red';
      } else {
        tcolor = 'black';
      }
      g.addNode( name, {'color' : tcolor, 'fontcolor' : tcolor, 'label' : tlabel} );
    }
    //set up edges
    for( var start in this.adjacencyMatrix ) {
      for( var end in this.adjacencyMatrix[start] ) {
        tlabel = this.adjacencyMatrix[start][end].weight + '';
        if( this.adjacencyMatrix[start][end].state===Edge.CURRENT ) {
          tcolor = 'orange';
        } else {
          tcolor = 'black';
        }
        g.addEdge( start, end, {'color' : tcolor, 'fontcolor' : tcolor, 'label' : tlabel} );
      }
    }
    return g.to_dot();
  },

  _visualizeGraphs : function(dot_scripts) {
    var images_array = [];

    for(var i=0;i<dot_scripts.length;++i) {
      this._visualizeGraph(images_array,i,dot_scripts[i],dot_scripts.length);
    }
  },

  _visualizeGraph : function(array,index,dot_script,full_length) {
    var self = this;
    //generate image
    var rendered = null;
    var out = '';
    var err = '';

    var graphvizproc = spawn(path.resolve('./Graphviz2.30/bin/dot.exe'), ['-Tpng'], {detached: true});
    graphvizproc.stdout.on('data', function(data) {
      if( rendered == null ) {
        rendered = data;
      } else {
        __b = new Buffer( rendered.length + data.length )
        rendered.copy(__b, 0, 0)
        data.copy(__b, rendered.length, 0)
        rendered = __b
      }
    });
    graphvizproc.stderr.on('data', function(data) {
      err += data;
    });
    graphvizproc.stdout.once('end', function() {
        array[index] = 'data:image/png;base64,'+rendered.toString('base64') ;
        if( array.length===full_length ) {
          var need_emit = true;
          for(var k=0;need_emit && k<array.length;++k) {
            if(typeof(array[k])==='undefined' ) {
              need_emit = false;
            }
          }
          if(need_emit) {
            self.eventEmitter.emit('visualizeDijkstraReady', array);
          }
        }
    });
    graphvizproc.once('exit', function(code) {
      if(code !== 0) {
        console.log('WARNING: Graphviz exited with code '+code+'\nstderr: '+err);
      }
    });
    graphvizproc.stdin.write(dot_script);
    graphvizproc.stdin.end();
  },

  _findLoops : function() {
    for( var name in this.nodes ) {
      if( isset(this.adjacencyMatrix[name]) && isset(this.adjacencyMatrix[name][name]) ) {
        console.log(typeof(this.adjacencyMatrix[name][name]));
        return true;
      }
    }
    return false;
  }
};
module.exports = Graph;