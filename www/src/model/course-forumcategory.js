define([
    'backbone'
], function (Backbone) {
    var CourseForumCategoryModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            catId: 0,
            description: '',
            forums: []
        }
    });

    return CourseForumCategoryModel;
});
