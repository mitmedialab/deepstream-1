var changeFavorite;

changeFavorite = function(storyId, toFavorite) {
  var operator, storyOperation, userOperation;
  check(storyId, String);
  this.unblock();
  if (!this.userId) {
    throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to favorite a story');
  }
  operator = toFavorite ? '$addToSet' : '$pull';
  storyOperation = {};
  storyOperation[operator] = {
    favorited: this.userId
  };
  userOperation = {};
  userOperation[operator] = {
    'profile.favorites': storyId
  };
  Stories.update({
    _id: storyId
  }, storyOperation);
  return Meteor.users.update({
    _id: this.userId
  }, userOperation);
};

var checkOwner = function(userId, doc) {
  return userId && userId === doc.authorId;
};

updateStory = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {lastSaved: Date.now(), 'draftStory.unpublishedChanges' : true});

  return Stories.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};


Meteor.methods({
  // TODO PREVENT FROM SAVING OTHER WAYS
  updateStoryTitle: function(storyId, title){
    var storyPathSegment = _s.slugify(title.toLowerCase())+ '-' + Stories.findOne({_id: storyId}).shortId;
    return updateStory({_id: storyId}, {$set: {'draftStory.title' : title, 'draftStory.storyPathSegment' : storyPathSegment }});
  },
  // TODO replace with specific methods
  saveStory: function(selector, modifier, options) {
    console.log('saveStory!');
    //update: function(userId, doc, fieldNames) {
    //  var disallowedFields;
    //  disallowedFields = ['authorId', 'storyPathSegment', 'userPathSegment', 'favorited'];
    //  if (_.intersection(fieldNames, disallowedFields).length) {
    //    return false;
    //  }
    //  return checkOwner(userId, doc);
    //}
  //  if (titleField.isSet){
  //  return _s.slugify(titleField.value.toLowerCase())+ '-' + this.docId;
  //} else {
  //}

    return updateStory(selector, modifier);
  },
  favoriteStory: function(storyId) {
    return changeFavorite.call(this, storyId, true);
  },
  unfavoriteStory: function(storyId) {
    return changeFavorite.call(this, storyId, false);
  },
  createStory: function() {
    if (!this.userId) {
      throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to create a story');
    }
    var user = Meteor.users.findOne({ _id : this.userId });

    var shortId = Random.id(8);
    console.log(1111);
    var storyPathSegment = _s.slugify('new-story')+ '-' + shortId;  // TODO DRY
    var userPathSegment= user.username;

    Stories.insert({
      published: false,
      verticalSections: [{
        _id: Random.id(8),
        contextBlocks: [],
        title: "",
        content: ""
      }],
      lastSaved: new Date,
      userPathSegment: userPathSegment,
      storyPathSegment: storyPathSegment,
      authorId: this.userId,
      authorName: user.profile.name || 'Anonymous',
      shortId: shortId,
      draftStory: {
        authorId: this.userId,
        verticalSections: [{
          _id: Random.id(8),
          contextBlocks: [],
          title: "",
          content: ""
        }],
        title: '',
        userPathSegment: userPathSegment,
        storyPathSegment: storyPathSegment
      }
  }, {removeEmptyStrings: false});
    return {
      userPathSegment: userPathSegment,
      storyPathSegment: storyPathSegment
    };
  }
  // publishStory
  // 'draftStory.unpublishedChanges' : false

});


