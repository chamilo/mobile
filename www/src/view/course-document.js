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
                fileSystem.root.getDirectory('chamilo-lms', {create: true, exclusive: false}, function (directory) {
                    $txtDanger.addClass('hidden');
                    $txtSuccess.addClass('hidden');

                    $pgb
                        .removeClass('hidden')
                        .removeAttr('aria-hidden')
                        .find('.progress-bar')
                        .attr('aria-valuenow', 100)
                        .css('width', '100%')
                        .find('.sr-only')
                        .text('Waiting');

                    var fileNameParts = filePath.split('/').reverse();

                    var xhrRequest = new XMLHttpRequest();
                    xhrRequest.open('GET', fileURL, true);
                    xhrRequest.responseType = 'blob';
                    xhrRequest.onload = function () {
                        if (this.status != 200) {
                            alert('Download failed');

                            return;
                        }

                        var blob = xhrRequest.response;

                        if (!blob) {
                            alert('Not response');
                        }

                        directory.getFile(fileNameParts[0], { create: true, exclusive: true}, function (fileEntry) {
                            fileEntry.createWriter(function (fileWriter) {
                                fileWriter.onwriteend = function () {
                                    $pgb.find('.progress-bar')
                                        .addClass('progress-bar-striped active')
                                        .attr('aria-valuenow', 100)
                                        .css('width', 100 + '%')
                                        .find('.sr-only')
                                        .text(100 + '%');

                                    $pgb.addClass('hidden');
                                    $txtSuccess.removeClass('hidden');
                                };
                                fileWriter.onerror = function () {
                                    $pgb.addClass('hidden');
                                    $txtDanger.removeClass('hidden');
                                };

                                fileWriter.write(blob)
                            })
                        }, function (e) {
                            if (e.code == 12) {
                                $pgb.addClass('hidden');
                                $txtSuccess.removeClass('hidden');
                            }

                            console.log('getFile error', e);
                        })
                    };
                    xhrRequest.send();
                }, onError);
            }, onError);
        }
    });

    return CourseDocumentView;
});
