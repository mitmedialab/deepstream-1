var ytScriptLoaded = false;

var ytApiReady = new ReactiveVar(false);

window.mainPlayer = {
  play: function(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.playVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('play');
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  pause: function(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.pauseVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('pause');
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  stop: function(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.stopVideo();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('stop');
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  mute: function(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.mute();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('volume', 0);
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  },
  unMute: function(){
    switch(this.activeStreamSource){
      case 'youtube':
        this._youTubePlayer.unMute();
        break;
      case 'ustream':
        this._ustreamPlayer.callMethod('volume', 100); // TO-DO return volume to wherever they were before mute
        break;
      default:
        throw new Meteor.Error('main player has no active stream source')
    }
  }
};

Template.watch.onCreated(function () {
  if(!ytScriptLoaded){
    $.getScript('https://www.youtube.com/iframe_api', function () {});
    ytScriptLoaded = true;
  }

  this.mainStreamElementId = Random.id(8);

  var that = this;

  this.settingsMenuOpen = new ReactiveVar();

  window.onYouTubeIframeAPIReady = function() {
    ytApiReady.set(true);
  };

  // confirm stream exists
  this.autorun(function(){
    if (FlowRouter.subsReady() && !Deepstreams.findOne({shortId: that.data.shortId()}, {reactive: false})){
      return FlowLayout.render("stream_not_found");
    }
  });

  // confirm user is curator if on curate page
  this.autorun(function(){ // TODO confirm user is curator
    if(FlowRouter.subsReady() && that.data.onCuratePage()){
      var stream = Deepstreams.findOne({shortId: that.data.shortId()}, {reactive: false});

      if ((user = Meteor.user())) { // if there is a user
        if (!stream || user._id !== stream.curatorId) { // if they don't own the stream take them to stream not found
          return FlowLayout.render("stream_not_found");
        }
        var accessPriority = Meteor.user().accessPriority; // TODO update for Deepstream
        if (!accessPriority || accessPriority > window.createAccessLevel){
          FlowRouter.go(stream.watchPath());
          notifyInfo("Creating and editing streams is temporarily disabled, possibly because things blew up (in a good way). Sorry about that! We'll have everything back up as soon as we can. Until then, why not check out some of the other great content authors in the community have written?")
        }
      } else if (Meteor.loggingIn()) {
        return
      } else {
        Session.set('signingIn', true); // if there is no user, take them to the signin page
        Session.set('signingInFrom', setSigningInFrom());
        FlowRouter.go(stream.watchPath());
      }
    }
  });

  this.autorun(function(){
    Session.set("streamShortId", that.data.shortId());
  });

  this.autorun(function() { // when change media data type, leave search mode, unless doing streams, then always search
    if (Session.get("curateMode")) {
      var mediaDataType = Session.get("mediaDataType");
      if(mediaDataType && mediaDataType === 'stream'){
        Session.set("searchingMedia", true);
      } else {
        Session.set("searchingMedia", false);
      }
    }
  });

  var defaultContextType = 'image';

  // march through creation steps, or setup most recent context type to display when arrive on page if past curation
  this.autorun(function(){
    if(FlowRouter.subsReady()){
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {reactive: false});
      var reactiveDeepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {fields: {creationStep: 1}});

      if(that.data.onCuratePage()){
        if (_.contains(['find_stream'], reactiveDeepstream.creationStep)){
          Session.set("mediaDataType", 'stream');
          Session.set("searchingMedia", true);
          return
        } else if (reactiveDeepstream.creationStep === 'add_cards') {
          Session.set("mediaDataType", defaultContextType);
          Session.set("searchingMedia", true);
          return
        }
      }

      // else
      var mostRecentContext =  deepstream.mostRecentContext();
      if (mostRecentContext){
        Session.set("mediaDataType", mostRecentContext.type);
      } else {
        Session.set("mediaDataType", defaultContextType);
      }
      Session.set("searchingMedia", false);
    }
  });


  this.activeStream = new ReactiveVar();
  this.userControlledActiveStreamId = new ReactiveVar();

  // switch between streams
  this.autorun(function(){ // TO-DO Performance, don't rerun on every stream switch, only get fields needed
    if(FlowRouter.subsReady()) {
      var userControlledActiveStreamId = that.userControlledActiveStreamId.get();
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()});

      if(!Session.get('curateMode') && userControlledActiveStreamId && deepstream.userStreamSwitchAllowed()){
        that.activeStream.set(deepstream.getStream(userControlledActiveStreamId));
      } else{
        that.activeStream.set(deepstream.activeStream());
      }
    }
  });

});

