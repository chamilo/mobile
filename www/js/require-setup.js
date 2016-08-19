var require = {
    paths: {
        jquery: '../vendor/jquery/jquery.min',
        bootstrap: '../bootstrap/js/bootstrap.min',
        underscore: '../vendor/underscore.js/underscore-min',
        backbone: '../vendor/backbone.js/backbone-min',
        text: '../vendor/require-text/text.min',
        i18n: '../vendor/require-i18n/i18n.min',
        router: '../js/router'
    },
    shim: {
        bootstrap: {
            'deps': ['jquery']
        },
        backbone: {
            deps: ['underscore', 'jquery']
        },
        database: {
            deps: ['jquery'],
            exports: 'DB',
            init: function ($) {
                return this.DB;
            }
        }
    },
    baseUrl: 'src',
    deps: ['database', 'bootstrap'],
    callback: function (DB, bootstrap) {
        DB
            .setUp()
            .fail(function (e) {
                alert('Database setup: Fail');
            });
    }
};