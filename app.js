// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    MAX_NOTIFICATION_DISPLAY: 5,
    NOTIFICATION_DURATION: 5000
};

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
// SISTEMA DE ALMACENAMIENTO MEJORADO
// ============================================
const Storage = {
    // Inicializar datos por defecto
    init() {
        try {
            if (!localStorage.getItem('users')) {
                localStorage.setItem('users', JSON.stringify([
                    { id: 1, username: 'admin', password: 'admin' },
                    { id: 2, username: 'user1', password: 'user1' },
                    { id: 3, username: 'user2', password: 'user2' }
                ]));
            }
            if (!localStorage.getItem('projects')) {
                localStorage.setItem('projects', JSON.stringify([
                    { id: 1, name: 'Proyecto Demo', description: 'Proyecto de ejemplo' },
                    { id: 2, name: 'Proyecto Alpha', description: 'Proyecto importante' },
                    { id: 3, name: 'Proyecto Beta', description: 'Proyecto secundario' }
                ]));
            }
            if (!localStorage.getItem('tasks')) {
                localStorage.setItem('tasks', JSON.stringify([]));
            }
            if (!localStorage.getItem('comments')) {
                localStorage.setItem('comments', JSON.stringify([]));
            }
            if (!localStorage.getItem('history')) {
                localStorage.setItem('history', JSON.stringify([]));
            }
            if (!localStorage.getItem('notifications')) {
                localStorage.setItem('notifications', JSON.stringify([]));
            }
            if (!localStorage.getItem('nextTaskId')) {
                localStorage.setItem('nextTaskId', '1');
            }
            if (!localStorage.getItem('nextProjectId')) {
                localStorage.setItem('nextProjectId', '4');
            }
        } catch (error) {
            console.error('Error inicializando almacenamiento:', error);
            NotificationSystem.error('Error al inicializar el almacenamiento local');
        }
    },

    // Métodos genéricos con manejo de errores
    getItem(key, defaultValue = []) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error leyendo ${key}:`, error);
            return defaultValue;
        }
    },

    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error guardando ${key}:`, error);
            NotificationSystem.error('Error al guardar datos. El almacenamiento puede estar lleno.');
            return false;
        }
    },

    // Usuarios
    getUsers() {
        return this.getItem('users', []);
    },

    // Proyectos
    getProjects() {
        return this.getItem('projects', []);
    },

    addProject(project) {
        const projects = this.getProjects();
        const id = parseInt(localStorage.getItem('nextProjectId') || '1');
        project.id = id;
        projects.push(project);
        if (this.setItem('projects', projects)) {
            localStorage.setItem('nextProjectId', String(id + 1));
            return id;
        }
        return null;
    },

    updateProject(id, project) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            project.id = id;
            projects[index] = project;
            return this.setItem('projects', projects);
        }
        return false;
    },

    deleteProject(id) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== id);
        return this.setItem('projects', filtered);
    },

    // Tareas
    getTasks() {
        return this.getItem('tasks', []);
    },

    addTask(task) {
        const tasks = this.getTasks();
        const id = parseInt(localStorage.getItem('nextTaskId') || '1');
        task.id = id;
        task.createdAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();
        tasks.push(task);
        if (this.setItem('tasks', tasks)) {
            localStorage.setItem('nextTaskId', String(id + 1));
            return id;
        }
        return null;
    },

    updateTask(id, task) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            task.id = id;
            task.updatedAt = new Date().toISOString();
            tasks[index] = task;
            return this.setItem('tasks', tasks);
        }
        return false;
    },

    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        return this.setItem('tasks', filtered);
    },

    // Comentarios
    getComments() {
        return this.getItem('comments', []);
    },

    addComment(comment) {
        const comments = this.getComments();
        comment.id = comments.length + 1;
        comment.createdAt = new Date().toISOString();
        comments.push(comment);
        this.setItem('comments', comments);
    },

    // Historial
    getHistory() {
        return this.getItem('history', []);
    },

    addHistory(entry) {
        const history = this.getHistory();
        entry.id = history.length + 1;
        entry.timestamp = new Date().toISOString();
        history.push(entry);
        this.setItem('history', history);
    },

    // Notificaciones
    getNotifications() {
        return this.getItem('notifications', []);
    },

    addNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = notifications.length + 1;
        notification.read = false;
        notification.createdAt = new Date().toISOString();
        notifications.push(notification);
        this.setItem('notifications', notifications);
    },

    markNotificationsRead(userId) {
        const notifications = this.getNotifications();
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.read = true;
            }
        });
        this.setItem('notifications', notifications);
    },

    // Backup y Restore
    exportAll() {
        return {
            users: this.getUsers(),
            projects: this.getProjects(),
            tasks: this.getTasks(),
            comments: this.getComments(),
            history: this.getHistory(),
            notifications: this.getNotifications(),
            nextTaskId: localStorage.getItem('nextTaskId'),
            nextProjectId: localStorage.getItem('nextProjectId'),
            exportDate: new Date().toISOString()
        };
    },

    importAll(data) {
        try {
            if (data.users) this.setItem('users', data.users);
            if (data.projects) this.setItem('projects', data.projects);
            if (data.tasks) this.setItem('tasks', data.tasks);
            if (data.comments) this.setItem('comments', data.comments);
            if (data.history) this.setItem('history', data.history);
            if (data.notifications) this.setItem('notifications', data.notifications);
            if (data.nextTaskId) localStorage.setItem('nextTaskId', data.nextTaskId);
            if (data.nextProjectId) localStorage.setItem('nextProjectId', data.nextProjectId);
            return true;
        } catch (error) {
            console.error('Error importando datos:', error);
            return false;
        }
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
function login() {
    return Utils.safeExecute(() => {
        // Obtener credenciales de sessionStorage (viene de login.html)
        const username = sessionStorage.getItem('username');
        const password = sessionStorage.getItem('password');

        if (!username || !password) {
            // Si no hay credenciales, redirigir al login
            window.location.href = 'login.html';
            return;
        }

        const users = Storage.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            AppState.currentUser = user;
            document.getElementById('currentUser').textContent = Utils.escapeHtml(user.username);
            loadTasks();
            updateStats();
            NotificationSystem.success(`Bienvenido, ${user.username}`);
        } else {
            // Credenciales inválidas, redirigir al login
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('password');
            window.location.href = 'login.html';
        }
    }, 'Error al iniciar sesión');
}

