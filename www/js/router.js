Chamilo.Router = Backbone.Router.extend({
    routes: {
        '': 'showIndex',
        'login': 'showFrmLogin',
        'update': 'showFrmUpdate',
        'inbox': 'showFrmInbox',
        'logout': 'shorFrmLogout',
        'message/:id': 'showMessage'
    },
    showIndex: function () {
        var campus = new Chamilo.Model.Campus(),
            getData = campus.getData();

        $.when(getData).done(function (cursor) {
            if (cursor) {
                if (navigator.connection.type === Connection.NONE) {
                    Backbone.history.navigate('inbox', {
                        trigger: true
                        });
                } else {
                    Backbone.history.navigate('update', {
                        trigger: true
                    });
                }
            } else {
                Backbone.history.navigate('login', {
                    trigger: true
                });
            }
        });

        $.when(getData).fail(function () {
            console.log('No cursor');
        });
    },
    showFrmLogin: function () {
        var frmLogin = new Chamilo.View.FrmLogin();

        $('#app').html(frmLogin.render().$el);
    },
    showFrmUpdate: function () {
        var frmLoader = new Chamilo.View.FrmLoader(),
            campus = new Chamilo.Model.Campus(),
            getData = campus.getData();

        $('#app').html(frmLoader.render().$el);

        $.when(getData).done(function (campusCursor) {
            if (campusCursor) {
                var messageCollection = new Chamilo.Collection.Messages(),
                    getNewMessages = messageCollection.fetchFromWS(
                        campus.get('url'),
                        campus.get('username'),
                        campus.get('apiKey'),
                        campus.get('lastMessage')
                    );

                $.when(getNewMessages).done(function () {
                    if (messageCollection.length > 0) {
                        var lastMessage = messageCollection.first(),
                            updateCampus = null;

                        campus.set('lastMessage', lastMessage.get('messageId'));
                        campus.set('lastCheckDate', new Date());

                        updateCampus = campus.updateData(campusCursor.key);

                        $.when(updateCampus).done(function () {
                            var saveMessages = new Array();

                            messageCollection.each(function (message) {
                                var saveMessage = message.save();

                                saveMessages.push(saveMessage);
                            });

                            $.when.apply($, saveMessages).done(function () {
                                Backbone.history.navigate('inbox', {
                                    trigger: true
                                });
                            });
                        });

                        $.when(updateCampus).fail(function () {
                            console.log('Account not updated');
                        });
                    } else {
                        console.log('No new messages');

                        Backbone.history.navigate('inbox', {
                            trigger: true
                        });
                    }
                });

                $.when(getNewMessages).fail(function () {
                    console.log('Error when trying get new messages');
                });
            } else {
                console.log('No account data');
            }
        });

        $.when(getData).fail(function () {
            console.log('Error when trying get the account');
        });
    },
    showFrmInbox: function () {
        var messages = new Chamilo.Collection.Messages(),
            request = messages.fetchFromDB();

        $.when(request).done(function () {
            var frmInbox = new Chamilo.View.FrmInbox();

            frmInbox.headerView = new Chamilo.View.FrmHeader();
            frmInbox.contentView = new Chamilo.View.FrmInboxContent({
                collection: messages
            });

            $('#app').html(frmInbox.render().$el);
        });

        $.when(request).fail(function () {
            console.log('Error when trying get message list');
        });
    },
    shorFrmLogout: function () {
        var frmLoader = new Chamilo.View.FrmLoader(),
            campus = new Chamilo.Model.Campus(),
            getData = campus.getData();

        $('#app').html(frmLoader.render('Closing session').$el);

        $.when(getData).done(function (campusCursor) {
            if (campusCursor) {
                var messages = new Chamilo.Collection.Messages(),
                    fetchMessages = messages.fetchFromDB();

                $.when(fetchMessages).done(function () {
                    var logoutPromises = new Array(),
                        deleteCampus = campus.deleteData(campusCursor.key);

                    logoutPromises.push(deleteCampus);

                    messages.each(function (message) {
                        var deleteMessage = message.deleteData();

                        logoutPromises.push(deleteMessage);
                    });

                    $.when.apply($, logoutPromises).always(function () {
                        Backbone.history.navigate('', {
                            trigger: true
                        });
                    });
                });

                $.when(fetchMessages).fail(function () {
                    console.log('Error when trying get message list');
                });
            } else {
                console.log('No account data');
            }
        });

        $.when(getData).fail(function () {
            console.log('Error when trying get the account');
        });
    },
    showMessage: function (id) {
        id = parseInt(id);

        var message = new Chamilo.Model.Message(),
            getData = message.getData(id);

        $.when(getData).done(function () {
            var frm = new Chamilo.View.FrmFullMessage(),
                getNext = message.getNext(id),
                getPrevious = message.getPrevious(id);

            frm.headerView = new Chamilo.View.FrmHeader();
            frm.contentView = new Chamilo.View.FrmFullMessageContent({
                model: message
            });

            $.when(getNext, getPrevious).always(function (nextMessage, previousMessage) {
                if (nextMessage !== null || previousMessage !== null) {
                    frm.footerView = new Chamilo.View.FrmFullMessageFooter();

                    frm.footerView.nextButton = new Chamilo.View.FrmFullMessageFooterNext({
                        model: nextMessage
                    });

                    frm.footerView.previousButton = new Chamilo.View.FrmFullMessageFooterPrevious({
                        model: previousMessage
                    });
                }

                $('#app').html(frm.render().$el);
            });
        });

        $.when(getData).fail(function () {
            console.log('Message do not exists');
        });
    }
});
