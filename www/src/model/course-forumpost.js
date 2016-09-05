define([
    'backbone'
], function (Backbone) {
    var CourseForumPostModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            text: '',
            author: '',
            date: '',
            parentId: 0
        }
    });

    return CourseForumPostModel;
});
