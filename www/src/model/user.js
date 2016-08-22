define([
    'backbone'
], function (Backbone) {
    var UserModel = Backbone.Model.extend({
        defaults: {
            pictureUri: '',
            fullName: '',
            username: '',
            officialCode: null,
            phone: null,
            extra: []
        },
        fetch: function (options) {
            var self = this;

            options = $.extend({
                campus: {
                    username: '',
                    url: '',
                    apiKey: ''
                },
                success: null,
                error: null
            }, options);

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                action: 'user_profile',
                username: options.campus.username,
                api_key: options.campus.apiKey
            }, function (response) {
                if (response.error) {
                    if (options.error) {
                        options.error(response.message);
                    }

                    return;
                }

                self.set(response.data);

                if (options.success) {
                    options.success();
                }
            });
        }
    });

    return UserModel;
});
