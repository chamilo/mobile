define([
    'backbone',
    'database',
    'model/message'
], function (Backbone, DB, MessageModel) {
    var MessagesCollection = Backbone.Collection.extend({
        model: MessageModel,
        create: function (attributes, options) {
            var self = this;

            options = $.extend({
                success: null,
                error: null
            }, options);

            var messageModel = new MessageModel();
            messageModel.save(attributes, {
                success: function () {
                    self.add(messageModel);

                    if (options.success) {
                        options.success();
                    }
                },
                error: function () {
                    if (options.error) {
                        options.error();
                    }
                }
            });
        },
        fetch: function (options) {
            var self = this;

            options = $.extend({
                success: null,
                error: null
            }, options);

            var transaction = DB.conx.transaction([DB.TABLE_MESSAGE], 'readonly'),
                store = transaction.objectStore(DB.TABLE_MESSAGE),
                index = store.index('sendDate'),
                request = index.openCursor(null);

            request.onsuccess = function (e) {
                var cursor = e.target.result;

                if (!cursor) {
                    if (options.success) {
                        options.success();
                    }
                    
                    return;
                }

                var message = new MessageModel(cursor.value);
                message.cid = cursor.primaryKey;
                self.add(message);

                cursor.continue();
            };

            request.onerror = function () {
                if (options.error) {
                    options.error();
                }
            };
        }
    });

    return MessagesCollection;
});
