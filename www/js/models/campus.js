define([
    'database',
    'backbone'
], function (DB, Backbone) {
    var CampusModel = Backbone.Model.extend({
        defaults: {
            url: '',
            username: '',
            apiKey: '',
            lastMessage: 0,
            lastCheckDate: new Date()
        },
        getData: function () {
            var self = this;
            var deferred = $.Deferred();

            var transaction = DB.conx.transaction([
                DB.TABLE_ACCOUNT
            ], 'readwrite');
            var store = transaction.objectStore(DB.TABLE_ACCOUNT);
            var request = store.openCursor();

            request.onsuccess = function (e) {
                var cursor = e.target.result;

                if (cursor) {
                    self.cid = cursor.key;
                    self.set({
                        url: cursor.value.url,
                        username: cursor.value.username,
                        apiKey: cursor.value.apiKey,
                        lastMessage: cursor.value.lastMessage,
                        lastCheckDate: cursor.value.lastCheckDate
                    });

                    deferred.resolve(e);
                } else {
                    deferred.reject();
                }
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        },
        save: function (attributes) {
            var deferred = $.Deferred();
            var self = this;

            var transaction = DB.conx.transaction([
                DB.TABLE_ACCOUNT
            ], 'readwrite');
            var store = transaction.objectStore(DB.TABLE_ACCOUNT);
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
        delete: function () {
            var deferred = $.Deferred();
            var transaction = DB.conx.transaction([
                DB.TABLE_ACCOUNT
            ], 'readwrite');
            var store = transaction.objectStore(DB.TABLE_ACCOUNT);
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

    return CampusModel;
});