var throttledResize;

var windowSizeDep = new Tracker.Dependency();

Meteor.startup(function(){
  Tracker.autorun(function(){
    windowSizeDep.depend();

    var windowWidth = $(window).width();

    // Safari changes window size in a weird way that jquery doesn't register correctly when scroll up vs down
    Session.set("windowHeight", Meteor.Device.isPhone() && !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/) ? window.innerHeight : $(window).height());

    Session.set("windowWidth", windowWidth);

    if (Meteor.Device.isPhone()) {
      document.body.style.overflowX = "hidden";
      $('body').css('max-width', windowWidth);
    }
    if(windowWidth < 900) {
      Session.set('reducedRightView', true);
    } else {
      Session.set('reducedRightView', false);
    }
  });

  var windowResize = function() {
    windowSizeDep.changed();
  };

  throttledResize = _.throttle(windowResize, 100, {leading: false});

  $(window).resize(throttledResize);

  /* defunct - delete shortly
  var justReloaded = window.codeReloaded;
  Tracker.autorun(function(){
    if (Session.get('signingIn') && !justReloaded){
      setSigningInFrom();
      analytics.track('Opened sign-in overlay', {nonInteraction: 1});
    }
    justReloaded = false;
  })
  */
});

Meteor.startup(function(){
  var inIFrame = function(){
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  if (inIFrame()){
    activateEmbedMode();
  } else {
    deactivateFeaturedMode();
  }
});

//window.trackingInfoFromStory = function(story){
//  return _.chain(story)
//    .pick([
//      '_id',
//      'authorId',
//      'authorName',
//      'authorUsername',
//      'createdAt',
//      'editorsPick',
//      'editorsPickAt',
//      'firstPublishedAt',
//      'headerImageFormat',
//      'keywords',
//      'narrativeRightsReserved',
//      'publishedAt',
//      'savedAt',
//      'shortId',
//      'title'])
//    .extend(story.published ? {
//      'numberOfContextBlocks': story.contextBlockIds.length,
//      'numberOfVerticalSections': story.verticalSections.length,
//      'favorites': story.favoritedTotal,
//      'numberofKeywords': story.keywords.length,
//      'titleLength': story.title.length
//    } : {})
//    .extend(story.countContextTypes ? story.countContextTypes() : {})
//    .value();
//};


//Template.story_header.onRendered(function() {
//  var range, sel, titleDiv;
//  // add cursor to title section if empty
//  if (!this.data.title) {
//    if (!Session.get('read')) {
//      titleDiv = $(this)[0].find('.story-title');
//      sel = window.getSelection();
//      if (sel.rangeCount > 0) {
//        sel.removeAllRanges();
//      }
//      range = document.createRange();
//      range.selectNodeContents(titleDiv);
//      range.collapse();
//      return sel.addRange(range);
//    }
//  }
//});



editableTextCreatedBoilerplate = function() {
  this.editing = new ReactiveVar(false);
};


editableTextEventsBoilerplate = function(meteorMethod) {
  return {
    "blur .text-content.editable.annotation" (d, template) {
      var that = this;
      if (Session.get('curateMode')) {
        var textContent = template.$('textarea[name=content]').val();
        Session.set('saveState', 'saving');
        Meteor.call(meteorMethod, Session.get('streamShortId'),that._id, textContent, saveCallback);
      }
    },
    "mouseenter .text-content.editable.annotation" (d, template) {
      document.body.style.overflow = 'hidden';
    },
    "mouseleave .text-content.editable.annotation" (d, template) {
      document.body.style.overflow = 'auto';
    },
    "keypress .image-section .text-content.editable.annotation" (e, template) { // save on Enter
      var that = this;
      if (Session.get('curateMode') && e.which === 13 ) {
        e.preventDefault();
        var textContent = template.$('textarea[name=content]').val();
        Session.set('saveState', 'saving');
        Meteor.call(meteorMethod, that._id, textContent, saveCallback);
      }
    }
  }
};
editableVideoMarkerEventsBoilerplate = function(meteorMethod) {
  return {
    "blur .text-content.editable.video-marker" (d, template) {
      var that = this;
      if (Session.get('curateMode')) {
        var textContent = template.$('input[name=videoMarker]').val();
        var videoMarkerArray = textContent.split(':').reverse();
        var videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
        videoMarker = moment.duration(videoMarker, "seconds").format("h:mm:ss", {trim: false});
        template.$('input[name=videoMarker]').val(videoMarker);
        Session.set('saveState', 'saving');
        Meteor.call(meteorMethod, Session.get('streamShortId'),that._id, textContent.toString(), saveCallback);
      }
    },
    "mouseenter .text-content.editable.video-marker" (d, template) {
      document.body.style.overflow = 'hidden';
    },
    "mouseleave .text-content.editable.video-marker" (d, template) {
      document.body.style.overflow = 'auto';
    },
    "keypress .image-section .text-content.editable.video-marker" (e, template) { // save on Enter
      if (e.which === 13) {
        var that = this;
        if (Session.get('curateMode') && e.which === 13 ) {
          e.preventDefault();
          var textContent = template.$('input[name=videoMarker]').val();
          var videoMarkerArray = textContent.split(':').reverse();
          var videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
          videoMarker = moment.duration(videoMarker, "seconds").format("h:mm:ss", {trim: false});
          template.$('input[name=videoMarker]').val(videoMarker);
          Session.set('saveState', 'saving');
          Meteor.call(meteorMethod, that._id, textContent.toString(), saveCallback);
        }
      }
    }
  }
};

var imagePlaceholderHeight = function(){
  return this.heightAtGivenWidth(CONTEXT_WIDTH);
};

Template.preview_image_section.helpers({
  height: imagePlaceholderHeight,
  width: CONTEXT_WIDTH,
  usePlaceholder: imagePlaceholderHeight
});
Template.preview_image_section.helpers(horizontalBlockHelpers);
Template.preview_image_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.preview_image_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_image_section.onCreated(editableTextCreatedBoilerplate);
//Template.display_image_section.onCreated(editableTextDestroyedBoilerplate('editContextBlockAnnotation'));
Template.display_image_section.helpers(horizontalBlockHelpers);
Template.display_image_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_image_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_audio_section.helpers(horizontalBlockHelpers);
Template.display_audio_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_audio_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_video_section.helpers(horizontalBlockHelpers);
Template.display_video_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_video_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.preview_video_section.helpers({
  height () {
    return this.previewHeightAtGivenWidth(CONTEXT_WIDTH);
  },
  width: CONTEXT_WIDTH
});

Template.list_item_context_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.list_item_context_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));