Template.watch.onRendered(function(){
  var that = this;

  this.mainPlayerYTApiActivated = false;
  this.mainPlayerUSApiActivated = false;

  // activate jsAPIs for main stream
  this.autorun(function(){
    if(ytApiReady.get() && FlowRouter.subsReady()){
      var activeStream = that.activeStream.get();
      if (activeStream && activeStream.source === 'youtube'){
        if ( !this.mainPlayerYTApiActivated ){
          console.log('activate the yt api!!')
          this.mainPlayerYTApiActivated = true;
          Meteor.setTimeout(function(){ // TODO this is a hack. Why does it need to wait???
            var youTubePlayer = new YT.Player(that.mainStreamElementId, {
              events: {
                'onReady': onMainPlayerReady,
                'onStateChange': onMainPlayerStateChange
              }
            });
            mainPlayer._youTubePlayer = youTubePlayer;
          }, 1000);
        }
        mainPlayer.activeStreamSource = 'youtube';

      } else if (activeStream && activeStream.source === 'ustream'){
        if ( !this.mainPlayerUSApiActivated ){
          console.log('activate the ustream api!!')
          this.mainPlayerUSApiActivated = true;
          Meteor.setTimeout(function(){ // TODO this is a hack. Why does it need to wait???
            var ustreamPlayer = UstreamEmbed(that.mainStreamElementId);
            mainPlayer._ustreamPlayer = ustreamPlayer;
          }, 1000);
        }
        Meteor.setTimeout(onMainPlayerReady, 4000); // TODO, this is a hack. Is there any way to know that the player is ready?
        mainPlayer.activeStreamSource = 'ustream';
      }
    }
  });

  // focus on title when title/description overlay appears
  this.autorun(function(){
    if(FlowRouter.subsReady()) {
      var deepstream = Deepstreams.findOne({shortId: that.data.shortId()}, {fields: {creationStep: 1}});
      if (deepstream.creationStep === 'title_description') {
        Meteor.setTimeout(function() { // TODO this is a hack.
          that.$('input[name=title]')[0].focus();
        }, 100);
      }
    }
  });

  onMainPlayerReady = function(event){
    mainPlayer.play();
  };


  onMainPlayerStateChange = function(event){
    console.log('PlayerStateChange')
    console.log(event)
  }
});


var titleMax = 60;
var descriptionMax = 270;

