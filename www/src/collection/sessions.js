define([
    'backbone',
    'model/sessioncategory'
], function (Backbone, SessionCategoryModel) {
    var SessionCollection = Backbone.Collection.extend({
        model: SessionCategoryModel,
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'user_sessions'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data
                        .forEach(function (sessionCategoryData) {
                            var sessionCategory = new SessionCategoryModel(sessionCategoryData);
                            sessionCategory.id = sessionCategoryData.id || 0;

                            self.add(sessionCategory);
                        });

                    deferred.resolve();
                },
                error: function () {
                    deferred.reject();
                }
            });

            return deferred.promise();
        }
    });

    return SessionCollection;
});
