require.config({
    baseUrl: 'js',
    paths: {
        jquery: 'libs/jquery/jquery.min',
        underscore: 'libs/underscore.js/underscore',
        backbone: 'libs/backbone.js/backbone-min',
        text: 'libs/require-text/text',
        i18n: 'libs/require-i18n/i18n',
        template: '../templates'
    }
});

document.addEventListener('deviceready', function () {
    require([
        'app',
        'i18n!nls/app'
    ], function (App, appLang) {
        window.lang = appLang;

        App.initialize();
    });
});
