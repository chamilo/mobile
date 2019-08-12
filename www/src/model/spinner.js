define([
    'backbone'
], function (Backbone) {
    var SpinnerModel = Backbone.Model.extend({
        defaults: {
            loading: true,
            noContent: false
        }
    });

    return SpinnerModel;
});