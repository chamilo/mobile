define([
    'database',
    'backbone'
], function (DB, Backbone) {
    var MessageModel = Backbone.Model.extend({
        defaults: {
            messageId: 0,
            sender: '',
            title: '',
            content: '',
            hasAttachment: false,
            sendDate: new Date(),
            url: ''
        },
        save: function (attributes) {
            var deferred = $.Deferred();
            var self = this;

            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ], 'readwrite');
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var request;

            if (!attributes) {
                request = store.add(this.toJSON());
            } else {
                self.set(attributes);
                request = store.put(this.toJSON(), this.cid);
            }

            request.onsuccess = function (e) {
                if (!attributes) {
                    self.cid = e.target.result;
                }

                deferred.resolve();
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        },
        getData: function (cid) {
            var self = this;
            var deferred = $.Deferred();
            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ]);
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var request = store.get(cid);

            request.onsuccess = function (e) {
                if (request.result) {
                    var data = request.result;

                    self.cid = cid;
                    self.set(data);

                    deferred.resolve();
                } else {
                    deferred.reject();
                }
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        },
        getNext: function (currentKey) {
            var deferred = $.Deferred();

            var range = IDBKeyRange.lowerBound(this.get('messageId'), true);
            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ], 'readonly');
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var index = store.index('messageId');
            var request = index.openCursor(range);

            request.onsuccess = function (e) {
                var nextMessage = null;
                var cursor = e.target.result;

                if (cursor) {
                    nextMessage = new MessageModel(cursor.value);
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
            var deferred = $.Deferred();

            var range = IDBKeyRange.upperBound(this.get('messageId'), true);
            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ], 'readonly');
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var index = store.index('messageId');
            var request = index.openCursor(range, 'prev');

            request.onsuccess = function (e) {
                var previousMessage = null;
                var cursor = e.target.result;

                if (cursor) {
                    previousMessage = new MessageModel(cursor.value);
                    previousMessage.cid = cursor.primaryKey;
                }

                deferred.resolve(previousMessage);
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        },
        delete: function () {
            var deferred = $.Deferred();
            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ], 'readwrite');
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var request = store.clear();

            request.onsuccess = function () {
                deferred.resolve();
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        }
    });

    return MessageModel;
});
