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
            lastCheckDate: new Date(),
            gcmSenderId: null
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            var transaction = DB.conx.transaction([DB.TABLE_ACCOUNT], 'readwrite'),
                store = transaction.objectStore(DB.TABLE_ACCOUNT),
                request = store.openCursor();

            request.onsuccess = function (e) {
                var cursor = e.target.result;

                if (!cursor) {
                    deferred.reject();

                    return;
                }

                self.cid = cursor.key;
                self.set({
                    url: cursor.value.url,
                    username: cursor.value.username,
                    apiKey: cursor.value.apiKey,
                    lastMessage: cursor.value.lastMessage,
                    lastCheckDate: cursor.value.lastCheckDate,
                    gcmSenderId: cursor.value.gcmSenderId
                });

                deferred.resolve();
            };

            request.onerror = function (e) {
                deferred.reject();
            };

            return deferred.promise();
        },
        save: function (attributes, options) {
            var self = this;

            self.attributes = $.extend(self.attributes, attributes);

            options = $.extend({
                isNew: true,
                success: null,
                error: null
            }, options);

            var transaction = DB.conx.transaction([DB.TABLE_ACCOUNT], 'readwrite'),
                store = transaction.objectStore(DB.TABLE_ACCOUNT),
                request;

            if (options.isNew) {
                request = store.add(this.toJSON());
            } else {
                self.set(attributes);
                request = store.put(this.toJSON(), this.cid);
            }

            request.onsuccess = function (e) {
                if (!attributes) {
                    self.cid = e.target.result;
                }

                if (options.success) {
                    options.success();
                }
            };

            request.onerror = function () {
                if (options.error) {
                    options.error(request.error);
                }
            };
        },
        clear: function () {
            var deferred = new $.Deferred(),
                transaction = DB.conx.transaction([DB.TABLE_ACCOUNT], 'readwrite'),
                store = transaction.objectStore(DB.TABLE_ACCOUNT),
                request = store.clear();

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