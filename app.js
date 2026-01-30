// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    MAX_NOTIFICATION_DISPLAY: 5,
    NOTIFICATION_DURATION: 5000,
    API_BASE_URL: 'http://localhost:3000/api'
};
let isAdmin = false;
// ============================================
// UTILIDADES
// ============================================
const Utils = {
    // Sanitizar entrada de texto para prevenir XSS
    sanitize(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Escapar HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // Validar fecha
    validateDate(dateString) {
        if (!dateString) return true; // Fecha opcional
        const date = new Date(dateString);
        if (!(date instanceof Date) || isNaN(date)) return false;
        
        // Validar rango: 1890-2100
        const year = date.getFullYear();
        return year >= 1890 && year <= 2100;
    },

    // Formatear fecha para mostrar
    formatDate(dateString) {
        if (!dateString) return 'Sin fecha';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        } catch (e) {
            return dateString;
        }
    },

    // Debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Try-catch wrapper para operaciones críticas
    safeExecute(fn, errorMessage = 'Error al ejecutar operación') {
        try {
            return fn();
        } catch (error) {
            console.error(errorMessage, error);
            NotificationSystem.show(errorMessage, 'error');
            return null;
        }
    }
};

// ============================================
// SISTEMA DE NOTIFICACIONES
// ============================================
const NotificationSystem = {
    container: null,

    init() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        if (!this.container) this.init();

        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const icon = document.createElement('i');
        icon.className = `bi ${icons[type] || icons.info}`;
        icon.style.marginRight = '8px';
        
        const text = document.createElement('span');
        text.textContent = message;
        
        notification.appendChild(icon);
        notification.appendChild(text);

        // Limitar número de notificaciones
        const existing = this.container.querySelectorAll('.notification');
        if (existing.length >= CONFIG.MAX_NOTIFICATION_DISPLAY) {
            existing[0].remove();
        }

        this.container.appendChild(notification);

        // Auto-remover después de la duración
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Click para cerrar
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        });
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error', 7000);
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

// ============================================
// SISTEMA DE CONFIRMACIÓN (Bootstrap Modal)
// ============================================
const ConfirmSystem = {
    modal: null,
    bootstrapModal: null,
    title: null,
    message: null,
    yesBtn: null,
    noBtn: null,
    resolve: null,

    init() {
        this.modal = document.getElementById('confirmModal');
        this.title = document.getElementById('confirmTitle');
        this.message = document.getElementById('confirmMessage');
        this.yesBtn = document.getElementById('confirmYes');
        this.noBtn = document.getElementById('confirmNo');

        // Inicializar Bootstrap Modal
        if (this.modal && typeof bootstrap !== 'undefined') {
            this.bootstrapModal = new bootstrap.Modal(this.modal);
        }

        if (this.yesBtn && this.noBtn) {
            this.yesBtn.addEventListener('click', () => this.confirm(true));
            this.noBtn.addEventListener('click', () => this.confirm(false));
        }

        // Cerrar cuando se cierra el modal de Bootstrap
        if (this.modal) {
            this.modal.addEventListener('hidden.bs.modal', () => {
                if (this.resolve) {
                    this.resolve(false);
                    this.resolve = null;
                }
            });
        }
    },

    show(title, message) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            if (this.title) this.title.textContent = title;
            if (this.message) this.message.textContent = message;
            if (this.bootstrapModal) {
                this.bootstrapModal.show();
            } else if (this.modal) {
                // Fallback si Bootstrap no está disponible
                this.modal.style.display = 'block';
                this.modal.classList.add('show');
            }
        });
    },

    confirm(value) {
        if (this.bootstrapModal) {
            this.bootstrapModal.hide();
        } else if (this.modal) {
            this.modal.style.display = 'none';
            this.modal.classList.remove('show');
        }
        if (this.resolve) {
            this.resolve(value);
            this.resolve = null;
        }
    }
};