Template.preview_video_section.helpers(horizontalBlockHelpers);
Template.preview_video_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.preview_video_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_twitter_section.helpers(horizontalBlockHelpers);
Template.display_twitter_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_twitter_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_map_section.helpers(horizontalBlockHelpers);
Template.display_map_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_map_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.preview_map_section.helpers({
  width: CONTEXT_WIDTH,
  height: 180
});
Template.preview_map_section.helpers(horizontalBlockHelpers);
Template.preview_map_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.preview_map_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.preview_news_section.helpers(horizontalBlockHelpers);
Template.display_news_section.helpers(horizontalBlockHelpers);
Template.display_news_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_news_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));

Template.display_link_section.helpers(horizontalBlockHelpers);
Template.display_link_section.events(editableTextEventsBoilerplate('editContextBlockAnnotation'));
Template.display_link_section.events(editableVideoMarkerEventsBoilerplate('editContextBlockVideoMarker'));
Template.display_link_section.events({
  'click a' (e, t) {
    var url = e.currentTarget.href;
    analytics.track('Click external link in link card', _.extend({
      label: url,
      url: url,
      targetClassName: e.target.className
    }, trackingInfoFromContext(this)))
  }
});

Template.display_text_section.onCreated(editableTextCreatedBoilerplate);
//Template.display_text_section.onDestroyed(editableTextDestroyedBoilerplate('editTextSection'));
Template.display_text_section.helpers(horizontalBlockHelpers);
Template.display_text_section.helpers({
  contentWithBreaks() {
    return this.content.replace(/\n/g, "<br>");
  }
});
Template.preview_text_section.helpers(horizontalBlockHelpers);
Template.preview_text_section.helpers({
  previewComment() {
    return this.content.replace(/\n/g, "<br>").substring(0,225);
  },
  shotenedComment() {
    return this.content.replace(/\n/g, "<br>").length > 225;
  }
});
Template.portrait_preview_text_section.helpers({
  contentWithBreaks() {
    return this.content.replace(/\n/g, "<br>");
  }
});
Template.homepage_preview_text_section.helpers(horizontalBlockHelpers);
Template.display_text_section.events(editableTextEventsBoilerplate('editTextSection'));