Template.watch.helpers({
  activeStream: function(){
    return Template.instance().activeStream.get();
  },
  active: function(){ // inside #each streams
    return this._id === Template.instance().activeStream.get()._id;
  },
  mainStreamElementId: function(){
    return Template.instance().mainStreamElementId;
  },
  onCuratePage: function(){
    return Template.instance().data.onCuratePage ? Template.instance().data.onCuratePage() : null;
  },
  thisDeepstream: function() {
    if (FlowRouter.subsReady()) {
      return Deepstreams.findOne({shortId: Template.instance().data.shortId()});
    }
  },
  streamUrl: function(){
    var activeStream = Template.instance().activeStream.get();
    if(activeStream){
      return activeStream.url()
    }
  },
  showTitleDescriptionEditOverlay: function(){
    return this.creationStep == 'title_description';
  },
  showTutorial: function(){
    return _.contains(['find_stream', 'add_cards', 'go_on_air'], this.creationStep)
  },
  showRightSection: function(){
    var mediaDataType = Session.get('mediaDataType');
    return !soloOverlayContextModeActive() && (mediaDataType && (Session.get("curateMode") || this.hasContextOfType(mediaDataType)));
  },
  expandMainSection: function(){
    var mediaDataType = Session.get('mediaDataType');
    return !(mediaDataType && (Session.get("curateMode") || this.hasContextOfType(mediaDataType)));
  },
  showStreamSearch: function(){
    return Session.get("curateMode") && Session.get('mediaDataType') === 'stream'; // always search on stream
  },
  showChat: function(){
    return Session.get('mediaDataType') === 'chat';
  },
  showContextSearch: function(){
    var mediaDataType = Session.get('mediaDataType');
    return Session.get("curateMode") && (Session.get("searchingMedia") || (mediaDataType && this.contextOfType(mediaDataType).length === 0)) && mediaDataType && !_.contains(['stream', 'chat'], mediaDataType) ;
  },
  soloOverlayContextMode: function(){
    return soloOverlayContextModeActive();
  },
  PiP: function(){
    return soloOverlayContextModeActive();
  },
  streamTitleElement: function(){
    if (Session.get('curateMode')) {
      // this is contenteditable in curate mode
      return '<div class="stream-title notranslate" placeholder="Title" contenteditable="true" dir="auto">' + _.escape(this.title) + '</div>';
    } else {
      return '<div class="stream-title">' + _.escape(this.title) + '</div>';
    }
  },
  streamDescriptionElement: function(){
    if (Session.get('curateMode')) {
      // this is contenteditable in curate mode
      return '<div class="stream-description notranslate" placeholder="Enter a description" contenteditable="true" dir="auto">' + _.escape(this.description) + '</div>';
    } else {
      return '<div class="stream-description">' + _.escape(this.description) + '</div>';
    }
  },
  showStreamSwitcher: function(){
    return Session.get('curateMode') || this.userStreamSwitchAllowed();
  },
  settingsMenuOpen: function(){
    return Template.instance().settingsMenuOpen.get();
  }
});

var basicErrorHandler = function(err){
  if(err){
    notifyError(err);
    throw(err);
  }
};

Template.watch.events({
  'click .set-main-stream': function(e, t){
    if(Session.get('curateMode')){
      Meteor.call('setActiveStream', t.data.shortId(), this._id ,basicErrorHandler);
    } else {
      t.userControlledActiveStreamId.set(this._id);
    }
  },
  'click .preview': function(e,t){
    t.userControlledActiveStreamId.set(null); // so that stream selection doesn't switch
    Session.set('curateMode', false);
  },
  'click .return-to-curate': function(){
    Session.set('curateMode', true);
  },
  'click .publish': function(e, t){
    if (this.creationStep === 'go_on_air') {
      Meteor.call('proceedFromGoOnAirStep', t.data.shortId(), basicErrorHandler);
    } else if (!this.creationStep) {
      Meteor.call('publishStream', t.data.shortId(), function(err){
        if(err){
          basicErrorHandler(err);
        } else {
          notifySuccess("Congratulations! Your Deep Stream is now on air!");
        }
      });
    } // TODO handle if in the middle of creation (or just disable button or something)

  },
  'click .unpublish': function(e, t){
    Meteor.call('unpublishStream', t.data.shortId(), basicErrorHandler);
  },
  'click .show-stream-search': function(e, t){
    if(this.creationStep && this.creationStep !== 'go_on_air'){
      Meteor.call('goToFindStreamStep', t.data.shortId(), basicErrorHandler);
    } else {
      Session.set('searchingMedia', true);
      Session.set('mediaDataType', 'stream');
    }
  },
  'blur .stream-title[contenteditable]': function(e,template) {
    streamTitle = $.trim(template.$('div.stream-title').text());
    Session.set('saveState', 'saving');
    return Meteor.call('updateStreamTitle', template.data.shortId(), streamTitle, basicErrorHandler)
  },
  'paste [contenteditable]': window.plainTextPaste,
  'drop [contenteditable]': function(e){
    e.preventDefault();
    return false;
  },
  'blur .stream-description[contenteditable]': function(e,template) {
    streamDescription = $.trim(template.$('div.stream-description').text());
    Session.set('saveState', 'saving');
    return Meteor.call('updateStreamDescription', template.data.shortId(), streamDescription, basicErrorHandler)
  },
  'click .allow-user-stream-switch': function(e,t){
    return Meteor.call('allowUserStreamSwitch', t.data.shortId(), basicErrorHandler)
  },
  'click .disallow-user-stream-switch': function(e,t){
    return Meteor.call('disallowUserStreamSwitch', t.data.shortId(), basicErrorHandler)
  },
  'click .set-current-context-as-default': function(e,t){
    notifyFeature('Default view settings: coming soon!');
  },
  'mouseenter .settings-button-and-menu': function(e, template){
    template.settingsMenuOpen.set(true);
  },
  'mouseleave .settings-button-and-menu': function(e, template){
    template.settingsMenuOpen.set(false);
  },
  'click .microphone': function(e,t){
    notifyFeature('Live audio broadcast: coming soon!');
  },
  'click .webcam': function(e,t){
    notifyFeature('Live webcam broadcast: coming soon!');
  },
  'click .email-share-button': function(e,t){
    notifyFeature('Success!! Email share: coming soon!');
  },
  'click .twitter-share-button': function(e,t){
    notifyFeature('Success!! Twitter share: coming soon!');
  },
  'click .facebook-share-button': function(e,t){
    notifyFeature('Success!! Facebook share: coming soon!');
  },
  'click .favorite-button': function(e,t){
    notifyFeature('Success!! Favoriting streams: coming soon!');
  },
  'click .PiP-overlay': function(e,t){
    clearCurrentContext();
  }
});

