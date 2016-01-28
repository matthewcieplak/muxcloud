SC.initialize({
  client_id: 'bbf0fa468c641edba19d061ba901d60b',
  redirect_uri: 'http://muxcloud.com/~matthew/muxcloud/callback.html',
  //oauth_token: localStorage.getItem('sc_oauth_token') //v3.0.0?
  access_token: localStorage.getItem('sc_oauth_token')
});

colorThief = new ColorThief();



//////////////////////////////
////////// CONNECT ///////////
//////////////////////////////

var ConnectComponent = React.createClass({
  render : function(){
    return <a href="#" id="connect_button" onClick={this.connect}><img src="img/btn-connect-l.png" /></a>
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
    SC.get('/me/activities?limit=50', this.renderStream);
  },

  renderStream : function(json){
    var stream = <StreamComponent json={json} />
    React.render(stream, document.getElementById('stream'));
  }
});









/////////////////////////////
////////// STREAM ///////////
/////////////////////////////

var StreamComponent = React.createClass({
  getInitialState : function(){
    return { 
      playingTrackId : null,
      tracks         : this.filterTracks(this.props.json)
    };
  },

  render : function(){
    return <div>
      {this.state.tracks.map(function(item, i){
        var playing = (item.id == this.state.playingTrackId);
        return (
          <TrackComponent ref={'track'+item.id} className="track" playing={playing} key={i} {...item} onTrackPlay={this.onTrackPlay} onFinish={this.onFinish} />
        );
      }, this)}
    </div>
  },

  filterTracks : function(json) {
    var tracks = [];
    for (var i =0; i<json.collection.length; i++){
      if (json.collection[i].type ==  'track') {
        tracks.push(json.collection[i].origin);
      }
    }
    return tracks;
  },

  componentDidMount : function(){
    var img = $('#stream img:first')[0];
    this.renderGradient({target : img})
  },

  // takes an onload event from image, but can be spoofed if already loaded
  renderGradient : function(event){
    var image = event.target;
    var canvas = $('#background_gradient')[0];
    var ctx = canvas.getContext('2d');
    var grd = ctx.createLinearGradient(0.000, 40, 100, 20);
    var palette = colorThief.getPalette(image, 3);
    
    if (!palette) {
      image.onload = this.renderGradient;
      return false;
    }
    for(var i = 0; i < palette.length; i++ ){
      var color = palette[i];
      var offset = (i / 3.0);
      grd.addColorStop(offset, 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');
    }

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
    return true;
  },

  onTrackPlay : function(trackId){
    if (this.state.playingTrackId != trackId) {
      //pause currently playing track
      if (this.state.playingTrackId) {
        var prevTrack = this.refs['track'+this.state.playingTrackId]; 
        prevTrack.onPauseClick();
      }

      //update current status
      this.setState({ playingTrackId : trackId });

      //update gradient
      var playingTrack = this.refs['track'+trackId]; 
      var img = $(playingTrack.getDOMNode()).find('img')[0];
      this.renderGradient({ target : img });

      //this.render
    }
  },

  onFinish : function(trackId){
    var track = this.refs['track'+trackId];
    var nextDiv = $(track.getDOMNode()).next();
    if (nextDiv.length > 0) {
      var nextTrackId = nextDiv.data('track-id')
      var nextTrack = this.refs['track'+nextTrackId];
      if (nextTrack) nextTrack.onPlayClick();
    } else {
      // load more tracks then play
      // this.loadMore();
      //
      // if (newTracks.length > 0) {
      //   this.onFinish(trackId)
      // }
    }
  },
});






/////////////////////////////
////////// TRACK ///////////
/////////////////////////////

var TrackComponent = React.createClass({
  getInitialState: function() {
    return {
      playing: this.props.playing, 
      position: 0,
      finished : false
    };
  },

  render : function(){
    var progressStyle = {
      width: (this.state.position * 100 / this.props.duration) + '%'
    }

    
    return <div className={this.props.className + ' ' + (this.state.playing ? 'playing' : '')} data-track-id={this.props.id}>
      <div className="cover">
        <span className="icon-zoom"></span>
        <img width="50" height="50" src={this.props.artwork_url} className="artwork" crossOrigin="anonymous"/>
        <div className="playpause">
          <a href="#" onClick={this.onPlayClick} className="play" title="Play"><span className="icon-play2"></span></a>
          <a href="#" onClick={this.onPauseClick} className="pause" title="Pause"><span className="icon-pause2"></span></a>
        </div>
      </div>

      <div className="title">
        <a href={this.props.permalink_url} target="_blank" className="name">
          {this.props.title}
          <span className="external">&rarr;</span>
        </a>
      </div>
      <div className="artist">
        <span className="icon-avatar"></span>
        <a href={this.props.user.permalink_url} target="_blank">
          {this.props.user.username}
          <span className="external">&rarr;</span>
        </a>
      </div>

      <div className="progress" onClick={this.onSeek}>
        <div className="progress_bar" style={progressStyle}>
          <span className="timestamp">{Utils.msToTime(this.state.position)}</span>
          <span className="duration">{Utils.msToTime(this.props.duration)}</span>
        </div>
      </div>
    </div>
  },

  createSound : function(){
    this.smSound = soundManager.createSound({
      url      : this.props.stream_url + '?client_id='+SC.options.client_id,
      onfinish : this.onFinish,
      whileplaying : this.whilePlaying
    });
  },

  onPlayClick : function(){
    if (!this.smSound) {
      this.createSound();
      this.smSound.play();
    } else if (this.state.finished) {
      //this.smSound.play();
      this.smSound.play();
    } else {
      this.smSound.resume();
    }

    this.setState({ playing : true });
    //this.render();

    //call into <Stream> parent
    this.props.onTrackPlay(this.props.id);
    return false;
  },

  onPauseClick : function(){
    this.setState({ playing : false });
    return false;
  },

  whilePlaying  : function() {
    this.setState({ position : this.smSound.position });
    this.render();
  },

  onFinish : function(){
    this.setState({ playing : false, finished : true, position : 0 });
    this.render();

    //call into <Stream> parent
    this.props.onFinish(this.props.id);
  },

  componentDidUpdate : function(){
    if (this.smSound) {
      
      if (this.state.playing) {
        this.smSound.resume();
      } else {
        this.smSound.pause();
      }
    }
    this.a = 1;
  },

  onSeek : function(event) {
    var clientRect = event.currentTarget.getClientRects()[0];
    var seek_percentage = (event.clientX - clientRect.left) / (clientRect.right - clientRect.left);
    var seek_position = seek_percentage * this.props.duration;
    this.smSound.setPosition(seek_position);
    
    if (!this.state.playing) {
      this.onPlayClick();
    }
    return false;
  }
});




/////////////////////////////
////////// UTILS ////////////
/////////////////////////////

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