function logout() {
    AppState.currentUser = null;
    AppState.selectedTaskId = null;
    AppState.selectedProjectId = null;
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('password');
    clearTaskForm();
    NotificationSystem.info('Sesión cerrada');
    // Redirigir al login después de un breve delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
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
function loadUsers() {
    const users = Storage.getUsers();
    const select = document.getElementById('taskAssigned');
    if (!select) return;
    
    select.innerHTML = '<option value="0">Sin asignar</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = Utils.escapeHtml(user.username);
        select.appendChild(option);
    });
}

function loadProjects() {
    const projects = Storage.getProjects();
    const select = document.getElementById('taskProject');
    const searchSelect = document.getElementById('searchProject');
    
    if (select) {
        select.innerHTML = '';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = Utils.escapeHtml(project.name);
            select.appendChild(option);
        });
    }

    if (searchSelect) {
        searchSelect.innerHTML = '<option value="0">Todos</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = Utils.escapeHtml(project.name);
            searchSelect.appendChild(option);
        });
    }
}

// ============================================
// GESTIÓN DE TAREAS
// ============================================
function addTask() {
    if (!AppState.currentUser) {
        NotificationSystem.warning('Debes iniciar sesión');
        return;
    }

    return Utils.safeExecute(() => {
        const title = Utils.sanitize(document.getElementById('taskTitle').value.trim());
        const task = {
            title: title,
            description: Utils.sanitize(document.getElementById('taskDescription').value.trim()),
            status: document.getElementById('taskStatus').value || 'Pendiente',
            priority: document.getElementById('taskPriority').value || 'Media',
            projectId: parseInt(document.getElementById('taskProject').value) || 0,
            assignedTo: parseInt(document.getElementById('taskAssigned').value) || 0,
            dueDate: document.getElementById('taskDueDate').value || '',
            estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
            actualHours: 0,
            createdBy: AppState.currentUser.id
        };

        const errors = Validation.validateTask(task);
        if (errors.length > 0) {
            NotificationSystem.error(errors.join(', '));
            return;
        }

        const taskId = Storage.addTask(task);
        if (!taskId) {
            NotificationSystem.error('Error al agregar la tarea');
            return;
        }

        Storage.addHistory({
            taskId: taskId,
            userId: AppState.currentUser.id,
            action: 'CREATED',
            oldValue: '',
            newValue: task.title
        });

        if (task.assignedTo > 0) {
            Storage.addNotification({
                userId: task.assignedTo,
                message: 'Nueva tarea asignada: ' + task.title,
                type: 'task_assigned'
            });
        }

        loadTasks();
        clearTaskForm();
        updateStats();
        NotificationSystem.success('Tarea agregada correctamente');
    }, 'Error al agregar tarea');
}

