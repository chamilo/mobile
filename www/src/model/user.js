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
                success: null,
                error: null
            }, options);

            $
                .ajax({
                    type: 'post',
                    data: {action: 'user_profile'},
                    success: function (response) {
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
                    }
                });
        }
    });

    return UserModel;
});
