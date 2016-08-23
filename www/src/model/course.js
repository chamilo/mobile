define([
    'backbone'
], function (Backbone) {
    var CourseModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            code: '',
            directory: '',
            urlPicture: null,
            teachers: ''
        }
    });
    
    return CourseModel;
});