// ============================================
// API (comunicación con servidor / MongoDB)
// ============================================
const Api = {
    token: null,

    setToken(token) {
        this.token = token;
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        const opts = { method, headers };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(CONFIG.API_BASE_URL + path, opts);
        const text = await res.text();
        const data = text ? (() => { try { return JSON.parse(text); } catch (e) { return null; } })() : null;
        if (!res.ok) {
            const err = new Error(data && data.error ? data.error : 'Error en la petición');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    },

    async getUsers() {
        const list = await this.request('GET', '/users');
        return Array.isArray(list) ? list : [];
    },

    async getProjects() {
        const list = await this.request('GET', '/projects');
        return Array.isArray(list) ? list : [];
    },

    async addProject(project) {
        const res = await this.request('POST', '/projects', { name: project.name, description: project.description });
        return res && res._id ? res._id : null;
    },

    async updateProject(id, project) {
        await this.request('PUT', '/projects/' + id, { name: project.name, description: project.description });
        return true;
    },

    async deleteProject(id) {
        await this.request('DELETE', '/projects/' + id);
        return true;
    },

    async getTasks() {
        const list = await this.request('GET', '/tasks');
        return Array.isArray(list) ? list : [];
    },

    async addTask(task) {
        const res = await this.request('POST', '/tasks', task);
        return res && res._id ? res._id : null;
    },

    async updateTask(id, task) {
        await this.request('PUT', '/tasks/' + id, task);
        return true;
    },

    async deleteTask(id) {
        await this.request('DELETE', '/tasks/' + id);
        return true;
    },

    async getComments(taskId = null) {
        const path = taskId != null ? '/comments?taskId=' + taskId : '/comments';
        const list = await this.request('GET', path);
        return Array.isArray(list) ? list : [];
    },

    async addComment(comment) {
        await this.request('POST', '/comments', comment);
    },

    async getHistory(taskId = null) {
        const path = taskId != null ? '/history?taskId=' + taskId : '/history';
        const list = await this.request('GET', path);
        return Array.isArray(list) ? list : [];
    },

    async addHistory(entry) {
        await this.request('POST', '/history', entry);
    },

    async getNotifications() {
        const list = await this.request('GET', '/notifications');
        return Array.isArray(list) ? list : [];
    },

    async addNotification(notification) {
        await this.request('POST', '/notifications', notification);
    },

    async markNotificationsRead() {
        await this.request('PATCH', '/notifications/read-all');
    },

    async exportAll() {
        return await this.request('GET', '/backup');
    },

    async importAll(data) {
        await this.request('POST', '/restore', data);
        return true;
    }
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
const AppState = {
    currentUser: null,
    selectedTaskId: null,
    selectedProjectId: null,
    sortColumn: null,
    sortDirection: 'asc'
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================
const Validation = {
    validateTask(task) {
        const errors = [];
        if (!task.title || task.title.trim().length === 0) {
            errors.push('El título es requerido');
        }
        if (task.title && task.title.length > 200) {
            errors.push('El título no puede exceder 200 caracteres');
        }
        if (task.dueDate && !Utils.validateDate(task.dueDate)) {
            errors.push('La fecha de vencimiento debe estar entre 1890 y 2100');
        }
        if (task.estimatedHours && (task.estimatedHours < 0 || task.estimatedHours > 10000)) {
            errors.push('Las horas estimadas deben estar entre 0 y 10000');
        }
        return errors;
    },

    validateProject(project) {
        const errors = [];
        if (!project.name || project.name.trim().length === 0) {
            errors.push('El nombre es requerido');
        }
        if (project.name && project.name.length > 200) {
            errors.push('El nombre no puede exceder 200 caracteres');
        }
        return errors;
    }
};

// ============================================
// FUNCIONES DE LOGIN/LOGOUT
// ============================================
function updateUIAfterLogin(username, role = null) {
    const profileDropdown = document.getElementById('profileDropdown');
    const currentUserSpan = document.getElementById('currentUser');
    const registerItem = document.getElementById('registerUserItem');

    if (profileDropdown) {
        profileDropdown.style.display = 'block';
        // Inicializar dropdown: el menú se abre al picar la foto/icono del perfil (profileMenu)
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu && typeof bootstrap !== 'undefined') {
            new bootstrap.Dropdown(profileMenu);
        }
    }
    if (currentUserSpan) {
        currentUserSpan.textContent = username;
    }

    isAdmin = role ? role === 'admin' : (username.toLowerCase() === 'admin');
    if (registerItem) {
        registerItem.style.display = isAdmin ? 'block' : 'none';
    }
}

async function login() {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const username = params.get('user');
    const role = params.get('role') || 'user';

    if (!token || !username) {
        window.location.href = 'login.html';
        return false;
    }

    Api.setToken(token);
    AppState.currentUser = { username, role };
    updateUIAfterLogin(username, role);
    window.history.replaceState({}, document.title, window.location.pathname);

    await loadTasks();
    await updateStats();
    NotificationSystem.success(`Bienvenido, ${username}`);
    return true;
}

function logout() {
    AppState.currentUser = null;
    AppState.selectedTaskId = null;
    AppState.selectedProjectId = null;
    Api.setToken(null);
    clearTaskForm();
    NotificationSystem.success('Sesión cerrada');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 800);
}

async function registerNewUser() {
    if (!isAdmin) {
        NotificationSystem.error('Solo el admin puede registrar usuarios');
        return;
    }

    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;

    if (!newUsername || !newPassword || newPassword !== newPasswordConfirm) {
        NotificationSystem.error('Datos inválidos o contraseñas no coinciden');
        return;
    }

    if (newUsername.length < 3 || newPassword.length < 4) {
        NotificationSystem.error('El nombre de usuario debe tener al menos 3 caracteres y la contraseña al menos 4');
        return;
    }

    try {
        await Api.request('POST', '/users', { username: newUsername, password: newPassword, role: 'user' });
        NotificationSystem.success(`Usuario ${newUsername} registrado exitosamente`);
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerUserModal'));
        if (modal) modal.hide();

        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('newPasswordConfirm').value = '';

        await loadUsers();
    } catch (err) {
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al registrar el usuario');
    }
}

// ============================================
// NAVEGACIÓN DE PESTAÑAS
// ============================================
function showTab(tabName) {
    // Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones de pestañas
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activar contenido de pestaña
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Activar botón correspondiente
    document.querySelectorAll('.nav-link').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    if (tabName === 'tasks') {
        loadTasks();
    } else if (tabName === 'projects') {
        loadProjectsTable();
    }
}

// ============================================
// CARGA DE DATOS EN SELECTS
// ============================================
async function loadUsers() {
    try {
        const users = await Api.getUsers();
        const select = document.getElementById('taskAssigned');
        if (!select) return;

        select.innerHTML = '<option value="">Sin asignar</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = Utils.escapeHtml(user.username);
            select.appendChild(option);
        });
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar usuarios');
    }
}