Template.display_poll_section.onCreated(editableTextCreatedBoilerplate);
//Template.display_text_section.onDestroyed(editableTextDestroyedBoilerplate('editTextSection'));
Template.display_poll_section.helpers(horizontalBlockHelpers);
Template.preview_poll_section.helpers(horizontalBlockHelpers);
Template.homepage_preview_poll_section.helpers(horizontalBlockHelpers);
Template.display_poll_section.events(editableTextEventsBoilerplate('editPollSection'));

// Start PieChart code 
var pieHelpers = {
  options: function(){
    return this.data;
  },
  totalVotes: function(){
    var totalVotes = 0;
    if(this.data){
      this.data.forEach(function(value, index, array){
        totalVotes += value.value;
      });
    }
    return totalVotes;
  },
  percentageVote: function(votes){
    var totalVotes = 0;
    if(this.data){
      this.data.forEach(function(value, index, array){
        totalVotes += value.value;
      });
    }
    if(totalVotes < 1){
      return '0';
    }
    
    var percent = Math.round((votes/totalVotes)*100)
    if(percent < 10){
      return percent + '%<span style="opacity:0">0</span>';
    }
    return percent + '%';
  },
  hasVoted: function(contextId){
    if(Session.get('voted' + contextId)){
      return Session.get('voted'+contextId); 
    } else {
      return document.cookie.match('voted'+contextId+'=');
    }
  }
};
var pieEvents = {
  'click .cast-vote-button': function(){
    // set session for update now, and cookie for persistance, delay to prevent click triggering context
    Session.set('mostRecentVoteId', this._id);
    Meteor.setTimeout(function(){
      var votedId = Session.get('mostRecentVoteId');
      document.cookie = "voted"+ votedId +"=true; expires=Fri, 31 Dec 9999 23:59:59 GMT";
      Meteor.call('voteInPoll', votedId, parseInt($('input[name=vote-' + votedId + ']:checked').val()), function(err, success){
          analytics.track('Viewer voted in poll', trackingInfoFromPage());
      });
    },100);
    
  }
};

Template.pieChart.helpers(pieHelpers);
Template.pieChart.events(pieEvents);
Template.pieChart_preview.helpers(pieHelpers);
Template.pieChart_preview.events(pieEvents);
Template.pieChart_display.helpers(pieHelpers);
Template.pieChart_display.events(pieEvents);

