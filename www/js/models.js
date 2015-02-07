Chamilo.Model.Campus = Backbone.Model.extend({
    defaults: {
        url: '',
        username: '',
        apiKey: '',
        lastMessage: 0,
        lastCheckDate: new Date()
    },
    checkIsValid: function (password) {
        var chamiloAPi = this.get('url') + '/main/webservices/rest.php';

        return $.post(chamiloAPi, {
            action: 'loginNewMessages',
            username: this.get('username'),
            password: password
        });
    },
    save: function () {
        var deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.account
            ], 'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.account),
            request = store.add(this.toJSON());

        request.onsuccess = function (e) {
            deferred.resolve({
                id: e.target.result
            });
        };

        request.onerror = function (e){
            deferred.reject();
        };

        return deferred.promise();
    },
    getData: function () {
        var self = this,
            deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.account
            ], 'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.account),
            request = store.openCursor();

        request.onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
                self.set('url', cursor.value.url);
                self.set('username', cursor.value.username);
                self.set('apiKey', cursor.value.apiKey);
                self.set('lastMessage', cursor.value.lastMessage);
                self.set('lastCheckDate', cursor.value.lastCheckDate);
            }

            deferred.resolve(cursor);
        };

        request.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    },
    updateData: function (key) {
        var deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.account
            ],'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.account),
            putRequest = store.put(this.toJSON(), key);

        putRequest.onsuccess = function (e) {
            deferred.resolve(e.target.result);
        };

        putRequest.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    },
    deleteData: function (key) {
        var deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.account
            ],'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.account),
            deleteRequest = store.delete(key);

        deleteRequest.onsuccess = function (e) {
            deferred.resolve(e.target.result);
        };

        deleteRequest.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    }
});

Chamilo.Model.Message = Backbone.Model.extend({
    defaults: {
        messageId: 0,
        sender: '',
        title: '',
        content: '',
        hasAttachment: false,
        sendDate: new Date(),
        url: ''
    },
    save: function () {
        var deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.message
            ], 'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.message),
            request = store.add(this.toJSON());

        request.onsuccess = function (e) {
            deferred.resolve({
                id: e.target.result
            });
        };

        request.onerror = function (e){
            deferred.reject();
        };

        return deferred.promise();
    },
    deleteData: function () {
        var deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.message
            ],'readwrite'),
            store = transaction.objectStore(Chamilo.db.table.message),
            deleteRequest = store.delete(this.cid);

        deleteRequest.onsuccess = function (e) {
            deferred.resolve(e.target.result);
        };

        deleteRequest.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    },
    getData: function (cid) {
        var self = this,
            deferred = $.Deferred(),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.message
            ]),
            store = transaction.objectStore(Chamilo.db.table.message),
            request = store.get(cid);

        request.onsuccess = function (e) {
            var data = request.result;

            self.set('messageId', data.messageId);
            self.set('sender', data.sender);
            self.set('title', data.title);
            self.set('content', data.content);
            self.set('hasAttachment', data.hasAttachment);
            self.set('sendDate', data.sendDate);
            self.set('url', data.url);

            deferred.resolve();
        };

        request.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    },
    getNext: function (currentKey) {
        var deferred = $.Deferred(),
            range = IDBKeyRange.lowerBound(this.get('messageId'), true),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.message
            ], 'readonly'),
            store = transaction.objectStore(Chamilo.db.table.message),
            index = store.index('messageId'),
            request = index.openCursor(range);

        request.onsuccess = function (e) {
            var nextMessage = null,
                cursor = e.target.result;

            if (cursor) {
                nextMessage = new Chamilo.Model.Message(cursor.value);
                nextMessage.cid = cursor.primaryKey;
            }

            deferred.resolve(nextMessage);
        };

        request.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    },
    getPrevious: function () {
        var deferred = $.Deferred(),
            range = IDBKeyRange.upperBound(this.get('messageId'), true),
            transaction = Chamilo.db.conx.transaction([
                Chamilo.db.table.message
            ], 'readonly'),
            store = transaction.objectStore(Chamilo.db.table.message),
            index = store.index('messageId'),
            request = index.openCursor(range, 'prev');

        request.onsuccess = function (e) {
            var previousMessage = null,
                cursor = e.target.result;

            if (cursor) {
                previousMessage = new Chamilo.Model.Message(cursor.value);
                previousMessage.cid = cursor.primaryKey;
            }

            deferred.resolve(previousMessage);
        };

        request.onerror = function () {
            deferred.reject();
        };

        return deferred.promise();
    }
});
