define({
    name: 'chamilo-messaging',
    version: 4,
    TABLE_ACCOUNT: 'account',
    TABLE_MESSAGE: 'message',
    conx: null,
    setUp: function () {
        var deferred = $.Deferred();
        var self = this;

        var dbRequest = window.indexedDB.open(self.name, self.version);
        dbRequest.onupgradeneeded = function (e) {
            var database = e.target.result;
            var upgradeTransaction = e.target.transaction;

            if (!database.objectStoreNames.contains(self.TABLE_ACCOUNT)) {
                var accountStore = database.createObjectStore(self.TABLE_ACCOUNT, {
                    autoIncrement: true
                });
                accountStore.createIndex('url', 'url');
                accountStore.createIndex('username', 'username');
                accountStore.createIndex('apiKey', 'apiKey', {
                    unique: true
                });
                accountStore.createIndex('lastMessage', 'lastMessage');
                accountStore.createIndex('lastCheckDate', 'lastCheckDate');
                accountStore.createIndex('gcmSenderId', 'gcmSenderId', {
                    unique: true
                });
            }

            if (!database.objectStoreNames.contains(self.TABLE_MESSAGE)) {
                var messageStore = database.createObjectStore(self.TABLE_MESSAGE, {
                    autoIncrement: true
                });
                messageStore.createIndex('messageId', 'messageId', {
                    unique: true
                });
                messageStore.createIndex('title', 'title');
                messageStore.createIndex('sender', 'sender');
                messageStore.createIndex('hasAttachment', 'hasAttachment');
                messageStore.createIndex('sendDate', 'sendDate');
                messageStore.createIndex('content', 'content');
                messageStore.createIndex('url', 'url');
            }

            switch (database.version) {
                case 4:
                    upgradeTransaction.objectStore(self.TABLE_MESSAGE).createIndex('beenSeen', 'beenSeen');
                    break;
            }
        };

        dbRequest.onsuccess = function (e) {
            self.conx = e.target.result;

            deferred.resolve(e);
        };

        dbRequest.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    }
});
