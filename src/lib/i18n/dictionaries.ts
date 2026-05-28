export type Language = 'es' | 'en';

export const dictionaries = {
  es: {
    // Navbar
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar Sesión',
    'nav.login': 'Iniciar Sesión',
    'nav.new_ticket': 'Nuevo Ticket',
    'nav.tickets': 'Tickets',
    'nav.users': 'Usuarios',
    
    // Home & SubmitForm
    'home.title': 'Nueva Solicitud',
    'home.subtitle': 'Describe tu situación o problema. Deja que nuestra IA lo organice.',
    'form.placeholder': 'Describe la situación o problema...',
    'form.project_prefix': 'Proyecto:',
    'form.submit_loading': 'Creando...',
    'form.submit': 'Crear Ticket ✨',
    'form.success': '¡Ticket creado con éxito! Puedes verlo en tu dashboard.',
    'form.error_generic': 'Ocurrió un error inesperado.',
    'form.error_min_length': 'Describe la solicitud con al menos 10 caracteres.',

    // Dashboard
    'dash.title': 'Bandeja de Tickets',
    'dash.subtitle_loading': 'Cargando tu historial...',
    'dash.subtitle': 'Gestiona y haz seguimiento a tus solicitudes de soporte.',
    'dash.search_placeholder': 'Buscar por número o palabra clave...',

    'auth.login_description': 'Ingresa tus credenciales para continuar',
    
    // Filters
    'filter.status.all': 'Todos los Estados',
    'filter.status.active': 'Solo Activos',
    'filter.status.open': 'Abierto',
    'filter.status.waiting': 'Esperando Cliente',
    'filter.status.closed': 'Finalizado',
    
    'filter.priority.all': 'Cualquier Prioridad',
    'filter.priority.critical': 'Crítica',
    'filter.priority.high': 'Alta',
    'filter.priority.medium': 'Media',
    'filter.priority.low': 'Baja',

    'filter.sort.newest': 'Más Recientes',
    'filter.sort.oldest': 'Más Antiguos',

    'filter.project.all': 'Todos los Proyectos',

    // Ticket Table
    'table.empty': 'No se encontraron tickets en esta sección.',
    'table.title': 'Lista de tickets',
    'table.num': 'Número',
    'table.req': 'Solicitud',
    'table.requester': 'Solicitante',
    'table.project': 'Proyecto',
    'table.priority': 'Prioridad',
    'table.status': 'Estado',
    'table.date': 'Fecha',
    'table.action': 'Acción',
    'table.view': 'Ver Detalle',

    // Ticket Details
    'ticket.client': 'Cliente',
    'ticket.details': 'DETALLES',
    'ticket.add_reply': 'Añadir una respuesta...',
    'ticket.comment_btn': 'Comentar',
    'ticket.details_title': 'Detalles de la Solicitud',
    'ticket.tech_tools': 'HERRAMIENTAS TÉCNICAS',
    'ticket.update_status': 'Actualizar Estado',
    'ticket.ai_analysis': 'ANÁLISIS DE IA',
    'ticket.category': 'Categoría',
    'ticket.confidence': 'Confianza',
    'ticket.issues': 'Problemas Identificados',
    'ticket.actions': 'Acciones Sugeridas',
  },
  en: {
    // Navbar
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Profile',
    'nav.logout': 'Sign Out',
    'nav.login': 'Sign In',
    'nav.new_ticket': 'New Ticket',
    'nav.tickets': 'Tickets',
    'nav.users': 'Users',
    
    // Home & SubmitForm
    'home.title': 'New Request',
    'home.subtitle': 'Describe your situation or issue. Let our AI organize it.',
    'form.placeholder': 'Describe the situation or issue...',
    'form.project_prefix': 'Project:',
    'form.submit_loading': 'Creating...',
    'form.submit': 'Create Ticket ✨',
    'form.success': 'Ticket created successfully! You can view it on your dashboard.',
    'form.error_generic': 'An unexpected error occurred.',
    'form.error_min_length': 'Please describe the request with at least 10 characters.',

    // Dashboard
    'dash.title': 'Ticket Inbox',
    'dash.subtitle_loading': 'Loading your history...',
    'dash.subtitle': 'Manage and track your support requests.',
    'dash.search_placeholder': 'Search by number or keyword...',

    'auth.login_description': 'Enter your credentials to continue',
    
    // Filters
    'filter.status.all': 'All Statuses',
    'filter.status.active': 'Active Only',
    'filter.status.open': 'Open',
    'filter.status.waiting': 'Waiting on Client',
    'filter.status.closed': 'Closed',
    
    'filter.priority.all': 'Any Priority',
    'filter.priority.critical': 'Critical',
    'filter.priority.high': 'High',
    'filter.priority.medium': 'Medium',
    'filter.priority.low': 'Low',

    'filter.sort.newest': 'Newest',
    'filter.sort.oldest': 'Oldest',

    'filter.project.all': 'All Projects',

    // Ticket Table
    'table.empty': 'No tickets found in this section.',
    'table.title': 'Ticket List',
    'table.num': 'Number',
    'table.req': 'Request',
    'table.requester': 'Requester',
    'table.project': 'Project',
    'table.priority': 'Priority',
    'table.status': 'Status',
    'table.date': 'Date',
    'table.action': 'Action',
    'table.view': 'View Details',

    // Ticket Details
    'ticket.client': 'Client',
    'ticket.details': 'DETAILS',
    'ticket.add_reply': 'Add a reply...',
    'ticket.comment_btn': 'Comment',
    'ticket.details_title': 'Request Details',
    'ticket.tech_tools': 'TECH TOOLS',
    'ticket.update_status': 'Update Status',
    'ticket.ai_analysis': 'AI ANALYSIS',
    'ticket.category': 'Category',
    'ticket.confidence': 'Confidence',
    'ticket.issues': 'Identified Issues',
    'ticket.actions': 'Suggested Actions',
  }
};

export type DictionaryKey = keyof typeof dictionaries.es;
