define([
    'jquery',
    'underscore',
    'backbone',
    'text!template/login.html',
    'models/campus',
    'views/alert'
], function ($, _, Backbone, LoginTemplate, CampusModel, AlertView) {
    var LoginView = Backbone.View.extend({
        tagName: 'section',
        className: 'container',
        template: _.template(LoginTemplate),
        events: {
            'submit #frm-login': 'frmLoginOnSubmit',
            'click #chk-password': 'chkPasswordOnCheck'
        },
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        },
        frmLoginOnSubmit: function (e) {
            e.preventDefault();

            var self = this;

            var hostName = self.$('#txt-hostname').val().trim();
            var username = self.$('#txt-username').val().trim();
            var password = self.$('#txt-password').val().trim();

            if (!hostName) {
                var alertView = new AlertView({
                    model: {
                        type: 'warning',
                        message: window.lang.enterTheDomain
                    }
                });

                self.$('#div-alert').html(alertView.render().el);

                return;
            }

            if (!username) {
                var alertView = new AlertView({
                    model: {
                        type: 'warning',
                        message: window.lang.enterTheUsername
                    }
                });

                self.$('#div-alert').html(alertView.render().el);

                return;
            }

            if (!password) {
                var alertView = new AlertView({
                    model: {
                        type: 'warning',
                        message: window.lang.enterThePassword
                    }
                });

                self.$('#div-alert').html(alertView.render().el);

                return;
            }

            self.$('#btn-submit').prop('disabled', true);

            var checkingLogin = $.post(hostName + '/main/webservices/rest.php', {
                action: 'loginNewMessages',
                username: username,
                password: password
            });

            $.when(checkingLogin).done(function (response) {
                if (!response.status) {
                    var alertView = new AlertView({
                        model: {
                            type: 'danger',
                            message: window.lang.incorrectCredentials
                        }
                    });

                    self.$('#div-alert').html(alertView.render().el);
                    self.$('#btn-submit').prop('disabled', false);

                    return;
                }

                var campusModel = new CampusModel({
                    url: hostName,
                    username: username,
                    apiKey: response.apiKey
                });
                var savingCampus = campusModel.save();

                $.when(savingCampus).done(function () {
                    window.location.reload();
                });

                $.when(savingCampus).fail(function () {
                    var alertView = new AlertView({
                        model: {
                            type: 'danger',
                            message: "Account don't saved."
                        }
                    });

                    self.$('#div-alert').html(alertView.render().el);
                    self.$('#btn-submit').prop('disabled', false);
                });
            });

            $.when(checkingLogin).fail(function () {
                var alertView = new AlertView({
                    model: {
                        type: 'danger',
                        message: window.lang.noConnectionToServer
                    }
                });

                self.$('#div-alert').html(alertView.render().el);

                self.$('#btn-submit').prop('disabled', false);
            });
        },
        chkPasswordOnCheck: function (e) {
            var inputType = e.target.checked ? 'text' : 'password';

            this.$('#txt-password').attr('type', inputType);
        }
    });

    return LoginView;
});
