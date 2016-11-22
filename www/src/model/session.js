define([
    'backbone',
    'model/course'
], function (Backbone, CourseModel) {
    var SessionModel = Backbone.Model.extend({
        defaults: {
            name: '',
            id: 0,
            accessStartDate: '',
            accessEndDate: '',
            courses: []
        },
        initialize: function (attributes) {
            var courses = [];

            _.each(attributes.courses, function (course) {
                courses.push(new CourseModel(course));
            });

            this.set('courses', courses);
        }
    });

    return SessionModel;
});
