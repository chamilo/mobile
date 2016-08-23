define([
    'backbone'
], function (Backbone) {
    var CourseDescriptionModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            content: ''
        }
    });

    return CourseDescriptionModel;
});

