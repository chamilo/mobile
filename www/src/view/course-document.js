define([
    'backbone',
    'text!template/course-document.html'
], function (Backbone, viewTemplate) {
    function onError(error) {
        console.error(error);
    }

    var CourseDocumentView = Backbone.View.extend({
        tagName: 'div',
        className: 'media',
        template: _.template(viewTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        },
        events: {
            'click .btn-download': 'btnDownloadOnClick'
        },
        btnDownloadOnClick: function (e) {
            e.preventDefault();

            var filePath = this.model.get('path'),
                fileURL = this.model.get('url');

            if (this.model.get('type') !== 'file') {
                Backbone.history.navigate('#documents/' + this.model.get('id'), {
                    trigger: true
                });

                return;
            }

            var $pgb = this.$el.find('.progress'),
                $txtSuccess = this.$el.find('.text-success'),
                $txtDanger = this.$el.find('.text-danger');

            if (!$pgb.length) {
                return;
            }

            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                fileSystem.root.getDirectory('chamilo-lms', {create: true}, function (directory) {
                    $txtDanger.addClass('hidden')
                    $txtSuccess.addClass('hidden')

                    $pgb
                        .removeClass('hidden')
                        .removeAttr('aria-hidden')
                        .find('.progress-bar')
                        .attr('aria-valuenow', 0)
                        .css('width', 0 + '%')
                        .find('.sr-only')
                        .text(0 + '%')

                    var fileTransfer = new FileTransfer()
                    fileTransfer.onprogress = function (e) {
                        if (e.lengthComputable) {
                            var value = e.loaded / e.total * 100,
                                percentage = value.toFixed(2)

                            $pgb.find('.progress-bar')
                                .attr('aria-valuenow', percentage)
                                .css('width', percentage + '%')
                                .find('.sr-only')
                                .text(percentage + '%')

                            return
                        }

                        $pgb.find('.progress-bar')
                            .addClass('progress-bar-striped active')
                            .attr('aria-valuenow', 100)
                            .css('width', 100 + '%')
                            .find('.sr-only')
                            .text(100 + '%')
                    }
                    fileTransfer.download(
                        encodeURI(fileURL),
                        directory.toURL() + filePath,
                        function () {
                            $pgb.addClass('hidden')

                            $txtSuccess.removeClass('hidden')
                        },
                        function () {
                            $pgb.addClass('hidden')

                            $txtDanger.removeClass('hidden')
                        },
                        true
                    )
                }, onError);
            }, onError);
        }
    });

    return CourseDocumentView;
});
