define([
    'backbone'
], function (Backbone) {
    var CourseLpModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            progress: 0,
            url: null
        }
    });

    return CourseLpModel;
});