async function loadProjects() {
    try {
        const projects = await Api.getProjects();
        const select = document.getElementById('taskProject');
        const searchSelect = document.getElementById('searchProject');

        if (select) {
            select.innerHTML = '';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project._id;
                option.textContent = Utils.escapeHtml(project.name);
                select.appendChild(option);
            });
        }

        if (searchSelect) {
        searchSelect.innerHTML = '<option value="">Todos</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = Utils.escapeHtml(project.name);
            searchSelect.appendChild(option);
        });
        }
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar proyectos');
    }
}

// ============================================
// GESTIÓN DE TAREAS
// ============================================
async function addTask() {
    if (!AppState.currentUser) {
        NotificationSystem.warning('Debes iniciar sesión');
        return;
    }

    const title = Utils.sanitize(document.getElementById('taskTitle').value.trim());
    const task = {
        title: title,
        description: Utils.sanitize(document.getElementById('taskDescription').value.trim()),
        status: document.getElementById('taskStatus').value || 'Pendiente',
        priority: document.getElementById('taskPriority').value || 'Media',
        projectId: document.getElementById('taskProject').value || null,
        assignedTo: document.getElementById('taskAssigned').value || '',
        dueDate: document.getElementById('taskDueDate').value || '',
        estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
        actualHours: 0
    };

    const errors = Validation.validateTask(task);
    if (errors.length > 0) {
        NotificationSystem.error(errors.join(', '));
        return;
    }

    try {
        const taskId = await Api.addTask(task);
        if (!taskId) {
            NotificationSystem.error('Error al agregar la tarea');
            return;
        }

        await Api.addHistory({
            taskId: taskId,
            action: 'CREATED',
            field: 'title',
            oldValue: '',
            newValue: task.title
        });

        if (task.assignedTo) {
            await Api.addNotification({
                user: task.assignedTo,
                message: 'Nueva tarea asignada: ' + task.title,
                type: 'task_assigned'
            });
        }

        await loadTasks();
        clearTaskForm();
        await updateStats();
        NotificationSystem.success('Tarea agregada correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al agregar tarea');
    }
}

async function updateTask() {
    if (!AppState.selectedTaskId) {
        NotificationSystem.warning('Selecciona una tarea de la tabla');
        return;
    }

    try {
        const tasks = await Api.getTasks();
        const oldTask = tasks.find(t => t._id === AppState.selectedTaskId);
        if (!oldTask) {
            NotificationSystem.error('Tarea no encontrada');
            return;
        }

        const title = Utils.sanitize(document.getElementById('taskTitle').value.trim());
        const task = {
            title: title,
            description: Utils.sanitize(document.getElementById('taskDescription').value.trim()),
            status: document.getElementById('taskStatus').value || 'Pendiente',
            priority: document.getElementById('taskPriority').value || 'Media',
            projectId: document.getElementById('taskProject').value || null,
            assignedTo: document.getElementById('taskAssigned').value || '',
            dueDate: document.getElementById('taskDueDate').value || '',
            estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
            actualHours: oldTask.actualHours || 0,
            createdAt: oldTask.createdAt
        };

        const errors = Validation.validateTask(task);
        if (errors.length > 0) {
            NotificationSystem.error(errors.join(', '));
            return;
        }

        if (oldTask.status !== task.status) {
            await Api.addHistory({
                taskId: AppState.selectedTaskId,
                action: 'STATUS_CHANGED',
                field: 'status',
                oldValue: oldTask.status,
                newValue: task.status
            });
        }

        if (oldTask.title !== task.title) {
            await Api.addHistory({
                taskId: AppState.selectedTaskId,
                action: 'TITLE_CHANGED',
                field: 'title',
                oldValue: oldTask.title,
                newValue: task.title
            });
        }

        await Api.updateTask(AppState.selectedTaskId, task);

        if (task.assignedTo) {
            await Api.addNotification({
                user: task.assignedTo,
                message: 'Tarea actualizada: ' + task.title,
                type: 'task_updated'
            });
        }

        await loadTasks();
        clearTaskForm();
        await updateStats();
        NotificationSystem.success('Tarea actualizada correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al actualizar tarea');
    }
}