Template.context_browser.helpers({
  mediaTypeForDisplay: function(){
    return pluralizeMediaType(Session.get('mediaDataType')).toUpperCase();
  },
  contextOfCurrentType: function(){
    return this.contextOfType(Session.get('mediaDataType'));
  },
  soloSidebarContextMode: function(){
    var currentContext = getCurrentContext();
    return currentContext && currentContext.soloModeLocation === 'sidebar';
  }
});

Template.context_browser.events({
  'click .close': function(){
    Session.set('mediaDataType', null);
  },
  'click .add-new-context': function(){
    Session.set('searchingMedia', true);
  },
  'click .delete-context': function(e, t){
    var that = this;

    t.$('[data-context-id=' + that._id + ']').fadeOut(500, function() {
      Meteor.call('removeContextFromStream', Session.get("streamShortId"), that._id, function(err){
        // TODO SOMETHING
      });
    });
  },
  'click .context-section .clickable': function(e, t){

    if ($(e.target).is('textarea')) { // don't go to big browser when its time to edit context
      return
    }
    if(this.soloModeLocation){
      setCurrentContext(this);
    }
  },
  'click .switch-to-list-mode': function(){
    setCurrentContext(null);
  }
});


Template.overlay_context_browser.helpers({
  mediaTypeForDisplay: function(){
    return _s.capitalize(Session.get('mediaDataType'));
  },
  totalNum: function(){
    return this.contextOfType(Session.get('mediaDataType')).length;
  },
  currentNum: function(){
    var cBlocks = this.contextOfType(Session.get('mediaDataType'));
    return _.indexOf(cBlocks, _.findWhere(cBlocks, {_id: getCurrentContext()._id})) + 1;
  },
  disableRightButton: function(){
    var currentContext = getCurrentContext();
    if (currentContext){
      return !this.nextContext(getCurrentContext()._id);
    } else {
      return true
    }
  },
  disableLeftButton: function(){
    var currentContext = getCurrentContext();
    if (currentContext){
      return !this.previousContext(getCurrentContext()._id);
    } else {
      return true
    }
  }
});


Template.overlay_context_browser.onRendered(function(){
  document.body.style.overflow = 'hidden';
  $(window).scrollTop(0);

  if (Session.get('mediaDataType') === 'video') {
    Meteor.setTimeout(function () { // mute stream if playing a video
      mainPlayer.mute();
    }, 1000); // TODO Hack, if mute main video before youtube video loads, will play as muted. Need to mute as soon as loaded
  }

});

