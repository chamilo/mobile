define([
    'backbone'
], function (Backbone) {
    var CourseNotebookModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            description: '',
            creationDate: '',
            updateDate: ''
        }
    });

    return CourseNotebookModel;
});