async function deleteTask() {
    if (!AppState.selectedTaskId) {
        NotificationSystem.warning('Selecciona una tarea de la tabla');
        return;
    }

    try {
        const tasks = await Api.getTasks();
        const task = tasks.find(t => t._id === AppState.selectedTaskId);
        if (!task) {
            NotificationSystem.error('Tarea no encontrada');
            return;
        }

        const confirmed = await ConfirmSystem.show('Confirmar Eliminación',
            `¿Estás seguro de eliminar la tarea "${task.title}"?`);

        if (!confirmed) return;

        await Api.addHistory({
            taskId: AppState.selectedTaskId,
            action: 'DELETED',
            field: 'title',
            oldValue: task.title,
            newValue: ''
        });

        await Api.deleteTask(AppState.selectedTaskId);

        await loadTasks();
        clearTaskForm();
        await updateStats();
        NotificationSystem.success('Tarea eliminada correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al eliminar tarea');
    }
}

function clearTaskForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskStatus').selectedIndex = 0;
    document.getElementById('taskPriority').selectedIndex = 1;
    document.getElementById('taskProject').selectedIndex = 0;
    document.getElementById('taskAssigned').selectedIndex = 0;
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskHours').value = '';
    AppState.selectedTaskId = null;
}

async function loadTasks() {
    try {
        const [tasks, projects, users] = await Promise.all([Api.getTasks(), Api.getProjects(), Api.getUsers()]);
        const tbody = document.getElementById('tasksTableBody');

        if (!tbody) return;

        let sortedTasks = [...tasks];
        if (AppState.sortColumn) {
            sortedTasks.sort((a, b) => {
                let aVal = a[AppState.sortColumn];
                let bVal = b[AppState.sortColumn];

                if (aVal == null) aVal = '';
                if (bVal == null) bVal = '';

                if (AppState.sortColumn === '_id') {
                    const comparison = String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
                    return AppState.sortDirection === 'asc' ? comparison : -comparison;
                }

                const comparison = String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
                return AppState.sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        tbody.innerHTML = '';

        sortedTasks.forEach(task => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-label', `Seleccionar tarea ${task._id}: ${task.title}`);

            row.addEventListener('click', () => selectTask(task._id));
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectTask(task._id);
                }
            });

            const project = projects.find(p => p._id === task.projectId);
            const user = users.find(u => u.username === task.assignedTo);

            const statusClass = `status-${(task.status || 'Pendiente').toLowerCase().replace(/\s+/g, '-')}`;
            const priorityClass = `priority-${(task.priority || 'Media').toLowerCase()}`;

            row.innerHTML = `
            <td>${task._id}</td>
            <td>${Utils.escapeHtml(task.title)}</td>
            <td><span class="status-badge ${statusClass}">${Utils.escapeHtml(task.status || 'Pendiente')}</span></td>
            <td><span class="priority-badge ${priorityClass}">${Utils.escapeHtml(task.priority || 'Media')}</span></td>
            <td>${Utils.escapeHtml(project ? project.name : 'Sin proyecto')}</td>
            <td>${Utils.escapeHtml(user ? user.username : (task.assignedTo || 'Sin asignar'))}</td>
            <td>${Utils.formatDate(task.dueDate)}</td>
        `;

            tbody.appendChild(row);
        });

        setupTableSorting();
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar tareas');
    }
}

