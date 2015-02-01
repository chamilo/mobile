Chamilo.Collection.Messages = Backbone.Collection.extend({
    model: Chamilo.Model.Message,
    fetchFromWS: function (hostName, username, apiKey, lastId) {
        var self = this;

        var getMessages = $.post(hostName + '/main/webservices/rest.php', {
            action: 'getNewMessages',
            username: username,
            api_key: apiKey,
            last: lastId
        });

        $.when(getMessages).done(function (response) {
            _.each(response.messages, function (messageData) {
                var message = new Chamilo.Model.Message({
                    messageId: parseInt(messageData.id),
                    sender: messageData.sender.completeName,
                    title: messageData.title,
                    content: messageData.content,
                    hasAttachment: messageData.hasAttachments,
                    sendDate: messageData.sendDate,
                    url: messageData.platform.messageURL
                });

                self.add(message);
            });
        });

        return getMessages;
    },
    fetchFromDB: function () {
        var self = this;
        var deferred = $.Deferred();

        var transaction = Chamilo.db.conx.transaction([
            Chamilo.db.table.message
        ], 'readonly');
        var store = transaction.objectStore(Chamilo.db.table.message);
        var index = store.index('sendDate');
        var request = index.openCursor(null, 'prev');

        request.onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
                var message = new Chamilo.Model.Message(cursor.value);
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
