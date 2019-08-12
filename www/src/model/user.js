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
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'user_profile'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    self.set(response.data);

                    deferred.resolve();
                }
            });

            return deferred.promise();
        }
    });

    return UserModel;
});
