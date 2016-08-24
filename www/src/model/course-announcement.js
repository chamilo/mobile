define([
    'backbone'
], function (Backbone) {
    var CourseAnnouncementModel = Backbone.Model.extend({
        default: {
            id: 0,
            title: '',
            creatorName: '',
            date: '',
            content: ''
        }
    });

    return CourseAnnouncementModel;
});
