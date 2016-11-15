define([
    'backbone',
    'database',
    'model/message'
], function (Backbone, DB, MessageModel) {
    var MessagesCollection = Backbone.Collection.extend({
        model: MessageModel,
        create: function (attributes, options) {
            var self = this,
                deferred = new $.Deferred();

            var message = new MessageModel();
            message.save(attributes)
                .done(function () {
                    self.add(message);

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            var transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readonly'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                index = store.index('sendDate'),
                request = index.openCursor(null);

            request.onsuccess = function (e) {
                var cursor = e.target.result;

                if (!cursor) {
                    deferred.resolve();

                    return;
                }

                var message = new MessageModel(cursor.value);
                message.id = cursor.primaryKey;
                message.cid = message.id;
                self.add(message);

                cursor.continue();
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        }
    });

    return MessagesCollection;
});
