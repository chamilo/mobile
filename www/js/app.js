var app = {
    lang: {},
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function () {
        app.loadLanguage();

        var setup = app.setUpDatabase();

        $.when(setup).done(function () {
            new Chamilo.Router();

            Backbone.history.start();
        });

        $.when(setup).fail(function () {
            alert('Database setup: Fail');
        });
    },
    setUpDatabase: function () {
        var deferred = $.Deferred(),
            dbRequest = window.indexedDB.open(Chamilo.db.name, Chamilo.db.version);

        dbRequest.onupgradeneeded = function (e) {
            var thisDB = e.target.result,
                accountStore = thisDB.createObjectStore(Chamilo.db.table.account, {
                    autoIncrement: true
                }),
                messageStore = thisDB.createObjectStore(Chamilo.db.table.message, {
                    autoIncrement: true
                });
            accountStore.createIndex('url', 'url');
            accountStore.createIndex('username', 'username');
            accountStore.createIndex('apiKey', 'apiKey', {
                unique: true
            });
            accountStore.createIndex('lastMessage', 'lastMessage');
            accountStore.createIndex('lastCheckDate', 'lastCheckDate');

            messageStore.createIndex('messageId', 'messageId', {
                unique: true
            });
            messageStore.createIndex('title', 'title');
            messageStore.createIndex('sender', 'sender');
            messageStore.createIndex('hasAttachment', 'hasAttachment');
            messageStore.createIndex('sendDate', 'sendDate');
            messageStore.createIndex('content', 'content');
            messageStore.createIndex('url', 'url');
        };

        dbRequest.onsuccess = function (e) {
            Chamilo.db.conx = e.target.result;

            deferred.resolve(e);
        };

        dbRequest.onerror = function (e) {
            deferred.reject();
        };

        return deferred.promise();
    },
    loadLanguage: function () {
        navigator.globalization.getPreferredLanguage(
            function (prefferedLanguage) {
                var language = prefferedLanguage.value.split('-');

                $.getScript('lang/' + language[0] + '.js');
            },
            function () {
                $.getScript('lang/en.js');
            }
        );
    }
};
