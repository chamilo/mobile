Chamilo.View.FrmLogin = Backbone.View.extend({
    tagName: 'section',
    className: 'container',
    events: {
        'submit form': 'onSubmit',
        'click form [type="checkbox"]': 'onCheck'
    },
    render: function () {
        var htmlTemplate = _.template($('#frm-login').html());

        this.$el.html(htmlTemplate);

        return this;
    },
    onSubmit: function (e) {
        e.preventDefault();

        var $form = this.$el.find('form');
        var $btnSubmit = $form.find(':submit');

        var hostName = $form.find('[name="hostname"]').val();
        var username = $form.find('[name="username"]').val();
        var password = $form.find('[name="password"]').val();

        hostName = $.trim(hostName);
        username = $.trim(username);
        password = $.trim(password);

        if (!hostName || !username || !password) {
            alert('Fill the form');

            return;
        }

        $btnSubmit.attr('disabled', true);

        var campus = new Chamilo.Model.Campus({
            url: hostName,
            username: username
        });

        var checkIsValid = campus.checkIsValid(password);

        checkIsValid.done(function (response) {
            campus.set('apiKey', response.apiKey);

            var saveCampus = campus.save();

            saveCampus.done(function () {
                Backbone.history.navigate('update', {
                    trigger: true
                });
            });

            saveCampus.fail(function () {
                console.log('Error when trying save the account');
            });
        });

        checkIsValid.fail(function () {
            console.log('Error when trying login');

            $btnSubmit.removeAttr('disabled');
        });
    },
    onCheck: function (e) {
        var $form = this.$el.find('form');
        var $txtPassword = $form.find('[name="password"]');

        $txtPassword.attr('type', e.target.checked ? 'text' : 'password');
    }
});

Chamilo.View.FrmLoader = Backbone.View.extend({
    tagName: 'section',
    template: _.template($('#frm-loader').html()),
    render: function (message) {
        var htmlTemplate = this.template({
            message: message
        });

        this.$el.html(htmlTemplate);

        return this;
    }
});

Chamilo.View.Frm = Backbone.View.extend({
    tagName: 'section',
    headerView: null,
    contentView: null,
    footerView: null,
    render: function () {
        this.$el.empty();

        this.$el.append(this.headerView.render().$el);
        this.$el.append(this.contentView.render().$el);

        if (this.footerView) {
            this.$el.append(this.footerView.render().$el);
        }

        return this;
    }
});

Chamilo.View.FrmHeader = Backbone.View.extend({
    tagName: 'nav',
    className: 'navbar navbar-inverse navbar-fixed-top',
    template: _.template($('#frm-header').html()),
    events: {
        'click .toggle-topbar a': 'onClick'
    },
    render: function () {
        this.$el.attr({
            'data-topbar': '',
            role: 'navigation'
        });

        var htmlTemplate = this.template();

        this.$el.html(htmlTemplate);

        return this;
    },
    onClick: function (e) {
        e.preventDefault();
    }
});

Chamilo.View.FrmInbox = Chamilo.View.Frm.extend();

Chamilo.View.FrmInboxContent = Backbone.View.extend({
    className: 'container',
    render: function () {
        this.$el.empty();

        this.collection.each(this.addMessage, this);

        return this;
    },
    addMessage: function (message) {
        var messageView = new Chamilo.View.FrmInboxContentMessage({
            model: message
        });

        this.$el.append(messageView.render().$el);

        return this;
    }
});

Chamilo.View.FrmInboxContentMessage = Backbone.View.extend({
    tagName: 'article',
    className: 'panel panel-default',
    template: _.template($('#frm-inbox-content-message').html()),
    render: function () {
        var messageData = _.extend({}, this.model.toJSON(), {cid: this.model.cid});

        var template = this.template(messageData);

        this.$el.html(template);

        return this;
    }
});

Chamilo.View.FrmFullMessage = Chamilo.View.Frm.extend({
    className: 'frm-full-message'
});

Chamilo.View.FrmFullMessageContent = Backbone.View.extend({
    className: 'container',
    template: _.template($('#frm-full-message-content').html()),
    render: function () {
        var htmlTemplate = this.template(this.model.toJSON());

        this.$el.html(htmlTemplate);

        return this;
    }
});

Chamilo.View.FrmFullMessageFooter = Backbone.View.extend({
    tagName: 'nav',
    className: 'navbar navbar-default navbar-fixed-bottom',
    previousButton: null,
    nextButton: null,
    template: _.template($('#frm-gull-message-footer').html()),
    render: function () {
        this.$el.attr({
            role: 'navigation'
        });

        var htmlTemplate = this.template();

        this.$el.html(htmlTemplate);

        if (this.previousButton) {
           this.$('.container').append(this.previousButton.render().$el);
        }

        if (this.nextButton) {
            this.$('.container').append(this.nextButton.render().$el);
        }

        return this;
    }
});

Chamilo.View.FrmFullMessageFooterButton = Backbone.View.extend({
    tagName: 'ul',
    events: {
        'click li a': 'onClick'
    },
    render: function () {
        var template = this.template({
            cid: this.model !== null ? this.model.cid : 0
        });

        this.$el.html(template);

        if (this.model === null) {
            this.$('li').addClass('disabled');
        }

        return this;
    },
    onClick: function (e) {
        if (this.model === null) {
            e.preventDefault();
        }
    }
});

Chamilo.View.FrmFullMessageFooterPrevious = Chamilo.View.FrmFullMessageFooterButton.extend({
    className: 'nav navbar-nav pull-left',
    template: _.template($('#frm-full-message-footer-left').html())
});

Chamilo.View.FrmFullMessageFooterNext = Chamilo.View.FrmFullMessageFooterButton.extend({
    className: 'nav navbar-nav pull-right',
    template: _.template($('#frm-full-message-footer-right').html())
});