var chartContainerRendered = function(){
  //Width and height
  var w = 200;
  var h = 200;
  var outerRadius = w / 2;
  var innerRadius = 0;
  var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d)
    {
      return d.value;
    });
  //Easy colors accessible via a 10-step ordinal scale
  var color = d3.scale.category10();
  
  //access to contextId
  var contextId = this.data._id;
  
  //Create SVG element add the context block id to it -----------------------------------------
  var svg = d3.select("#pieChart-" + this.data._id)
    .attr("width", '80%')
    .attr("height", '80%')
    .attr('viewBox','0 0 '+Math.min(w,h) +' '+Math.min(w,h) )
    .attr('preserveAspectRatio','xMinYMin')
    .append("g")
    //.attr("transform", "translate(" + Math.min(w,h) / 2 + "," + Math.min(w,h) / 2 + ")");
  
  var key = function(d)
  {
    return d.data.name; //._id;
  };
  Tracker.autorun(function(){
    if(contextId){
      var modifier = {
        fields:
        {
          value: 1
        }
      };
      var query = {};
      query._id = contextId;
      var dataset = ContextBlocks.find(query, {data: 1}).fetch()[0];
      if(dataset){
        dataset = dataset.data; 
        var totalVotes = 0;
        dataset.forEach(function(value, index, array){
          totalVotes += value.value; 
        });
        var arcs = svg.selectAll("g.arc")
          .data(pie(dataset), key);
        var newGroups = arcs.enter()
          .append("g")
          .attr("class", "arc")
          .attr("transform", "translate(" + outerRadius + "," + outerRadius +
            ")");
        //Draw arc paths
        newGroups.append("path")
          .attr("fill", function(d, i)
          {
            return color(i);
          })
          .attr("d", arc);
        //Labels
        newGroups.append("text")
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .attr("text-anchor", "middle")
          .text(function(d)
          {
            if(totalVotes < 1){
              //don't annotate small values
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return percentage + '%';
          });
        arcs.transition()
          .select('path')
          .attrTween("d", function(d)
          {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t)
            {
              return arc(interpolate(t));
            };
          });
        arcs.transition()
          .select('text')
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .text(function(d)
          {
            if(totalVotes < 1){
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return '';//percentage + '%';
          });
        arcs.exit()
          .remove();
        //debugger;
      }
    }
  });
};
var chartDisplayContainerRendered = function(){
  //Width and height
  var w = 200;
  var h = 200;
  var outerRadius = w / 2;
  var innerRadius = 0;
  var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d)
    {
      return d.value;
    });
  //Easy colors accessible via a 10-step ordinal scale
  var color = d3.scale.category10();
  
  //access to contextId
  var contextId = this.data._id;
  
  //Create SVG element add the context block id to it -----------------------------------------
  var svg = d3.selectAll(".pieChart-display-" + this.data._id)
    .attr("width", '70%')
    .attr("height", '70%')
    .attr('viewBox','0 0 '+Math.min(w,h) +' '+Math.min(w,h) )
    .attr('preserveAspectRatio','xMinYMin')
    .append("g")
    //.attr("transform", "translate(" + Math.min(w,h) / 2 + "," + Math.min(w,h) / 2 + ")");
  
  var key = function(d)
  {
    return d.data.name; //._id;
  };
  Tracker.autorun(function(){
    if(contextId){
      var modifier = {
        fields:
        {
          value: 1
        }
      };
      var query = {};
      query._id = contextId;
      var dataset = ContextBlocks.find(query, {data: 1}).fetch()[0];
      if(dataset){
        dataset = dataset.data; 
        var totalVotes = 0;
        dataset.forEach(function(value, index, array){
          totalVotes += value.value; 
        });
        var arcs = svg.selectAll("g.arc")
          .data(pie(dataset), key);
        var newGroups = arcs.enter()
          .append("g")
          .attr("class", "arc")
          .attr("transform", "translate(" + outerRadius + "," + outerRadius +
            ")");
        //Draw arc paths
        newGroups.append("path")
          .attr("fill", function(d, i)
          {
            return color(i);
          })
          .attr("d", arc);
        //Labels
        newGroups.append("text")
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .attr("text-anchor", "middle")
          .text(function(d)
          {
            if(totalVotes < 1){
              //don't annotate small values
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return percentage + '%';
          });
        arcs.transition()
          .select('path')
          .attrTween("d", function(d)
          {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t)
            {
              return arc(interpolate(t));
            };
          });
        arcs.transition()
          .select('text')
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .text(function(d)
          {
            if(totalVotes < 1){
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return '';//percentage + '%';
          });
        arcs.exit()
          .remove();
        //debugger;
      }
    }
  });
};
var chartPreviewContainerRendered = function(){
  //Width and height
  var w = 100;
  var h = 100;
  var outerRadius = w / 2;
  var innerRadius = 0;
  var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d)
    {
      return d.value;
    });
  //Easy colors accessible via a 10-step ordinal scale
  var color = d3.scale.category10();
  
  //access to contextId
  var contextId = this.data._id;
  
  //Create SVG element add the context block id to it -----------------------------------------
  var svg = d3.select("#pieChart-preview-" + this.data._id)
    .attr("width", '100%')
    .attr("height", '100%')
    .attr('viewBox','0 0 '+Math.min(w,h) +' '+Math.min(w,h) )
    .attr('preserveAspectRatio','xMinYMin')
    .append("g")
    //.attr("transform", "translate(" + Math.min(w,h) / 2 + "," + Math.min(w,h) / 2 + ")");
  var key = function(d)
  {
    return d.data.name; //._id;
  };
  Tracker.autorun(function(){
    if(contextId){
      var modifier = {
        fields:
        {
          value: 1
        }
      };
      var query = {};
      query._id = contextId;
      var dataset = ContextBlocks.find(query, {data: 1}).fetch()[0];
      if(dataset){
        dataset = dataset.data; 
        var totalVotes = 0;
        dataset.forEach(function(value, index, array){
          totalVotes += value.value; 
        });
        var arcs = svg.selectAll("g.arc")
          .data(pie(dataset), key);
        var newGroups = arcs.enter()
          .append("g")
          .attr("class", "arc")
          .attr("transform", "translate(" + outerRadius + "," + outerRadius +
            ")");
        //Draw arc paths
        newGroups.append("path")
          .attr("fill", function(d, i)
          {
            return color(i);
          })
          .attr("d", arc);
        arcs.transition()
          .select('path')
          .attrTween("d", function(d)
          {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t)
            {
              return arc(interpolate(t));
            };
          });
        arcs.transition()
          .select('text')
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          });
        arcs.exit()
          .remove();
      }
    }
  });

};
var chartContainerHelpers = {
  options: function(){
    return this.data;
  },
  totalVotes: function(){
    var totalVotes = 0;
    if(this.data){
      this.data.forEach(function(value, index, array){
        totalVotes += value.value;
      });
    }
    return totalVotes;
  },
  percentageVote: function(votes){
    var totalVotes = 0;
    if(this.data){
      this.data.forEach(function(value, index, array){
        totalVotes += value.value;
      });
    }
    if(totalVotes < 1){
      return '0';
    }
    var percent = Math.round((votes/totalVotes)*100)
    if(percent < 10){
      return percent + '%<span style="opacity:0">0</span>';
    }
    return percent + '%';
  },
  colorFromIndex: function(index){
    var color = d3.scale.category10();
    var i = 0;
    while(i < index) {
      color(i);
      i++;
    }
    return color(i);
  }
}; 
Template.chart_container_display.rendered = chartDisplayContainerRendered;
Template.chart_container_display.helpers(chartContainerHelpers);
Template.chart_container_preview.rendered = chartPreviewContainerRendered;
Template.chart_container_preview.helpers(chartContainerHelpers);
Template.chart_container.rendered = chartContainerRendered;
Template.chart_container.helpers(chartContainerHelpers);

