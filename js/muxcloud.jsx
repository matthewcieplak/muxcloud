var sc_config;
if (window.location.hostname == 'muxcloud.matthewcieplak.com') { //production
  sc_config = {
    client_id : 'bbf0fa468c641edba19d061ba901d60b',
    redirect_uri:  'http://muxcloud.matthewcieplak.com/callback.html'
  }
} else { //development
  sc_config = {
    client_id : '504016c0974cb1ea877d69bf52256027',
    redirect_uri : 'http://muxcloud.com/~matthew/muxcloud/callback.html'
  }
}


SC.initialize({
  client_id: sc_config.client_id,
  redirect_uri:  sc_config.redirect_uri,
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

  disconnect : function(){
    this.render();
  },

  getToken : function(){
    localStorage.setItem('sc_oauth_token', SC.accessToken());
    this.componentDidMount()
  },

  // getUser : function(){
  //   SC.get('/me', this.gotUser);
  // },

  // gotUser : function(json){
  //   if (json.kind == 'user') {
  //     localStorage.setItem('sc_user_id', json.id);
  //   }
  // },

  componentDidMount : function(){
    if (SC.accessToken()) {
      $('#connect').hide();
      App.menu.loadStream();
    } 
    // if (!localStorage.getItem('sc_user_id')) {
    //   this.getUser();
    // }
  }
});

var MenuComponent = React.createClass({
  getInitialState : function(){
    return { 
      selectedTab    : 'Stream',
      configVisible  : false,
      hideReposts    : localStorage.getItem('hideReposts') == 'true',
      hideMixes      : localStorage.getItem('hideMixes') == 'true',
      hideRemixes    : localStorage.getItem('hideRemixes') == 'true',
      showReload     : false
    };
  },

  render : function(){
    return <div>
    <h2><a onClick={this.itemClick} href="/stream" className={this.state.selectedTab == 'Stream' ? 'selected' : false}>Stream</a></h2>
    <h2><a onClick={this.itemClick} href="/likes" className={this.state.selectedTab == 'Likes' ? 'selected' : false}>Likes</a></h2>
    <h2><a onClick={this.itemClick} href="/me" className={this.state.selectedTab == 'Me' ? 'selected' : false}>Me</a></h2>
    <h2 id="toggleConfig"><a href="#" onClick={this.toggleConfig}><span className="icon-cogs"></span></a></h2>

    <div id="config" className={this.state.configVisible ? '' : 'hidden'}>
      <h3>Options</h3>
      <ul className="clear opts">
        <li data-name="hideReposts" onClick={this.updateConfig}><span className={this.state.hideReposts ? 'icon-checkbox-checked' : 'icon-checkbox-unchecked'}></span> Hide reposts</li>
        <li data-name="hideRemixes" onClick={this.updateConfig}><span className={this.state.hideRemixes ? 'icon-checkbox-checked' : 'icon-checkbox-unchecked'}></span> Hide remixes</li>
        <li data-name="hideMixes"   onClick={this.updateConfig}><span className={this.state.hideMixes   ? 'icon-checkbox-checked' : 'icon-checkbox-unchecked'}></span> Hide uploads &gt; 20min</li>
      </ul>
      <p><a href="#" id="disconnect_button" onClick={this.disconnect}><img src="img/btn-disconnect-l.png" /></a> </p>
      <p className={this.state.showReload ? '' : 'hidden'}><a href="#" className="saveButton" onClick={this.loadStream}>Save</a></p>
    </div>
    </div>
  },

  updateConfig : function(event){
    var opt = { showReload : true };
    var name = $(event.currentTarget).data('name')
    opt[name] = !this.state[name];
    this.setState(opt, this.render);
    localStorage.setItem(name, opt[name]);
  },

  toggleConfig : function(event){
    this.setState({ configVisible : !this.state.configVisible })
    this.render();
  },
  
  itemClick: function(e){
    if (e && e.target) {
      this.setState({selectedTab : e.target.innerText}, this.loadStream);
    }

    return false;
  },

  loadStream : function(){
    this.setState({ configVisible : false }, this.saveConfig)
    //$('#connect').hide();
    $('#stream').hide();
    $('#loading').show();

    if (this.state.selectedTab == 'Stream') {
      var url = this.state.hideReposts ? '/me/activities/tracks/affiliated' : '/me/activities';
      SC.get(url+'?limit=50', this.renderStream);
    } else if (this.state.selectedTab == 'Likes') {
      SC.get('/me/favorites?limit=50', this.renderStream);
    } else if (this.state.selectedTab == 'Me') {
      SC.get('/me/tracks?limit=50', this.renderStream);
    }
    return false;
  },

  disconnect : function(){
    localStorage.removeItem('sc_oauth_token');
    localStorage.removeItem('sc_user_id');
    SC.access_token = null;
    $('#stream').hide();
    $('#connect').show();
  },

  renderStream : function(json){
    $('#loading').hide();
    $('#stream').show();
    if (App.stream) {
      React.unmountComponentAtNode(document.getElementById('stream'));
    }
    App.stream = <StreamComponent json={json}/>
    React.render(App.stream, document.getElementById('stream'));
  },

  componentDidMount : function(){
    this.render();
  }
    
})









