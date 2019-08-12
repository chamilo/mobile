define([
    'backbone'
], function (Backbone) {
    var CourseEventModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            content: '',
            startDate: '',
            endDate: '',
            isAllDay: false
        }
    });

    return CourseEventModel;
});