function updateTask() {
    if (!AppState.selectedTaskId) {
        NotificationSystem.warning('Selecciona una tarea de la tabla');
        return;
    }

    return Utils.safeExecute(() => {
        const title = Utils.sanitize(document.getElementById('taskTitle').value.trim());
        const oldTask = Storage.getTasks().find(t => t.id === AppState.selectedTaskId);
        if (!oldTask) {
            NotificationSystem.error('Tarea no encontrada');
            return;
        }

        const task = {
            title: title,
            description: Utils.sanitize(document.getElementById('taskDescription').value.trim()),
            status: document.getElementById('taskStatus').value || 'Pendiente',
            priority: document.getElementById('taskPriority').value || 'Media',
            projectId: parseInt(document.getElementById('taskProject').value) || 0,
            assignedTo: parseInt(document.getElementById('taskAssigned').value) || 0,
            dueDate: document.getElementById('taskDueDate').value || '',
            estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
            actualHours: oldTask.actualHours || 0,
            createdBy: oldTask.createdBy,
            createdAt: oldTask.createdAt
        };

        const errors = Validation.validateTask(task);
        if (errors.length > 0) {
            NotificationSystem.error(errors.join(', '));
            return;
        }

        if (oldTask.status !== task.status) {
            Storage.addHistory({
                taskId: AppState.selectedTaskId,
                userId: AppState.currentUser.id,
                action: 'STATUS_CHANGED',
                oldValue: oldTask.status,
                newValue: task.status
            });
        }

        if (oldTask.title !== task.title) {
            Storage.addHistory({
                taskId: AppState.selectedTaskId,
                userId: AppState.currentUser.id,
                action: 'TITLE_CHANGED',
                oldValue: oldTask.title,
                newValue: task.title
            });
        }

        if (!Storage.updateTask(AppState.selectedTaskId, task)) {
            NotificationSystem.error('Error al actualizar la tarea');
            return;
        }

        if (task.assignedTo > 0) {
            Storage.addNotification({
                userId: task.assignedTo,
                message: 'Tarea actualizada: ' + task.title,
                type: 'task_updated'
            });
        }

        loadTasks();
        clearTaskForm();
        updateStats();
        NotificationSystem.success('Tarea actualizada correctamente');
    }, 'Error al actualizar tarea');
}