Template.favorite_button.helpers({
  userFavorited () {
    return Meteor.user() && _.contains(Meteor.user().profile.favorites, Session.get("streamShortId"));
  }
});

Template.favorite_button.events({
  "click .favorite" () {
    if(!Meteor.user()){
      $('#login-modal').modal('show'); 
      return;
    }
    return Meteor.call('favoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Favorite deepstream', trackingInfoFromPage());
      }

    });
  },
  "click .unfavorite" () {
    return Meteor.call('unfavoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Unfavorite deepstream', trackingInfoFromPage());
      }
    });
  }
});

Template.editors_pick_button.events({
  "click .pick" (event) {
    console.log('clicked');
    event.preventDefault();
    return Meteor.call('designateEditorsPick', this.shortId, function(err) {
      if (err) {
        window.notifyError('There was an error making this an editors pick - please speak to dev team');
        notifyError(err);
        throw(err);
      } else {
        window.notifySuccess('This deepstream is now an editors pick!');
      }
    });
  },
  "click .unpick" (event) {
    event.preventDefault();
    console.log('unclicked');
    return Meteor.call('stripEditorsPick', this.shortId, function(err) {
      if (err) {
        window.notifyError('There was an error removing this as an editors pick - please speak to dev team');
        notifyError(err);
        throw(err);
      } else {
        window.notifySuccess('This deepstream is no longer an editors pick.');
      }
    });
  }
});



