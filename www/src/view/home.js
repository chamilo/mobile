define([
    'backbone',
    'text!template/home.html'
], function (Backbone, homeTemplate) {
    var HomeView = Backbone.View.extend({
        el: 'body',
        template: _.template(homeTemplate),
        render: function () {
            this.el.innerHTML = this.template();
            
            return this;
        }
    });
    
    return HomeView;
});