async function deleteTask() {
    if (!AppState.selectedTaskId) {
        NotificationSystem.warning('Selecciona una tarea de la tabla');
        return;
    }

    const task = Storage.getTasks().find(t => t.id === AppState.selectedTaskId);
    if (!task) {
        NotificationSystem.error('Tarea no encontrada');
        return;
    }

    const confirmed = await ConfirmSystem.show('Confirmar Eliminación', 
        `¿Estás seguro de eliminar la tarea "${task.title}"?`);
    
    if (!confirmed) return;

    return Utils.safeExecute(() => {
        Storage.addHistory({
            taskId: AppState.selectedTaskId,
            userId: AppState.currentUser.id,
            action: 'DELETED',
            oldValue: task.title,
            newValue: ''
        });

        if (!Storage.deleteTask(AppState.selectedTaskId)) {
            NotificationSystem.error('Error al eliminar la tarea');
            return;
        }

        loadTasks();
        clearTaskForm();
        updateStats();
        NotificationSystem.success('Tarea eliminada correctamente');
    }, 'Error al eliminar tarea');
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

function loadTasks() {
    return Utils.safeExecute(() => {
        const tasks = Storage.getTasks();
        const projects = Storage.getProjects();
        const users = Storage.getUsers();
        const tbody = document.getElementById('tasksTableBody');
        
        if (!tbody) return;

        // Aplicar ordenamiento si existe
        let sortedTasks = [...tasks];
        if (AppState.sortColumn) {
            sortedTasks.sort((a, b) => {
                let aVal = a[AppState.sortColumn];
                let bVal = b[AppState.sortColumn];
                
                // Manejar valores nulos/undefined
                if (aVal == null) aVal = '';
                if (bVal == null) bVal = '';
                
                // Comparación numérica para IDs
                if (AppState.sortColumn === 'id') {
                    return AppState.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                // Comparación de texto
                const comparison = String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
                return AppState.sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        tbody.innerHTML = '';

        sortedTasks.forEach(task => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-label', `Seleccionar tarea ${task.id}: ${task.title}`);
            
            row.addEventListener('click', () => selectTask(task.id));
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectTask(task.id);
                }
            });

            const project = projects.find(p => p.id === task.projectId);
            const user = users.find(u => u.id === task.assignedTo);

        const statusClass = `status-${(task.status || 'Pendiente').toLowerCase().replace(/\s+/g, '-')}`;
        const priorityClass = `priority-${(task.priority || 'Media').toLowerCase()}`;
        
        row.innerHTML = `
            <td>${task.id}</td>
            <td>${Utils.escapeHtml(task.title)}</td>
            <td><span class="status-badge ${statusClass}">${Utils.escapeHtml(task.status || 'Pendiente')}</span></td>
            <td><span class="priority-badge ${priorityClass}">${Utils.escapeHtml(task.priority || 'Media')}</span></td>
            <td>${Utils.escapeHtml(project ? project.name : 'Sin proyecto')}</td>
            <td>${Utils.escapeHtml(user ? user.username : 'Sin asignar')}</td>
            <td>${Utils.formatDate(task.dueDate)}</td>
        `;

            tbody.appendChild(row);
        });

        // Agregar ordenamiento a encabezados
        setupTableSorting();
    }, 'Error al cargar tareas');
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

function selectTask(id) {
    AppState.selectedTaskId = id;
    const task = Storage.getTasks().find(t => t.id === id);
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
        if (parseInt(projectSelect.options[i].value) === task.projectId) {
            projectSelect.selectedIndex = i;
            break;
        }
    }

    const assignedSelect = document.getElementById('taskAssigned');
    for (let i = 0; i < assignedSelect.options.length; i++) {
        if (parseInt(assignedSelect.options[i].value) === task.assignedTo) {
            assignedSelect.selectedIndex = i;
            break;
        }
    }

    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskHours').value = task.estimatedHours || '';
}

function updateStats() {
    return Utils.safeExecute(() => {
        const tasks = Storage.getTasks();
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
    });
}

// ============================================
// GESTIÓN DE PROYECTOS
// ============================================
function addProject() {
    return Utils.safeExecute(() => {
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

        const projectId = Storage.addProject(project);
        if (!projectId) {
            NotificationSystem.error('Error al agregar el proyecto');
            return;
        }

        loadProjects();
        loadProjectsTable();
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        NotificationSystem.success('Proyecto agregado correctamente');
    }, 'Error al agregar proyecto');
}

function updateProject() {
    if (!AppState.selectedProjectId) {
        NotificationSystem.warning('Selecciona un proyecto de la tabla');
        return;
    }

    return Utils.safeExecute(() => {
        const name = Utils.sanitize(document.getElementById('projectName').value.trim());
        const project = Storage.getProjects().find(p => p.id === AppState.selectedProjectId);
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

        if (!Storage.updateProject(AppState.selectedProjectId, updatedProject)) {
            NotificationSystem.error('Error al actualizar el proyecto');
            return;
        }

        loadProjects();
        loadProjectsTable();
        NotificationSystem.success('Proyecto actualizado correctamente');
    }, 'Error al actualizar proyecto');
}

async function deleteProject() {
    if (!AppState.selectedProjectId) {
        NotificationSystem.warning('Selecciona un proyecto de la tabla');
        return;
    }

    const project = Storage.getProjects().find(p => p.id === AppState.selectedProjectId);
    if (!project) {
        NotificationSystem.error('Proyecto no encontrado');
        return;
    }

    const confirmed = await ConfirmSystem.show('Confirmar Eliminación', 
        `¿Estás seguro de eliminar el proyecto "${project.name}"?`);
    
    if (!confirmed) return;

    return Utils.safeExecute(() => {
        if (!Storage.deleteProject(AppState.selectedProjectId)) {
            NotificationSystem.error('Error al eliminar el proyecto');
            return;
        }

        loadProjects();
        loadProjectsTable();
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        AppState.selectedProjectId = null;
        NotificationSystem.success('Proyecto eliminado correctamente');
    }, 'Error al eliminar proyecto');
}

function loadProjectsTable() {
    return Utils.safeExecute(() => {
        const projects = Storage.getProjects();
        const tbody = document.getElementById('projectsTableBody');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        projects.forEach(project => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-label', `Seleccionar proyecto ${project.id}: ${project.name}`);
            
            row.addEventListener('click', () => {
                AppState.selectedProjectId = project.id;
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
                <td>${project.id}</td>
                <td>${Utils.escapeHtml(project.name)}</td>
                <td>${Utils.escapeHtml(project.description || '')}</td>
            `;

            tbody.appendChild(row);
        });
    }, 'Error al cargar proyectos');
}

// ============================================
// COMENTARIOS
// ============================================
function addComment() {
    if (!AppState.currentUser) {
        NotificationSystem.warning('Debes iniciar sesión');
        return;
    }

    return Utils.safeExecute(() => {
        const taskId = parseInt(document.getElementById('commentTaskId').value);
        const text = Utils.sanitize(document.getElementById('commentText').value.trim());

        if (!taskId) {
            NotificationSystem.warning('ID de tarea requerido');
            return;
        }

        if (!text) {
            NotificationSystem.warning('El comentario no puede estar vacío');
            return;
        }

        Storage.addComment({
            taskId: taskId,
            userId: AppState.currentUser.id,
            commentText: text
        });

        document.getElementById('commentText').value = '';
        loadComments();
        NotificationSystem.success('Comentario agregado correctamente');
    }, 'Error al agregar comentario');
}

function loadComments() {
    return Utils.safeExecute(() => {
        const taskId = parseInt(document.getElementById('commentTaskId').value);
        const commentsArea = document.getElementById('commentsArea');
        if (!commentsArea) return;

        if (!taskId) {
            commentsArea.value = 'Ingresa un ID de tarea';
            return;
        }

        const comments = Storage.getComments().filter(c => c.taskId === taskId);
        const users = Storage.getUsers();
        
        let text = `=== COMENTARIOS TAREA #${taskId} ===\n\n`;
        
        if (comments.length === 0) {
            text += 'No hay comentarios\n';
        } else {
            comments.forEach(comment => {
                const user = users.find(u => u.id === comment.userId);
                const date = new Date(comment.createdAt).toLocaleString('es-ES');
                text += `[${date}] ${user ? user.username : 'Usuario'}: ${comment.commentText}\n---\n`;
            });
        }

        commentsArea.value = text;
    }, 'Error al cargar comentarios');
}

// ============================================
// HISTORIAL
// ============================================
function loadHistory() {
    return Utils.safeExecute(() => {
        const taskId = parseInt(document.getElementById('historyTaskId').value);
        const historyArea = document.getElementById('historyArea');
        if (!historyArea) return;

        if (!taskId) {
            historyArea.value = 'Ingresa un ID de tarea';
            return;
        }

        const history = Storage.getHistory().filter(h => h.taskId === taskId);
        const users = Storage.getUsers();
        
        let text = `=== HISTORIAL TAREA #${taskId} ===\n\n`;
        
        if (history.length === 0) {
            text += 'No hay historial\n';
        } else {
            history.forEach(entry => {
                const user = users.find(u => u.id === entry.userId);
                const date = new Date(entry.timestamp).toLocaleString('es-ES');
                text += `${date} - ${entry.action}\n`;
                text += `  Usuario: ${user ? user.username : 'Desconocido'}\n`;
                text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
                text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
            });
        }

        historyArea.value = text;
    }, 'Error al cargar historial');
}

function loadAllHistory() {
    return Utils.safeExecute(() => {
        const history = Storage.getHistory();
        const users = Storage.getUsers();
        const historyArea = document.getElementById('historyArea');
        if (!historyArea) return;
        
        let text = '=== HISTORIAL COMPLETO ===\n\n';
        
        if (history.length === 0) {
            text += 'No hay historial\n';
        } else {
            history.slice(-100).reverse().forEach(entry => {
                const user = users.find(u => u.id === entry.userId);
                const date = new Date(entry.timestamp).toLocaleString('es-ES');
                text += `Tarea #${entry.taskId} - ${entry.action} - ${date}\n`;
                text += `  Usuario: ${user ? user.username : 'Desconocido'}\n`;
                text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
                text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
            });
        }

        historyArea.value = text;
    }, 'Error al cargar historial completo');
}

// ============================================
// NOTIFICACIONES
// ============================================
function loadNotifications() {
    if (!AppState.currentUser) return;

    return Utils.safeExecute(() => {
        const notifications = Storage.getNotifications().filter(n => 
            n.userId === AppState.currentUser.id && !n.read
        );
        const notificationsArea = document.getElementById('notificationsArea');
        if (!notificationsArea) return;
        
        let text = '=== NOTIFICACIONES ===\n\n';
        
        if (notifications.length === 0) {
            text += 'No hay notificaciones nuevas\n';
        } else {
            notifications.forEach(notif => {
                const date = new Date(notif.createdAt).toLocaleString('es-ES');
                text += `• [${notif.type}] ${notif.message} (${date})\n`;
            });
        }

        notificationsArea.value = text;
    }, 'Error al cargar notificaciones');
}

function markNotificationsRead() {
    if (!AppState.currentUser) return;

    return Utils.safeExecute(() => {
        Storage.markNotificationsRead(AppState.currentUser.id);
        loadNotifications();
        NotificationSystem.success('Notificaciones marcadas como leídas');
    }, 'Error al marcar notificaciones');
}

// ============================================
// BÚSQUEDA CON DEBOUNCE
// ============================================
const debouncedSearch = Utils.debounce(() => {
    searchTasks();
}, CONFIG.DEBOUNCE_DELAY);

function searchTasks() {
    return Utils.safeExecute(() => {
        const searchText = document.getElementById('searchText').value.toLowerCase().trim();
        const statusFilter = document.getElementById('searchStatus').value;
        const priorityFilter = document.getElementById('searchPriority').value;
        const projectFilter = parseInt(document.getElementById('searchProject').value) || 0;

        const tasks = Storage.getTasks();
        const projects = Storage.getProjects();
        const tbody = document.getElementById('searchTableBody');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        const filtered = tasks.filter(task => {
            if (searchText && !task.title.toLowerCase().includes(searchText) && 
                !task.description.toLowerCase().includes(searchText)) {
                return false;
            }
            if (statusFilter && task.status !== statusFilter) {
                return false;
            }
            if (priorityFilter && task.priority !== priorityFilter) {
                return false;
            }
            if (projectFilter > 0 && task.projectId !== projectFilter) {
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
            const project = projects.find(p => p.id === task.projectId);

            row.innerHTML = `
                <td>${task.id}</td>
                <td>${Utils.escapeHtml(task.title)}</td>
                <td>${Utils.escapeHtml(task.status || 'Pendiente')}</td>
                <td>${Utils.escapeHtml(task.priority || 'Media')}</td>
                <td>${Utils.escapeHtml(project ? project.name : 'Sin proyecto')}</td>
            `;

            tbody.appendChild(row);
        });
    }, 'Error al buscar tareas');
}

// ============================================
// REPORTES
// ============================================
function generateReport(type) {
    return Utils.safeExecute(() => {
        let text = `=== REPORTE: ${type.toUpperCase()} ===\n\n`;
        const reportsArea = document.getElementById('reportsArea');
        if (!reportsArea) return;

        if (type === 'tasks') {
            const tasks = Storage.getTasks();
            const statusCount = {};
            tasks.forEach(task => {
                const status = task.status || 'Pendiente';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });
            Object.keys(statusCount).forEach(status => {
                text += `${status}: ${statusCount[status]} tareas\n`;
            });
        } else if (type === 'projects') {
            const projects = Storage.getProjects();
            const tasks = Storage.getTasks();
            projects.forEach(project => {
                const count = tasks.filter(t => t.projectId === project.id).length;
                text += `${project.name}: ${count} tareas\n`;
            });
        } else if (type === 'users') {
            const users = Storage.getUsers();
            const tasks = Storage.getTasks();
            users.forEach(user => {
                const count = tasks.filter(t => t.assignedTo === user.id).length;
                text += `${user.username}: ${count} tareas asignadas\n`;
            });
        }

        reportsArea.value = text;
        NotificationSystem.success('Reporte generado correctamente');
    }, 'Error al generar reporte');
}

function exportCSV() {
    return Utils.safeExecute(() => {
        const tasks = Storage.getTasks();
        const projects = Storage.getProjects();
        
        let csv = 'ID,Título,Estado,Prioridad,Proyecto\n';
        
        tasks.forEach(task => {
            const project = projects.find(p => p.id === task.projectId);
            const title = (task.title || '').replace(/"/g, '""');
            const status = (task.status || 'Pendiente').replace(/"/g, '""');
            const priority = (task.priority || 'Media').replace(/"/g, '""');
            const projectName = (project ? project.name : 'Sin proyecto').replace(/"/g, '""');
            csv += `${task.id},"${title}","${status}","${priority}","${projectName}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_tasks_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        NotificationSystem.success('Datos exportados a CSV correctamente');
    }, 'Error al exportar CSV');
}

// ============================================
// BACKUP Y RESTORE
// ============================================
function backupData() {
    return Utils.safeExecute(() => {
        const data = Storage.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        NotificationSystem.success('Backup creado correctamente');
    }, 'Error al crear backup');
}

function restoreData() {
    const fileInput = document.getElementById('restoreFile');
    if (!fileInput) return;

    fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            return Utils.safeExecute(() => {
                try {
                    const data = JSON.parse(event.target.result);
                    const confirmed = confirm('¿Estás seguro de restaurar los datos? Esto sobrescribirá todos los datos actuales.');
                    if (!confirmed) {
                        fileInput.value = '';
                        return;
                    }

                    if (Storage.importAll(data)) {
                        NotificationSystem.success('Datos restaurados correctamente');
                        // Recargar la aplicación
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    } else {
                        NotificationSystem.error('Error al restaurar los datos');
                    }
                } catch (error) {
                    NotificationSystem.error('El archivo no es válido');
                }
                fileInput.value = '';
            }, 'Error al restaurar datos');
        };
        reader.readAsText(file);
    };
}

// ============================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión activa
    const username = sessionStorage.getItem('username');
    const password = sessionStorage.getItem('password');
    
    if (!username || !password) {
        // No hay sesión, redirigir al login
        window.location.href = 'login.html';
        return;
    }

    // Inicializar sistemas
    Storage.init();
    NotificationSystem.init();
    ConfirmSystem.init();
    loadProjects();
    loadUsers();
    
    // Iniciar sesión automáticamente
    login();

    // Event listeners para logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Event listeners para pestañas
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
});