function setupTableSorting() {
    const headers = document.querySelectorAll('#tasksTable thead th.sortable');
    headers.forEach((header) => {
        const column = header.getAttribute('data-column');
        if (!column) return;

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-label', `Ordenar por ${header.textContent.trim()}`);

        // Remover clases de ordenamiento previas de todos los headers
        headers.forEach(h => {
            h.classList.remove('asc', 'desc');
        });

        // Agregar clase de ordenamiento actual
        if (AppState.sortColumn === column) {
            header.classList.add(AppState.sortDirection);
        }

        header.addEventListener('click', () => {
            // Remover clases de todos los headers
            headers.forEach(h => {
                h.classList.remove('asc', 'desc');
            });

            if (AppState.sortColumn === column) {
                AppState.sortDirection = AppState.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortColumn = column;
                AppState.sortDirection = 'asc';
            }
            
            // Agregar clase al header activo
            header.classList.add(AppState.sortDirection);
            
            loadTasks();
        });

        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });
}

async function selectTask(id) {
    AppState.selectedTaskId = id;
    try {
        const tasks = await Api.getTasks();
        const task = tasks.find(t => t._id === id);
        if (!task) return;

    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    
    const statusSelect = document.getElementById('taskStatus');
    for (let i = 0; i < statusSelect.options.length; i++) {
        if (statusSelect.options[i].value === task.status) {
            statusSelect.selectedIndex = i;
            break;
        }
    }

    const prioritySelect = document.getElementById('taskPriority');
    for (let i = 0; i < prioritySelect.options.length; i++) {
        if (prioritySelect.options[i].value === task.priority) {
            prioritySelect.selectedIndex = i;
            break;
        }
    }

    const projectSelect = document.getElementById('taskProject');
    for (let i = 0; i < projectSelect.options.length; i++) {
        if (projectSelect.options[i].value === task.projectId) {
            projectSelect.selectedIndex = i;
            break;
        }
    }

    const assignedSelect = document.getElementById('taskAssigned');
    for (let i = 0; i < assignedSelect.options.length; i++) {
        if (assignedSelect.options[i].value === task.assignedTo) {
            assignedSelect.selectedIndex = i;
            break;
        }
    }

    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskHours').value = task.estimatedHours || '';
    } catch (err) {
        console.error(err);
    }
}

async function updateStats() {
    try {
        const tasks = await Api.getTasks();
        let total = tasks.length;
        let completed = 0;
        let pending = 0;
        let highPriority = 0;
        let overdue = 0;

        tasks.forEach(task => {
            if (task.status === 'Completada') {
                completed++;
            } else {
                pending++;
            }

            if (task.priority === 'Alta' || task.priority === 'Crítica') {
                highPriority++;
            }

            if (task.dueDate && task.status !== 'Completada') {
                const due = new Date(task.dueDate);
                const now = new Date();
                if (due < now) {
                    overdue++;
                }
            }
        });

        const statsText = document.getElementById('statsText');
        if (statsText) {
            statsText.textContent =
                `Total: ${total} | Completadas: ${completed} | Pendientes: ${pending} | Alta Prioridad: ${highPriority} | Vencidas: ${overdue}`;
        }
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// GESTIÓN DE PROYECTOS
// ============================================
async function addProject() {
    const name = Utils.sanitize(document.getElementById('projectName').value.trim());
    const project = {
        name: name,
        description: Utils.sanitize(document.getElementById('projectDescription').value.trim())
    };

    const errors = Validation.validateProject(project);
    if (errors.length > 0) {
        NotificationSystem.error(errors.join(', '));
        return;
    }

    try {
        const projectId = await Api.addProject(project);
        if (!projectId) {
            NotificationSystem.error('Error al agregar el proyecto');
            return;
        }

        await loadProjects();
        await loadProjectsTable();
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        NotificationSystem.success('Proyecto agregado correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al agregar proyecto');
    }
}

async function updateProject() {
    if (!AppState.selectedProjectId) {
        NotificationSystem.warning('Selecciona un proyecto de la tabla');
        return;
    }

    try {
        const name = Utils.sanitize(document.getElementById('projectName').value.trim());
        const projects = await Api.getProjects();
        const project = projects.find(p => p._id === AppState.selectedProjectId);
        if (!project) {
            NotificationSystem.error('Proyecto no encontrado');
            return;
        }

        const updatedProject = {
            name: name,
            description: Utils.sanitize(document.getElementById('projectDescription').value.trim())
        };

        const errors = Validation.validateProject(updatedProject);
        if (errors.length > 0) {
            NotificationSystem.error(errors.join(', '));
            return;
        }

        await Api.updateProject(AppState.selectedProjectId, updatedProject);

        await loadProjects();
        await loadProjectsTable();
        NotificationSystem.success('Proyecto actualizado correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al actualizar proyecto');
    }
}

async function deleteProject() {
    if (!AppState.selectedProjectId) {
        NotificationSystem.warning('Selecciona un proyecto de la tabla');
        return;
    }

    try {
        const projects = await Api.getProjects();
        const project = projects.find(p => p._id === AppState.selectedProjectId);
        if (!project) {
            NotificationSystem.error('Proyecto no encontrado');
            return;
        }

        const confirmed = await ConfirmSystem.show('Confirmar Eliminación',
            `¿Estás seguro de eliminar el proyecto "${project.name}"?`);

        if (!confirmed) return;

        await Api.deleteProject(AppState.selectedProjectId);

        await loadProjects();
        await loadProjectsTable();
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        AppState.selectedProjectId = null;
        NotificationSystem.success('Proyecto eliminado correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al eliminar proyecto');
    }
}

async function loadProjectsTable() {
    try {
        const projects = await Api.getProjects();
        const tbody = document.getElementById('projectsTableBody');

        if (!tbody) return;

        tbody.innerHTML = '';

        projects.forEach(project => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-label', `Seleccionar proyecto ${project._id}: ${project.name}`);

            row.addEventListener('click', () => {
                AppState.selectedProjectId = project._id;
                document.getElementById('projectName').value = project.name;
                document.getElementById('projectDescription').value = project.description || '';
            });

            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    row.click();
                }
            });

            row.innerHTML = `
                <td>${project._id}</td>
                <td>${Utils.escapeHtml(project.name)}</td>
                <td>${Utils.escapeHtml(project.description || '')}</td>
            `;

            tbody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar proyectos');
    }
}

