document.addEventListener('deviceready', function () {
    require([
        'database',
        'app'
    ], function (DB, app) {
        DB.setUp().done(function () {
            app.init();
        }).fail(function () {
            alert('App not loaded');
        });
    });
});
