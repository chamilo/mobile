define([
    'jquery',
    'database',
    'router'
], function ($, DB, Router) {

    var App = {
        initialize: function () {
            var setupDB = DB.setUp();

            $.when(setupDB).done(function (e) {
                Router.initialize();
            });

            $.when(setupDB).fail(function (e) {
                alert('Database setup: Fail');
            });
        }
    };

    return App;
});
