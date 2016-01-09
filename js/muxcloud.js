//id     : 'bbf0fa468c641edba19d061ba901d60b'
//var client_secret : '105ab626242b2949f4621d23a4bd7f76'
colorThief = new ColorThief();

var Muxcloud = function(){
  return {
    init : function(){
      this.$el = $('body');
      _.bindAll(this, 'connect', 'getToken', 'loadStream', 'renderTracks');

      SC.initialize({
        client_id: 'bbf0fa468c641edba19d061ba901d60b',
        redirect_uri: 'http://muxcloud.com/~matthew/muxcloud/callback.html',
        //oauth_token: localStorage.getItem('sc_oauth_token') //v3.0.0?
        access_token: localStorage.getItem('sc_oauth_token')
      });
      if (SC.accessToken()) {
        this.loadStream();
      } else {
        $('#connect').show();
      }
      this.bindEvents();
    },

    bindEvents : function(){
      $('#connect_button').on('click', this.connect);
    },

    connect : function(){
      SC.connect(this.getToken);
    },

    getToken : function(){
      localStorage.setItem('sc_oauth_token', SC.accessToken());
      this.loadStream();
    },

    loadStream : function(){
      $('#connect').hide();
      $('#stream').show();
      SC.get('/me/activities?limit=50', this.renderTracks);
    },

    renderTracks : function(json){
      //var collection = json.collection;
      var tracks = _.where(json.collection, {type : 'track'});
      var img;
      for (var i = 0; i < tracks.length; i++){
        var item = tracks[i];
        $('#stream').append(this.trackTemplate(item.origin));
        if (i == 0) {
          img = $('#stream').find('img:last')[0];
        }
        //console.log(item);
      }
      if (img) {
        this.setGradient(img);
        img.onload = _.bind(function(){ this.setGradient(img); }, this);
      }
    },

    trackTemplate : function(track){
      return `<div class="track" data-track-id="${track.id}">
        <div class="cover">
          <a href="${track.permalink_url}" target="_blank"><span class="i-zoom"></span>
            <img width="50" height="50" src="${track.artwork_url}" class="artwork" crossorigin="anonymous"/></a>
          </a>
          <div class="playpause">
            <a href="#" class="play" title="Play"><span class="i-play"></span></a>
            <a href="#" class="play" title="Pause"><span class="i-pause"></span></a>
          </div>
        </div>

        <div class="title">
          <span class="name">${track.title}</span>
        </div>
        <div class="artist">
          <span class="i-avatar"></span>${track.user.username}
        </div>

        <span class="duration">${Utils.msToTime(track.duration)}</span>
      </div>`;
    },

    setGradient : function(image){
      var canvas = $('#background_gradient')[0];
      var ctx = canvas.getContext('2d');
      var grd = ctx.createLinearGradient(0.000, 40, 100, 20);

      var palette = colorThief.getPalette(image, 3);
      
      _.each(palette, function(color, i) {
        var offset = (i / 3.0);
        grd.addColorStop(offset, 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');
      })

      // Fill with gradient
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 100, 100);

      //fade in canvas
      //canvas.style.opacity = 0;
      canvas.style.opacity = 0.6;
      // if (oldCanvas) {
      //   oldCanvas.style.opacity = 0.0;
      //   setTimeout(function(){
      //     oldCanvas.remove();
      //   }, 2500);
      // }

      $(canvas).removeClass('unrendered');
    }
  };
};

var Utils = {
  msToTime : function(duration) {
      var milliseconds = parseInt((duration%1000)/100)
          , seconds = parseInt((duration/1000)%60)
          , minutes = parseInt((duration/(1000*60))%60)
          , hours = parseInt((duration/(1000*60*60))%24);

      var t = [];
      if (hours > 0){
        t.push((hours < 10) ? "0" + hours : hours);
      }

      t.push((minutes < 10) ? "0" + minutes : minutes);
      t.push((seconds < 10) ? "0" + seconds : seconds);

      return t.join(':');
  }
}


$(document).ready(function(){
  muxcloud = new Muxcloud();
  muxcloud.init();
});
