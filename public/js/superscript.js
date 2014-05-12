m = (function () {
  var self = {

    init: function () {
    },

    prev_img: function (e) {
      e.preventDefault();
	  var current_img = $('#graph_holder .visible');
	  var prev_img;
	  if ( !$(current_img).is(':first-child') ) {
		$(current_img).removeClass('visible');
		$(current_img).addClass('hidden');
		prev_img = $(current_img).prev();
		$(prev_img).removeClass('hidden');
		$(prev_img).addClass('visible');
		$('#graph_next').removeClass('disabled');
		if( $(prev_img).is(':first-child') ) {
			$('#graph_prev').addClass('disabled');
		}
	  }
    },

    next_img: function (e) {
      e.preventDefault();
	  var current_img = $('#graph_holder .visible');
	  var next_img;
	  if ( !$(current_img).is(':last-child') ) {
		$(current_img).removeClass('visible');
		$(current_img).addClass('hidden');
		next_img = $(current_img).next();
		$(next_img).removeClass('hidden');
		$(next_img).addClass('visible');
		$('#graph_prev').removeClass('disabled');
		if( $(next_img).is(':last-child') ) {
			$('#graph_next').addClass('disabled');
		}
	  }
    },

    send: function (e) {
      e.preventDefault();
      var text = $('#minput').val();
      var req = {
        graphStr: $('#minput').val(),
        startNodeName: $('#startNode option:selected').val()
      };
      $.getJSON('/ajax',req,function(data){
        if(typeof(data.error)!=='undefined') {
          alert(data.error);
        } else {
          var html = '';
          for(var i=0;i<data.images.length;++i) {
            html += '<img src=\"'+data.images[i]+'\"'+(i!==data.images.length-1?' class=\"hidden\"':' class=\"visible\"')+' />';
          }
          $( '#graph_holder' ).html(html);
          $('#graph_next').addClass('disabled');
		  $('#graph_prev').removeClass('disabled');// 3 картинки генерируются за одну итерацию, поэтому случай когда приходит одна картинка исключен
        }
      });
    },

    refreshNodeList : function() {
      var string = $( '#minput' ).val();
      this.nodes = [];
      var nodes_and_weights_list = string.split(/\W+/);
      var i=0;
      while (i<nodes_and_weights_list.length) {
        if(i%3!==2 && nodes_and_weights_list[i]!=='' && this.nodes.indexOf(nodes_and_weights_list[i])===-1) {
          this.nodes.push(nodes_and_weights_list[i])
        }
        ++i;
      }
    },

    updateNodesList : function(e) {
      self.refreshNodeList();
      $( '#startNode' ).html('<option>'+self.nodes.join('</option><option>')+'</option>');
    }
  };
  return self;
})();

$(document).ready(function () {
  $('#graph_next').click(m.next_img);
  $('#graph_prev').click(m.prev_img);
  $('#send').click(m.send);
  $('#minput').keyup(m.updateNodesList).bind('cut paste',m.updateNodesList);
});