/////////////////////////////
////////// STREAM ///////////
/////////////////////////////

var StreamComponent = React.createClass({
  getInitialState : function(){
    return { 
      loading        : false,
      playingTrackId : null,
      tracks         : this.filterTracks(this.props.json),
      next_href      : this.props.json.next_href
    };
  },

  render : function(){
    return <div>
      {this.state.tracks.map(function(item, i){
        if (item) {
          var playing = (item.id == this.state.playingTrackId);
          return (
            <TrackComponent ref={'track'+item.id} className="track" playing={playing} key={i} {...item} onTrackPlay={this.onTrackPlay} onFinish={this.onFinish} />
          );
        } else {
          return false;
        }
      }, this)}
      <div>
        <a href="#" onClick={this.loadMore} className={this.state.loading ? 'hidden' : 'loadMore'}>Load More</a>
      </div>
    </div>
  },

  filterTracks : function(json) {
    var trax = json.collection ? json.collection : json;

    var tracks = [];
    var minutes_max = 20;
    for (var i =0; i<trax.length; i++){
      //accept different list formats for stream/likes/etc 
      var track = null;
      track = trax[i].origin ? trax[i].origin : trax[i];
      if (!track || !track.user) { continue; }
      if (App.menu.state.hideReposts && json.collection && trax[i].type !=  'track') { continue; }
      //if (!App.menu.state.hideReposts && json.collection && !(trax[i].type == 'track' || trax[i].type == 'track-repost')) { continue; }
      if (App.menu.state.hideMixes   && track.duration > minutes_max * 1000 * 60) { continue; }
      if (App.menu.state.hideRemixes && track.title.match(/remix/i)) { continue; }

      
      if (trax[i].type == 'track-repost') {
        track.repost = true;
        track.reposted_by = json.collection[i].user;
      }

      tracks.push(track);
    }

    return tracks;
  },

  componentDidMount : function(){
    var img = $('#stream img:first')[0];
    if (img) {
      this.renderGradient({target : img})
    }
    this.bindScroll();
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

  bindScroll : function(){
    var self = this;
    $(window).bind('scroll', function () {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !this.state.loading) {
        // you're at the bottom of the page
        this.loadMore();
      }
    }.bind(this));
  },

  loadMore : function(event){
    $('#loading').show();
    this.setState({ loading : true });
    SC.get(this.state.next_href, this.loadTracks);
    return false;
  },

  loadTracks : function(json){
    this.setState({
      next_href : json.next_href,
      loading   : false,
      tracks    : this.state.tracks.concat(this.filterTracks(json))
    });
  }

});






/////////////////////////////
////////// TRACK ///////////
/////////////////////////////

var TrackComponent = React.createClass({
  getInitialState: function() {
    return {
      playing: this.props.playing, 
      user_favorite : this.props.user_favorite,
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
        <img width="50" height="50" src={this.props.artwork_url ? this.props.artwork_url : this.props.user.avatar_url} className="artwork" crossOrigin="anonymous"/>
        <div className="playpause">
          <a href="#" onClick={this.onPlayClick} className="play" title="Play"><span className="icon-play2"></span></a>
          <a href="#" onClick={this.onPauseClick} className="pause" title="Pause"><span className="icon-pause2"></span></a>
        </div>
      </div>

      <div className="title">
        <a href="#" onClick={this.onLikeClick} className={this.state.user_favorite ? 'like-button active' : 'like-button'}>
          <span className="icon-heart"></span>
        </a>
        <span className={this.props.repost ? 'icon-loop' : ''}></span>

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
          <span className="duration">{Utils.msToTime(this.props.duration)}</span>
          <span className="timestamp">{Utils.msToTime(this.state.position)}</span>
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

  onLikeClick : function(){
    if (this.state.user_favorite) {
      SC.delete('/me/favorites/'+this.props.id, function(json){ 
        debugger; 
      });
    } else {
      SC.put('/me/favorites/'+this.props.id, function(json){ 
        debugger; 
      });
    }

    this.setState({ user_favorite : !this.state.user_favorite });
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