Template.create_deepstream2016.events({
  'click' (){
    // User has clicked 'Create' to create a deepstream
    if (Meteor.user()){
      var accessPriority = Meteor.user().accessPriority;
      if (accessPriority && accessPriority <= window.createAccessLevel){

        var shortId = Random.id(8);

        var initialStream = (this instanceof Stream) ? this : null;

        Meteor.call('createDeepstream', shortId, initialStream, function(err, pathObject){
          if (err) {
            notifyError(err);
            throw(err);
          }
          Session.set('openCreateAccordion', null);
          Session.set('mediaDataType', 'selectCard');
          Session.set('contextMode', 'curate');
          analytics.track('User clicked create and created deepstream');
        });
      } else {
        notifyInfo("Due to high demand, we had to turn off new curation functionality for a moment. Stay tuned for updates!");
      }
    } else {
      Session.set('signingIn', true);
      analytics.track('User clicked create and needs to sign in', trackingInfoFromPage());
    }
  }
});


Template.create_deepstream.events({
  'click' (){
    // User has clicked 'Create' to create a deepstream
    if (Meteor.user()){
      var accessPriority = Meteor.user().accessPriority;
      if (accessPriority && accessPriority <= window.createAccessLevel){

        var shortId = Random.id(8);

        var initialStream = (this instanceof Stream) ? this : null;

        Meteor.call('createDeepstream', shortId, initialStream, function(err, pathObject){
          if (err) {
            notifyError(err);
            throw(err);
          }
          analytics.track('User clicked create and created deepstream');
        });
      } else {
        notifyInfo("Due to high demand, we had to turn off new curation functionality for a moment. Stay tuned for updates!");
      }
    } else {
      Session.set('signingIn', true);
      analytics.track('User clicked create and needs to sign in', trackingInfoFromPage());
    }
  }
});

Template.context_browser.helpers({
  userFavorited () {
    return Meteor.user() && _.contains(Meteor.user().profile.favorites, Session.get('streamShortId'));
  }
});

Template.context_browser.events({
  'click .create' (){
    if (Meteor.user()){
      var accessPriority = Meteor.user().accessPriority;
      if (accessPriority && accessPriority <= window.createAccessLevel){

        var shortId = Random.id(8);

        var initialStream = (this instanceof Stream) ? this : null;

        Meteor.call('createDeepstream',shortId, initialStream, function(err, pathObject){
          if (err) {
            notifyError(err);
            throw(err);
          }
          analytics.track('User clicked create and created deepstream');

        })
      } else {
        notifyInfo("Due to high demand, we had to turn off new curation functionality for a moment. Stay tuned for updates!");
      }
    } else {
      Session.set('signingIn', true);
      analytics.track('User clicked create and needs to sign in', trackingInfoFromPage());
    }
  },
  "click .favorite" () {
    if(!Meteor.user()){
      $('#login-modal').modal('show'); 
      return;
    }
    return Meteor.call('favoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Favorite deepstream', trackingInfoFromPage());
      }

    });
  },
  "click .unfavorite" () {
    if(!Meteor.user()){
      $('#login-modal').modal('show'); 
      return;
    }
    return Meteor.call('unfavoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Favorite deepstream', trackingInfoFromPage());
      }

    });
  }
  
});

