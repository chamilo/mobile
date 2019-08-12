define([
    'backbone',
    'text!template/course-event.html'
], function (Backbone, viewTemplate) {
    var CourseEventView = Backbone.View.extend({
        tagName: 'article',
        className: 'panel panel-default',
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());
            
            return this;
        }
    });
    
    return CourseEventView;
});
