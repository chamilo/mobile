var require = {
    paths: {
        jquery: '../vendor/jquery/jquery.min',
        bootstrap: '../vendor/bootstrap/js/bootstrap.min',
        underscore: '../vendor/underscore.js/underscore-min',
        backbone: '../vendor/backbone.js/backbone-min',
        text: '../vendor/require-text/text.min',
        i18n: '../vendor/require-i18n/i18n.min'
    },
    shim: {
        ripples: {
            deps: ['jquery'],
            exports: 'jQuery.fn.ripples'
        },
        material: {
            deps: ['jquery', 'ripples'],
            exports: 'jQuery.material'
        },
        bootstrap: {
            deps: ['jquery']
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
    deps: ['i18n!nls/lang', 'bootstrap'],
    callback: function (lang) {
        window.lang = lang;
    }
};