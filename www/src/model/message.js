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
        save: function (attributes, options) {
            var self = this,
                deferred = new $.Deferred();

            self.attributes = $.extend(self.attributes, attributes);

            var transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readwrite'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                request = store.put(this.toJSON(), this.id);

            request.onsuccess = function (e) {
                self.id = e.target.result;
                self.cid = self.id;

                deferred.resolve();
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        },
        fetch: function (options) {
            var self = this;

            options = $.extend({
                success: null,
                error: null
            }, options);

            var transaction = DB.conx.transaction([DB.TABLE_MESSAGE]),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                request = store.get(this.cid);

            request.onsuccess = function (e) {
                if (!request.result) {
                    if (options.error) {
                        options.error(request.error);
                    }

                    return;
                }

                if (request.result) {
                    self.set(request.result);

                    if (options.success) {
                        options.success();
                    }
                }
            };

            request.onerror = function () {
                if (options.error) {
                    options.error(request.error);
                }
            };
        },
        next: function (options) {
            options = $.extend({
                success: null,
                error: null
            }, options);

            var range = IDBKeyRange.lowerBound(this.get('messageId'), true),
                transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readonly'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                index = store.index('messageId'),
                request = index.openCursor(range);

            request.onsuccess = function (e) {
                var nextMessage = null,
                    cursor = e.target.result;

                if (cursor) {
                    nextMessage = new MessageModel(cursor.value);
                    nextMessage.cid = cursor.primaryKey;
                }

                if (options.success) {
                    options.success(nextMessage);
                }
            };

            request.onerror = function () {
                if (options.error) {
                    options.error(request.error);
                }
            };
        },
        previous: function (options) {
            options = $.extend({
                success: null,
                error: null
            }, options);

            var range = IDBKeyRange.upperBound(this.get('messageId'), true),
                transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readonly'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                index = store.index('messageId'),
                request = index.openCursor(range, 'prev');

            request.onsuccess = function (e) {
                var previousMessage = null,
                    cursor = e.target.result;

                if (cursor) {
                    previousMessage = new MessageModel(cursor.value);
                    previousMessage.cid = cursor.primaryKey;
                }

                if (options.success) {
                    options.success(previousMessage);
                }
            };

            request.onerror = function () {
                if (options.error) {
                    options.error(request.error);
                }
            };
        },
        clear: function () {
            var deferred = $.Deferred(),
                transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readwrite'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
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

    return MessageModel;
});
