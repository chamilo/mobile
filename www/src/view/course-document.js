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
                        .attr('aria-valuenow', 0)
                        .css('width', 0 + '%')
                        .find('.sr-only')
                        .text(0 + '%');

                    var xhrRequest = new XMLHttpRequest();
                    xhrRequest.open('GET', fileURL, true);
                    xhrRequest.responseType = 'blob';
                    xhrRequest.onload = function () {
                        if (this.status != 200) {
                            $pgb.addClass('hidden');
                            $txtDanger.removeClass('hidden');

                            return;
                        }

                        var blob = xhrRequest.response;

                        if (!blob) {
                            $pgb.addClass('hidden');
                            $txtDanger.removeClass('hidden');
                        }

                        saveFile(blob);
                    };
                    xhrRequest.onprogress = function (e) {
                        var value = e.lengthComputable ? (e.loaded / e.total * 100) : 100;
                        var percentage = value.toFixed(2);

                        $pgb.find('.progress-bar')
                            .attr('aria-valuenow', percentage)
                            .css('width', percentage + '%')
                            .find('.sr-only')
                            .text(percentage + '%');
                    };
                    xhrRequest.onerror = function () {
                        $pgb.addClass('hidden');
                        $txtDanger.removeClass('hidden');
                    };
                    xhrRequest.send();

                    function saveFile(blob) {
                        var fileNameParts = filePath.split('/').reverse();

                        directory.getFile(
                            fileNameParts[0],
                            {create: true, exclusive: true},
                            function (fileEntry) {
                                writeFile(fileEntry, blob)
                            },
                            function (e) {
                                if (e.code == 12) {
                                    $pgb.addClass('hidden');
                                    $txtSuccess.removeClass('hidden');
                                }
                            }
                        );
                    }

                    function writeFile(fileEntry, blob) {
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function () {
                                $pgb.find('.progress-bar')
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
                        });
                    }
                });
            });
        }
    });

    return CourseDocumentView;
});
