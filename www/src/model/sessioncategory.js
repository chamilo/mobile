define([
    'backbone',
    'model/session'
], function (Backbone, SessionModel) {
    var SessionCategoryModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            name: '',
            sessions: []
        },
        initialize: function (attributes) {
            var sessions = [];

            _.each(attributes.sessions, function (session) {
                sessions.push(new SessionModel(session));
            });

            this.set('sessions', sessions);
        }
    });

    return SessionCategoryModel;
});