// ============================================
// COMENTARIOS
// ============================================
async function addComment() {
    if (!AppState.currentUser) {
        NotificationSystem.warning('Debes iniciar sesión');
        return;
    }

    const taskId = document.getElementById('commentTaskId').value.trim();
    const text = Utils.sanitize(document.getElementById('commentText').value.trim());

    if (!taskId) {
        NotificationSystem.warning('ID de tarea requerido');
        return;
    }

    if (!text) {
        NotificationSystem.warning('El comentario no puede estar vacío');
        return;
    }

    try {
        await Api.addComment({
            taskId: taskId,
            content: text
        });

        document.getElementById('commentText').value = '';
        await loadComments();
        NotificationSystem.success('Comentario agregado correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error(err.data && err.data.error ? err.data.error : 'Error al agregar comentario');
    }
}

async function loadComments() {
    try {
        const taskId = document.getElementById('commentTaskId').value.trim();
        const commentsArea = document.getElementById('commentsArea');
        if (!commentsArea) return;

        if (!taskId) {
            commentsArea.value = 'Ingresa un ID de tarea';
            return;
        }

        const comments = await Api.getComments(taskId);

        let text = `=== COMENTARIOS TAREA #${taskId} ===\n\n`;

        if (comments.length === 0) {
            text += 'No hay comentarios\n';
        } else {
            comments.forEach(comment => {
                const date = new Date(comment.createdAt).toLocaleString('es-ES');
                text += `[${date}] ${comment.user || 'Usuario'}: ${comment.content}\n---\n`;
            });
        }

        commentsArea.value = text;
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar comentarios');
    }
}

// ============================================
// HISTORIAL
// ============================================
async function loadHistory() {
    try {
        const taskId = document.getElementById('historyTaskId').value.trim();
        const historyArea = document.getElementById('historyArea');
        if (!historyArea) return;

        if (!taskId) {
            historyArea.value = 'Ingresa un ID de tarea';
            return;
        }

        const history = await Api.getHistory(taskId);

        let text = `=== HISTORIAL TAREA #${taskId} ===\n\n`;

        if (history.length === 0) {
            text += 'No hay historial\n';
        } else {
            history.forEach(entry => {
                const date = new Date(entry.createdAt).toLocaleString('es-ES');
                text += `${date} - ${entry.action}\n`;
                text += `  Usuario: ${entry.user || 'Desconocido'}\n`;
                text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
                text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
            });
        }

        historyArea.value = text;
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar historial');
    }
}

async function loadAllHistory() {
    try {
        const history = await Api.getHistory();
        const historyArea = document.getElementById('historyArea');
        if (!historyArea) return;

        let text = '=== HISTORIAL COMPLETO ===\n\n';

        if (history.length === 0) {
            text += 'No hay historial\n';
        } else {
            history.slice(-100).reverse().forEach(entry => {
                const date = new Date(entry.createdAt).toLocaleString('es-ES');
                text += `Tarea #${entry.taskId} - ${entry.action} - ${date}\n`;
                text += `  Usuario: ${entry.user || 'Desconocido'}\n`;
                text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
                text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
            });
        }

        historyArea.value = text;
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar historial completo');
    }
}

// ============================================
// NOTIFICACIONES
// ============================================
async function loadNotifications() {
    if (!AppState.currentUser) return;

    try {
        const notifications = await Api.getNotifications();
        const unread = notifications.filter(n => !n.read);
        const notificationsArea = document.getElementById('notificationsArea');
        if (!notificationsArea) return;

        let text = '=== NOTIFICACIONES ===\n\n';

        if (unread.length === 0) {
            text += 'No hay notificaciones nuevas\n';
        } else {
            unread.forEach(notif => {
                const date = new Date(notif.createdAt).toLocaleString('es-ES');
                text += `• [${notif.type}] ${notif.message} (${date})\n`;
            });
        }

        notificationsArea.value = text;
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al cargar notificaciones');
    }
}

async function markNotificationsRead() {
    if (!AppState.currentUser) return;

    try {
        await Api.markNotificationsRead();
        await loadNotifications();
        NotificationSystem.success('Notificaciones marcadas como leídas');
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al marcar notificaciones');
    }
}

// ============================================
// BÚSQUEDA CON DEBOUNCE
// ============================================
const debouncedSearch = Utils.debounce(() => {
    searchTasks();
}, CONFIG.DEBOUNCE_DELAY);

async function searchTasks() {
    try {
        const searchText = document.getElementById('searchText').value.toLowerCase().trim();
        const statusFilter = document.getElementById('searchStatus').value;
        const priorityFilter = document.getElementById('searchPriority').value;
        const projectFilter = document.getElementById('searchProject').value || '';

        const [tasks, projects] = await Promise.all([Api.getTasks(), Api.getProjects()]);
        const tbody = document.getElementById('searchTableBody');

        if (!tbody) return;

        tbody.innerHTML = '';

        const filtered = tasks.filter(task => {
            if (searchText && !task.title.toLowerCase().includes(searchText) &&
                !(task.description || '').toLowerCase().includes(searchText)) {
                return false;
            }
            if (statusFilter && task.status !== statusFilter) {
                return false;
            }
            if (priorityFilter && task.priority !== priorityFilter) {
                return false;
            }
            if (projectFilter && task.projectId !== projectFilter) {
                return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align:center;">No se encontraron tareas</td>';
            tbody.appendChild(row);
            return;
        }

        filtered.forEach(task => {
            const row = document.createElement('tr');
            const project = projects.find(p => p._id === task.projectId);

            row.innerHTML = `
                <td>${task._id}</td>
                <td>${Utils.escapeHtml(task.title)}</td>
                <td>${Utils.escapeHtml(task.status || 'Pendiente')}</td>
                <td>${Utils.escapeHtml(task.priority || 'Media')}</td>
                <td>${Utils.escapeHtml(project ? project.name : 'Sin proyecto')}</td>
            `;

            tbody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al buscar tareas');
    }
}

// ============================================
// REPORTES
// ============================================
async function generateReport(type) {
    try {
        let text = `=== REPORTE: ${type.toUpperCase()} ===\n\n`;
        const reportsArea = document.getElementById('reportsArea');
        if (!reportsArea) return;

        const [tasks, projects, users] = await Promise.all([Api.getTasks(), Api.getProjects(), Api.getUsers()]);

        if (type === 'tasks') {
            const statusCount = {};
            tasks.forEach(task => {
                const status = task.status || 'Pendiente';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });
            Object.keys(statusCount).forEach(status => {
                text += `${status}: ${statusCount[status]} tareas\n`;
            });
        } else if (type === 'projects') {
            projects.forEach(project => {
                const count = tasks.filter(t => t.projectId === project._id).length;
                text += `${project.name}: ${count} tareas\n`;
            });
        } else if (type === 'users') {
            users.forEach(user => {
                const count = tasks.filter(t => t.assignedTo === user.username).length;
                text += `${user.username}: ${count} tareas asignadas\n`;
            });
        }

        reportsArea.value = text;
        NotificationSystem.success('Reporte generado correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al generar reporte');
    }
}

async function exportCSV() {
    try {
        const [tasks, projects] = await Promise.all([Api.getTasks(), Api.getProjects()]);

        let csv = 'ID,Título,Estado,Prioridad,Proyecto\n';

        tasks.forEach(task => {
            const project = projects.find(p => p._id === task.projectId);
            const title = (task.title || '').replace(/"/g, '""');
            const status = (task.status || 'Pendiente').replace(/"/g, '""');
            const priority = (task.priority || 'Media').replace(/"/g, '""');
            const projectName = (project ? project.name : 'Sin proyecto').replace(/"/g, '""');
            csv += `${task._id},"${title}","${status}","${priority}","${projectName}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_tasks_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        NotificationSystem.success('Datos exportados a CSV correctamente');
    } catch (err) {
        console.error(err);
        NotificationSystem.error('Error al exportar CSV');
    }
}

// ============================================
// BACKUP Y RESTORE
// ============================================
async function backupData() {
    NotificationSystem.info('Backup no disponible en este backend');
}

function restoreData() {
    NotificationSystem.info('Restore no disponible en este backend');
}

// ============================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    NotificationSystem.init();
    ConfirmSystem.init();

    try {
        await Api.request('GET', '/init');
    } catch (err) {
        console.error(err);
    }

    const loggedIn = await login();
    if (!loggedIn) return;

    await loadProjects();
    await loadUsers();

    // Menú de perfil: Mi Perfil y Cambiar Contraseña (placeholders)
    const profileLink = document.getElementById('profileLink');
    const changePasswordLink = document.getElementById('changePasswordLink');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            NotificationSystem.info('Función "Mi Perfil" aún no implementada');
        });
    }
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            NotificationSystem.info('Función "Cambiar Contraseña" aún no implementada');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    document.querySelectorAll('.nav-link[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = btn.getAttribute('data-tab');
            if (tabName) {
                showTab(tabName);
            }
        });
    });

    // Event listeners para tareas
    const addTaskBtn = document.getElementById('addTaskBtn');
    const updateTaskBtn = document.getElementById('updateTaskBtn');
    const deleteTaskBtn = document.getElementById('deleteTaskBtn');
    const clearTaskBtn = document.getElementById('clearTaskBtn');

    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
    if (updateTaskBtn) updateTaskBtn.addEventListener('click', updateTask);
    if (deleteTaskBtn) deleteTaskBtn.addEventListener('click', deleteTask);
    if (clearTaskBtn) clearTaskBtn.addEventListener('click', clearTaskForm);

    // Event listeners para proyectos
    const addProjectBtn = document.getElementById('addProjectBtn');
    const updateProjectBtn = document.getElementById('updateProjectBtn');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');

    if (addProjectBtn) addProjectBtn.addEventListener('click', addProject);
    if (updateProjectBtn) updateProjectBtn.addEventListener('click', updateProject);
    if (deleteProjectBtn) deleteProjectBtn.addEventListener('click', deleteProject);

    // Event listeners para comentarios
    const addCommentBtn = document.getElementById('addCommentBtn');
    const loadCommentsBtn = document.getElementById('loadCommentsBtn');

    if (addCommentBtn) addCommentBtn.addEventListener('click', addComment);
    if (loadCommentsBtn) loadCommentsBtn.addEventListener('click', loadComments);

    // Event listeners para historial
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');
    const loadAllHistoryBtn = document.getElementById('loadAllHistoryBtn');

    if (loadHistoryBtn) loadHistoryBtn.addEventListener('click', loadHistory);
    if (loadAllHistoryBtn) loadAllHistoryBtn.addEventListener('click', loadAllHistory);

    // Event listeners para notificaciones
    const loadNotificationsBtn = document.getElementById('loadNotificationsBtn');
    const markNotificationsReadBtn = document.getElementById('markNotificationsReadBtn');

    if (loadNotificationsBtn) loadNotificationsBtn.addEventListener('click', loadNotifications);
    if (markNotificationsReadBtn) markNotificationsReadBtn.addEventListener('click', markNotificationsRead);

    // Event listeners para búsqueda
    const searchBtn = document.getElementById('searchBtn');
    const searchTextInput = document.getElementById('searchText');

    if (searchBtn) searchBtn.addEventListener('click', searchTasks);
    if (searchTextInput) {
        searchTextInput.addEventListener('input', debouncedSearch);
    }

    // Event listeners para reportes
    const reportTasksBtn = document.getElementById('reportTasksBtn');
    const reportProjectsBtn = document.getElementById('reportProjectsBtn');
    const reportUsersBtn = document.getElementById('reportUsersBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');

    if (reportTasksBtn) reportTasksBtn.addEventListener('click', () => generateReport('tasks'));
    if (reportProjectsBtn) reportProjectsBtn.addEventListener('click', () => generateReport('projects'));
    if (reportUsersBtn) reportUsersBtn.addEventListener('click', () => generateReport('users'));
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportCSV);
    if (backupBtn) backupBtn.addEventListener('click', backupData);
    if (restoreBtn) restoreBtn.addEventListener('click', restoreData);

    // Botón y modal de registro de usuario (admin)
    const registerBtn = document.getElementById('registerUserBtn');
    const saveNewUserBtn = document.getElementById('saveNewUserBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('registerUserModal'));
            modal.show();
        });
    }
    if (saveNewUserBtn) {
        saveNewUserBtn.addEventListener('click', registerNewUser);
    }
});
