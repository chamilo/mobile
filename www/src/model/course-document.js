define([
    'backbone'
], function (Backbone) {
    var CourseDocumentModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            type: '',
            title: '',
            path: '/',
            url: '',
            size: 0,
            icon: ''
        },
        updateIcon: function () {
            if (this.get('type') === 'file') {
                this.set('icon', 'default.svg');
                return;
            }

            if (this.get('path') === '/shared_folder') {
                this.set('icon', 'folder_users.svg');
                return;
            }

            if (this.get('path').indexOf('shared_folder_session_') >= 0) {
                this.set('icon', 'folder_users.svg');
                return;
            }

            switch (this.get('path')) {
                case '/audio':
                    this.set('icon', 'folder_audio.svg');
                    return;
                case '/flash':
                    this.set('icon', 'folder_flash.svg');
                    return;
                case '/images':
                    this.set('icon', 'folder_images.svg');
                    return;
                case '/video':
                    this.set('icon', 'folder_video.svg');
                    return;
                case '/images/gallery':
                    this.set('icon', 'folder_gallery.svg');
                    return;
                case '/chat_files':
                    this.set('icon', 'folder_chat.svg');
                    return;
                case '/learning_path':
                    this.set('icon', 'folder_learningpath.svg');
                    return;
            }

            this.set('icon', 'folder_document.svg');
            return;
        }
    });

    return CourseDocumentModel;
});
