define([
    'backbone'
], function (Backbone) {
    var CourseLpModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            name: '',
            learnpaths: []
        }
    });

    return CourseLpModel;
});