Template.overlay_context_browser.onDestroyed(function(){
  document.body.style.overflow = 'auto';
  if(Session.get('mediaDataType') === 'video'){
    mainPlayer.unMute(); // TODO - only unmute if was unmuted before created
  }
});

Template.overlay_context_browser.events({
  'click .close': function(){
    clearCurrentContext();
  },
  'click .right': function(){
    setCurrentContext(Session.get('mediaDataType'), this.nextContext(getCurrentContext()._id));
  },
  'click .left': function(){
    setCurrentContext(Session.get('mediaDataType'), this.previousContext(getCurrentContext()._id));
  }
});

Template.solo_context_section.helpers(horizontalBlockHelpers);
Template.list_item_context_section.helpers(horizontalBlockHelpers);

// TODO remove and have an about section
Template.banner_buttons.events({
  'click .about-deepstream': function(){
    notifyFeature('Coming soon!')
  }
});

// TODO remove this template entirely and get this over to the create templates
Template.exit_search_button.helpers({
  showExitSearchButton: function(){
    return this.hasContextOfType(Session.get("mediaDataType"));
  }
});

Template.exit_search_button.events({
  'click .exit-search-button': function(){
    return Session.set('searchingMedia', false);
  }
});


Template.title_description_overlay.onCreated(function(){
  this.titleLength = new ReactiveVar(this.title ? this.title.length : 0);
  this.descriptionLength = new ReactiveVar(this.description ? this.description.length : 0);
});

Template.title_description_overlay.helpers({
  titleLength: function(){
    return  Template.instance().titleLength.get();
  },
  titleMax: function(){
    return titleMax;
  },
  descriptionLength: function(){
    return Template.instance().descriptionLength.get();
  },
  descriptionMax: function(){
    return descriptionMax;
  }
});

Template.title_description_overlay.events({
  'keypress .set-title': function(e, t){
    if (e.keyCode === 13){
      e.preventDefault();
      $('.set-description').focus();
    }
  },
  'keypress .set-description': function(e, t){
    if (e.keyCode === 13){
      e.preventDefault();
      $('#publish-with-title-description').submit();
    }
  },
  'keyup .set-title': function(e, t){
    t.titleLength.set($(e.currentTarget).val().length);
  },
  'keyup .set-description': function(e, t){
    t.descriptionLength.set($(e.currentTarget).val().length);
  },
  'submit #publish-with-title-description': function(e, t){
    e.preventDefault();
    var title = t.$('.set-title').val();
    var description = t.$('.set-description').val();
    Meteor.call('publishStream', this.shortId, title, description, function(err){
      if(err){
        basicErrorHandler(err);
      } else {
        notifySuccess("Congratulations! Your Deep Stream is now on air!");
      }
    });
  }
});

Template.creation_tutorial.helpers({
  onFindStreamStep: function(){
    return this.creationStep == 'find_stream';
  },
  onAddCardsStep: function(){
    return this.creationStep == 'add_cards';
  },
  onGoOnAirStep: function(){
    return this.creationStep == 'go_on_air';
  }
});

Template.creation_tutorial.events({
  'click .find-stream .text': function(e, t){
    Meteor.call('goToFindStreamStep', this.shortId, basicErrorHandler);
  },
  'click .add-cards .text': function(e, t){
    Meteor.call('goToAddCardsStep', this.shortId, basicErrorHandler);
  },
  'click .go-on-air .text': function(e, t){
    Meteor.call('goToPublishStreamStep', this.shortId, basicErrorHandler);
  },
  'click .find-stream button': function(e, t){
    Meteor.call('skipFindStreamStep', this.shortId, basicErrorHandler);
  },
  'click .add-cards button': function(e, t){
    Meteor.call('skipAddCardsStep', this.shortId, basicErrorHandler);
  },
  'click .title-description-overlay .close': function(e, t){
    Meteor.call('goBackFromTitleDescriptionStep', this.shortId, basicErrorHandler);
  }
});
