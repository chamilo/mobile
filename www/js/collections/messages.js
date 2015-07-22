define([
    'underscore',
    'backbone',
    'database',
    'models/message'
], function (_, Backbone, DB, MessageModel) {
    var MessagesCollection = Backbone.Collection.extend({
        model: MessageModel,
        create: function (attributes) {
            var self = this;
            var deferred = $.Deferred();

            var messageModel = new MessageModel(attributes);
            var saveMessaModel = messageModel.save();

            $.when(saveMessaModel).done(function () {
                self.add(messageModel);

                deferred.resolve();
            });

            $.when(saveMessaModel).fail(function () {
                deferred.reject();
            });

            return deferred.promise();
        },
        fetch: function () {
            var self = this;
            var deferred = $.Deferred();
            var transaction = DB.conx.transaction([
                DB.TABLE_MESSAGE
            ], 'readonly');
            var store = transaction.objectStore(DB.TABLE_MESSAGE);
            var index = store.index('sendDate');
            var request = index.openCursor(null, 'prev');

            request.onsuccess = function (e) {
                var cursor = e.target.result;

                if (cursor) {
                    var message = new MessageModel(cursor.value);
                    message.cid = cursor.primaryKey;

                    self.add(message);

                    cursor.continue();
                } else {
                    deferred.resolve();
                }
            };

            request.onerror = function () {
                deferred.reject();
            };

            return deferred.promise();
        }
    });

    return MessagesCollection;
});
