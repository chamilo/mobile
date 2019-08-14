define([
    'backbone',
    'text!template/login.html',
    'model/campus'
], function (Backbone, loginTemplate, CampusModel) {
    var LoginView = Backbone.View.extend({
        tagName: 'div',
        id: 'page-login',
        template: _.template(loginTemplate),
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        },
        events: {
            'submit #frm-login': 'frmLoginOnSubmit',
            'click #chk-password': 'chkPasswordOnClick'
        },
        frmLoginOnSubmit: function (e) {
            e.preventDefault();

            var frm = this.$el.find('form'),
                txtHostName = this.$el.find('#txt-hostname'),
                txtUsername = this.$el.find('#txt-username'),
                txtPassword = this.$el.find('#txt-password');

            frm.children().prop('disabled', true);

            var campusDetails = {
                url: txtHostName.val().trim(),
                username: txtUsername.val().trim()
            };

            $
                .post(campusDetails.url + '/main/webservices/api/v2.php', {
                    'action': 'authenticate',
                    'username': campusDetails.username,
                    'password': txtPassword.val()
                })
                .done(function (response) {
                    if (response.error) {
                        alert(response.message);

                        frm.children().prop('disabled', false);

                        return;
                    }

                    campusDetails.apiKey = response.data.apiKey;
                    campusDetails.gcmSenderId = response.data.gcmSenderId;

                    var campus = new CampusModel();
                    campus
                        .save(campusDetails, {
                            success: function () {
                                window.location.reload();
                            },
                            error: function (e) {
                                alert(e);

                                frm.children().prop('disabled', false);
                            }
                        });
                })
                .fail(function () {
                    frm.children().prop('disabled', false);
                });
        },
        chkPasswordOnClick: function (e) {
            var inputType = e.target.checked ? 'text' : 'password';

            this.$('#txt-password').attr('type', inputType);
        }
    });

    return LoginView;
});