Template.context_browser_portrait.onCreated(function(){
  Meteor.setTimeout(function(){
    console.info('helloooooooooo')
    console.info($('#carousel-portrait-context .carousel-inner'))
    $('#carousel-portrait-context .carousel-inner').each(function() {
      if ($(this).children('div').length === 1){ 
        $(this).siblings('.carousel-control, .carousel-indicators').hide();
        console.info('hide the portrait context switcher');
      } else {
        console.info('show the portrait context switcher');
        $(this).siblings('.carousel-control, .carousel-indicators').show();
      }
    });
  });
});

Template.context_browser_portrait.helpers({
  userFavorited () {
    console.log(Session.get('streamShortId'))
    return Meteor.user() && _.contains(Meteor.user().profile.favorites, Session.get('streamShortId'));
  }
});

Template.context_browser_portrait.events({
  'click .create' (){
    if (Meteor.user()){
      var accessPriority = Meteor.user().accessPriority;
      if (accessPriority && accessPriority <= window.createAccessLevel){

        var shortId = Random.id(8);

        var initialStream = (this instanceof Stream) ? this : null;

        Meteor.call('createDeepstream',shortId, initialStream, function(err, pathObject){
          if (err) {
            notifyError(err);
            throw(err);
          }
          analytics.track('User clicked create and created deepstream');

        })
      } else {
        notifyInfo("Due to high demand, we had to turn off new curation functionality for a moment. Stay tuned for updates!");
      }
    } else {
      Session.set('signingIn', true);
      analytics.track('User clicked create and needs to sign in', trackingInfoFromPage());
    }
  },
  "click .favorite" () {
    if(!Meteor.user()){
      $('#login-modal').modal('show'); 
      return;
    }
    return Meteor.call('favoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        console.error(err);
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Favorite deepstream', trackingInfoFromPage());
      }
    });
  },
  "click .unfavorite" () {
    if(!Meteor.user()){
      $('#login-modal').modal('show'); 
      return;
    }
    return Meteor.call('unfavoriteDeepstream', Session.get("streamShortId"), function(err) {
      if (err) {
        notifyError(err);
        throw(err);
      } else {
        analytics.track('Favorite deepstream', trackingInfoFromPage());
      }

    });
  },
  "click .toggle-card-expansion" () {
    if($('.embed-responsive-16by9.main-stream-mobile').hasClass('not-expanded')){
      Session.set('expandedPortraitCards', true);
      $('.embed-responsive-16by9.main-stream-mobile').removeClass('not-expanded').addClass('expanded').animate({'padding-bottom': 0 });
    } else {
      $('.embed-responsive-16by9.main-stream-mobile').removeClass('expanded').addClass('not-expanded').animate({'padding-bottom': '56.25%' }, 400, 'swing', function(){Session.set('expandedPortraitCards', false);});
    }
  },
  "click .carousel-control.left" (){
    analytics.track('Clicked portrait carousel control left', trackingInfoFromPage());
  },
  "click .carousel-control.right" (){
    analytics.track('Clicked portrait carousel control right', trackingInfoFromPage());
  }
});


Meteor.startup(function(){
  $( window ).konami({
    code : [38,38,40,40,37,39,37,39, 66, 65], // you know...
    cheat: function() {
      Session.set('showEditorsPickButton', true); // we still check for admin ;)
    }
  });

  $( window ).konami({
    code : [68,69,69,80], //deep
    cheat: function() {
      Session.set('showEditorsPickButton', true); // we still check for admin ;)
    }
  });
});

//  // analytics autorun
//  this.autorun(function(){
//    if (!Session.equals("currentY", null)){
//      var y = Session.get("currentY");
//      var storyLength = Session.get("story").verticalSections.length;
//      analytics.track('View vertical narrative section', {
//        label: y,
//        verticalNarrativeIndex: y,
//        storyLength: storyLength,
//        verticalNarrativeFraction: (y + 1) / storyLength,
//        storyId: Session.get("storyId")
//      })
//    }
//  });
//
