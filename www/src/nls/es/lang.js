define({
    appName: "Chamilo LMS Mobile",
    myChamilo: "Mi Chamilo LMS",
    myCourses: 'Mis cursos',
    domain: "Dominio",
    myAccount: "Mi cuenta",
    username: "Nombre de usuario",
    password: "Contraseña",
    signIn: "Ingresar",
    messages: "Mensajes",
    profile: "Perfil",
    signOut: "Salir",
    goToCourse: "Ir al curso",
    courseAgenda: "Agenda del curso",
    announcement: "Anuncio",
    courseAnnouncements: "Anuncios del curso",
    courseDescriptions: "Descripción del curso",
    courseDocuments: "Documentos del curso",
    allDay: "Todo el día",
    forum: "Foro",
    views: "Vistas",
    replies: "Respuestas",
    forumCategories: "Categorías de foro",
    numberOfThreads: "Número de temas",
    lastPost: "Última publicación",
    reply: "Responder",
    quote: "Citar",
    replyTo: function (title) {
        return "Responder a <cite>" + title + "</cite>";
    },
    title: "Título",
    text: "Texto",
    notifyMeByEmail: "Notificarme por correo electrónico",
    replyThisPost: "Responder esta publicación",
    thread: "Tema",
    replyThisThread: "Responder este tema",
    description: "Descripción",
    documents: "Documentos",
    learningPaths: "Lecciones",
    agenda: "Agenda",
    notebook: "Notas personales",
    announcements: "Anuncios",
    learningPathsCategories: "Categorías de lecciones",
    creationDate: function (date) {
        return "Fecha de creación: " + date;
    },
    updateDate: function (date) {
        return "Fecha de actualización: " + date;
    },
    courseNotebook: "Notas personales en el curso",
    inbox: "Bandeja de entrada",
    myProfile: "Mi perfil",
    phoneNumber: "Número de teléfono",
    signingOut: "Cerrando sessión",
    loading: "Cargando",
    noContentAvailable: "Contenido no disponible",
    downloadComplete: "Download completed",
    downloadFailed: "Download failed",
    sessions: "Sessiones de formación",
    fromDateUntilDate: function (from, until) {
        if (from && !until) {
            return "Desde " + from;
        }

        if (!from && until) {
            return "Hasta " + until;
        }

        return "Desde " + from + " hasta " + until;
    },
    downloadCompleted: "Descarga completada",
    downloadFailed: "Descarga fallida"
});
