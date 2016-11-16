define([
    'backbone',
    'text!template/course-forum.html',
    'model/course-forum',
    'view/spinner'
], function (Backbone, viewTemplate, CourseForumModel, SpinnerView) {
    var CourseForumView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-forum',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.model = new CourseForumModel();
            this.model.on('change', this.onChange, this);
        },
        template: _.template(viewTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(
                    this.model.toJSON()
                );

            this.container = this.$el.find('#container');
            this.container.html(this.spinner.render().$el);

            this.model.fetch()
                .fail(function () {
                    self.spinner.stopFailed();
                });

            return this;
        },
        onChange: function (forum) {
            this.spinner.stop();

            this.el.innerHTML = this.template(
                    forum.toJSON()
                );
        }
    });

    return CourseForumView;
});
