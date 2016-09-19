Template.minimal_navbar.helpers({
  loggedIn() { return Meteor.user() }
});

Template.minimal_navbar.events({
  "click .logout" (e, t) {
    console.log('clicked logout!')
    e.preventDefault();
    Meteor.logout(() => {
      if(window.mainPlayer){
        window.resetMainPlayer();
      }
    });
  }
});