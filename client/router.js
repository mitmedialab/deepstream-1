var idFromPathSegment = function(pathSegment) { // everything after last dash
  return pathSegment.substring(pathSegment.lastIndexOf('-') + 1);
};

var setTitle = function(pageName){
  var title;
  if(pageName) {
    title = pageName + ' - FOLD';
  } else {
    title = 'FOLD';
  }
  document.title = title;
  $('meta[property="og:title"]').attr('content', title);
};

var setOGImage = function(imageUrl){
  if (imageUrl){
    $('meta[property="og:image"]').attr('content', imageUrl.replace(/^\/\//, "https://")); // replace protocol-less url with https
  } else {
    $('meta[property="og:image"]').attr('content', "https://readfold.com/FOLD_LOGO.svg");
  }
};

Meteor.startup(function(){
  Meteor.subscribe('userData');
})

Router.route("home", {
  path: "/",
  template: "home",
  action: function() {
    if (this.ready()) {
      setTitle();
      setOGImage();
      return this.render();
    }
  },
  data: function() {}
});

Router.route("about", {
  path: "about",
  template: "about",
  action: function() {
    if (this.ready()) {
      setTitle('About');
      setOGImage();
      return this.render();
    }
  },
  data: function() {}
});

Router.route("terms", {
  path: "terms",
  template: "terms",
  action: function() {
    if (this.ready()) {
      setTitle('Terms');
      setOGImage();
      return this.render();
    }
  },
  data: function() {}
});

Router.route("privacy", {
  path: "privacy",
  template: "privacy",
  action: function() {
    if (this.ready()) {
      setTitle('Privacy Policy');
      setOGImage();
      return this.render();
    }
  },
  data: function() {}
});

Router.route("profile", {
  path: "/profile/:username", // can put in display username
  template: "profile",
  action: function() {
    if (this.ready()) {
      setTitle(this.params.username + "'s Profile");
      setOGImage();
      return this.render();
    }
  },
  waitOn: function() {
    var username = this.params.username.toLowerCase();
    return [Meteor.subscribe('userProfilePub', username),
           Meteor.subscribe('userStoriesPub', username)];
  },
  data: function() {
    var username = this.params.username.toLowerCase();
    var user;
      if (this.ready()) {
        user = Meteor.users.findOne({username : username});
        if (user) {
          return {
            user : user          
          }
        } else {
          this.render("user_not_found");
          // TODO add 404 tags for seo etc...
        }
      }

  },
});

Router.route("recover_password", {
  path: "recover-password",
  template: "recover_password",
  action: function() {
    if (this.ready()) {
      setTitle('Recover Password');
      setOGImage();
      return this.render();
    }
  }
})

Router.route("reset_password", {
  path: "reset-password/:resetPasswordToken",
  template: "reset_password",
  data: function() {
    Session.set("resetPasswordToken", this.params.resetPasswordToken);
  },
  action: function() {
    if (this.ready()) {
      setTitle('Reset Password');
      setOGImage();
      return this.render();
    }
  }
})

Router.route("my_story_profile", {
  path: "my-stories",
  template: "my_story_profile",
  waitOn: function() {
    return [Meteor.subscribe('myStoriesPub')];
  },
  action: function() {
    if (this.ready()) {
      setTitle('My Stories');
      setOGImage();
      return this.render();
    }
  },
  onBeforeAction: function() {
    var user;
    if ((user = Meteor.user()) || Meteor.loggingIn()) {
      return this.next();
    } else {
      this.redirect("home", {
        replaceState: true
      });
      return alert("You must be logged in to view your stories");
    }
  }
});

Router.route("read", {
  path: "read/:userPathSegment/:storyPathSegment",
  template: "read",
  waitOn: function() { // subscribe and wait for story if don't have it yet
    var shortId = idFromPathSegment(this.params.storyPathSegment);
    if (Stories.findOne({shortId: shortId}, {reactive: false})) {
      return [];
    } else {
      return [Meteor.subscribe('readStoryPub', this.params.userPathSegment, shortId)];
    }
  },
  action: function() {
    if (this.ready()) {
      return this.render();
    }
  },

  data: function() {
    var story;
    if (this.ready()){
      var shortId = idFromPathSegment(this.params.storyPathSegment);
      story = Stories.findOne({shortId: shortId}, {reactive: false});
      if (story) {
        Session.set("story", story);
        Session.set("storyId", story._id);
        Session.set("storyShortId", shortId);
        Session.set("headerImage", story.headerImage);
        Session.set("horizontalSectionsMap", _.map(_.pluck(story.verticalSections, "contextBlocks"), function (cBlockIds, i) {
          return {
            verticalIndex: i,
            horizontal: _.map(cBlockIds, function (id, i) {
              return {
                _id: id,
                horizontalIndex: i
              }
            })
          };
        }));
        setTitle(story.title);
        setOGImage(headerImageUrl(story.headerImage));
        return story;
      } else {
        setTitle("Story not found");
        setOGImage();
        this.render("story_not_found");
        // TODO add 404 tags for seo etc...
      }
    }
  },
  onBeforeAction: function() {
    Session.set("newStory", false);
    Session.set("read", true);
    Session.set("showDraft", false);
    return this.next();
  }
});


Router.route("edit", {
  path: "create/:userPathSegment/:storyPathSegment",
  template: "create",
  waitOn: function() {
    shortId = idFromPathSegment(this.params.storyPathSegment);
    return [Meteor.subscribe('createStoryPub', this.params.userPathSegment, shortId), Meteor.subscribe('contextBlocksPub', shortId)];
  },
  data: function() {
    var story;
    if (this.ready()) {
      var shortId = idFromPathSegment(this.params.storyPathSegment);
      story = Stories.findOne({shortId: shortId});
      if (story && story.draftStory) {
        Session.set("story", story.draftStory);
        Session.set("storyId", story._id);
        Session.set("storyShortId", shortId);
        Session.set("storyPublished", story.published);
        Session.set("headerImage", story.draftStory.headerImage);
        Session.set("userPathSegment", this.params.userPathSegment);

        Session.set("horizontalSectionsMap", _.map(_.pluck(story.draftStory.verticalSections, "contextBlocks"), function (cBlockIds, i) {
          return {
            verticalIndex: i,
            horizontal: _.map(cBlockIds, function (id, i) {
              return {
                _id: id,
                horizontalIndex: i
              }
            })
          };
        }));
        setTitle('Editing: ' + story.draftStory.title || 'a new story');
        return story;
      } else {
        setTitle('Story not found');
        this.render("story_not_found");
        // TODO add 404 tags for seo etc...
      }
    }
  },
  action: function() {
    if (this.ready()) {
      setOGImage();
      return this.render();
    }
  },
  onBeforeAction: function() {
    var user, data;
    if ((user = Meteor.user()) || Meteor.loggingIn()) { // if there is a user
      data = this.data();
      if (user && data && user._id !== data.authorId) { // if they don't own the story take them to story not found
        return this.render("story_not_found");
      }
      var accessPriority = Meteor.user().accessPriority;
      if (!accessPriority || accessPriority > window.createAccessLevel){
        this.redirect("home", {
          replaceState: true
        });
        alert("Creating and editing stories is temporarily disabled, possibly because things blew up (in a good way). Sorry about that! We'll have everything back up as soon as we can. Until then, why not check out some of the other great content authors in the community have written?")
      }
      return this.next(); // if they do own the story, let them through to create
    } else {
      Session.set('signingIn', true); // if there is no user, take them to the signin page
      this.redirect("home", { // TO-DO, after they sign in, they should get back to the create page
        replaceState: true
      });
      return this.next();
    }
  }
});


// handle user bailing in middle of twitter signup, before a username is chosen. this probably only happens on page load or reload.
Router.onBeforeAction(function() {
  var that = this;

  setTimeout(function(){
    if (!Session.get('signingInWithTwitter')) { // don't forcible logout user if in the middle of twitter signup
      var user = Meteor.user();
      var currentRoute = that.route.getName();
      if (user && currentRoute){
        if(!user.username && currentRoute !== 'twitter-signup'){ // if user has no username, confirm they are on the page where they can fill that out
          Meteor.logout(); // otherwise log them out
          setTimeout(function(){
            throw new Meteor.Error('Forcibly logged out user, presumably because they did not finish twitter signup (setting username etc...)');
          }, 0);
        }
      }
    }
  }, 100); // this might even be ok when set to 0

  this.next()
});

Router.route("twitter-signup", {
  path: "twitter-signup",
  template: "signup",
  waitOn: function() {
    if (Meteor.user()) {
     return [Meteor.subscribe('tempUsernamePub')];
    }
  },
  action: function() {
    Session.set("emailUser", false);
    Session.set('signingInWithTwitter', false);
    if (this.ready()) {
      setTitle('Signup');
      setOGImage();
      return this.render();
    }
  }
});

Router.route("email-signup", {
  path: "email-signup",
  template: "signup",
  action: function() {
    Session.set("emailUser", true);
    Session.set('signingInWithTwitter', false);
    if (this.ready()) {
      setTitle('Signup');
      setOGImage();
      return this.render();
    }
  }
});

Router.route("login", {
  path: "login",
  template: "login",
  action: function() {
    if (this.ready()) {
      setTitle('Login');
      setOGImage();
      return this.render();
    }
  }
});

Router.route("stats", {
  path: "stats",
  template: "stats"
});
