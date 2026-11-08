// STORES & STATE MANAGEMENT
let currentUser = null;
let activeAuthTab = 'login';
let activeNavTab = 'dashboard';
let activeTaskFilter = 'all';
let activeTaskSubjectFilter = 'ALL';
let activeMaterialFilter = 'ALL';
let activeGroupId = null;

// Helper: LocalStorage Getters & Setters
function getUsers() {
    return JSON.parse(localStorage.getItem('studysync_users') || '{}');
}
function saveUsers(users) {
    localStorage.setItem('studysync_users', JSON.stringify(users));
}

function getUserTasks(username = currentUser) {
    return JSON.parse(localStorage.getItem(`studysync_${username}_tasks`) || '[]');
}
function saveUserTasks(tasks, username = currentUser) {
    localStorage.setItem(`studysync_${username}_tasks`, JSON.stringify(tasks));
}

function getUserSubjects(username = currentUser) {
    return JSON.parse(localStorage.getItem(`studysync_${username}_subjects`) || '[]');
}
function saveUserSubjects(subjects, username = currentUser) {
    localStorage.setItem(`studysync_${username}_subjects`, JSON.stringify(subjects));
}

function getGlobalGroups() {
    return JSON.parse(localStorage.getItem('studysync_global_groups') || '[]');
}
function saveGlobalGroups(groups) {
    localStorage.setItem('studysync_global_groups', JSON.stringify(groups));
}

function getGlobalMaterials() {
    return JSON.parse(localStorage.getItem('studysync_global_materials') || '[]');
}
function saveGlobalMaterials(mats) {
    localStorage.setItem('studysync_global_materials', JSON.stringify(mats));
}

function hashPassword(pwd) {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
        hash = (hash << 5) - hash + pwd.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// Specialty helper: auto-appends "Student" with correct capitalization
function formatStudentSpecialty(inputStr) {
    if (!inputStr || !inputStr.trim()) return 'Student';
    let str = inputStr.trim();
    
    // Check if word "student" is anywhere in the string (case-insensitive)
    const regex = /\bstudent\b/i;
    if (regex.test(str)) {
        str = str.replace(regex, 'Student');
    } else {
        str += ' Student';
    }
    
    // Capitalize first letter of each word
    return str.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
}

// AUTHENTICATION LOGIC
function switchAuthTab(tab) {
    activeAuthTab = tab;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const confirmContainer = document.getElementById('confirm-password-container');
    const rememberContainer = document.getElementById('remember-me-container');
    const submitBtn = document.getElementById('auth-submit-btn');
    const authError = document.getElementById('auth-error');

    if (authError) authError.classList.add('hidden');

    if (tab === 'login') {
        if (tabLogin) tabLogin.className = 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors';
        if (tabRegister) tabRegister.className = 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
        if (confirmContainer) confirmContainer.classList.add('hidden');
        if (rememberContainer) rememberContainer.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Sign In';

        const rememberedUser = localStorage.getItem('studysync_remember_user');
        const rememberedPass = localStorage.getItem('studysync_remember_pass');
        if (rememberedUser && rememberedPass) {
            document.getElementById('auth-username').value = rememberedUser;
            document.getElementById('auth-password').value = rememberedPass;
            document.getElementById('remember-me').checked = true;
        }
    } else {
        if (tabRegister) tabRegister.className = 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors';
        if (tabLogin) tabLogin.className = 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
        if (confirmContainer) confirmContainer.classList.remove('hidden');
        if (rememberContainer) rememberContainer.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Create Account';

        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-confirm-password').value = '';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const authError = document.getElementById('auth-error');

    if (authError) authError.classList.add('hidden');

    if (!username || !password) {
        showAuthError('Please fill in all required fields.');
        return;
    }

    const users = getUsers();

    if (activeAuthTab === 'login') {
        const user = users[username];
        if (!user || user.password !== hashPassword(password)) {
            showAuthError('Invalid username or password.');
            return;
        }

        const rememberMe = document.getElementById('remember-me').checked;
        if (rememberMe) {
            localStorage.setItem('studysync_remember_user', username);
            localStorage.setItem('studysync_remember_pass', password);
        } else {
            localStorage.removeItem('studysync_remember_user');
            localStorage.removeItem('studysync_remember_pass');
        }

        loginUser(username);
    } else {
        const confirmPassword = document.getElementById('auth-confirm-password').value;
        if (password !== confirmPassword) {
            showAuthError('Passwords do not match.');
            return;
        }

        if (users[username]) {
            showAuthError('Username already exists.');
            return;
        }

        users[username] = {
            password: hashPassword(password),
            specialty: 'Student',
            university: '',
            groupName: '',
            userGroups: []
        };
        saveUsers(users);

        loginUser(username);
    }
}

function showAuthError(msg) {
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
    }
}

function loginUser(username) {
    currentUser = username;
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('nav-username').textContent = currentUser;
    document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();

    let subjects = getUserSubjects();
    if (subjects.length === 0) {
        subjects = [
            { id: 'sub-1', name: 'Computer Science' },
            { id: 'sub-2', name: 'Mathematics' }
        ];
        saveUserSubjects(subjects);
    }

    renderDashboard();
    renderSubjects();
    renderTasks();
    renderGroups();
    renderMaterials();
    renderProfile();
}

function logout() {
    currentUser = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-modal').classList.remove('hidden');
    switchAuthTab('login');
}

// NAVIGATION TABS
function switchTab(tabId) {
    activeNavTab = tabId;
    const tabs = ['dashboard', 'subjects', 'tasks', 'groups', 'materials', 'profile'];
    tabs.forEach(t => {
        const btn = document.getElementById(`nav-tab-${t}`);
        const view = document.getElementById(`view-${t}`);
        if (t === tabId) {
            if (btn) btn.className = 'py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors';
            if (view) view.classList.remove('hidden');
        } else {
            if (btn) btn.className = 'py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors';
            if (view) view.classList.add('hidden');
        }
    });

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'subjects') renderSubjects();
    if (tabId === 'tasks') renderTasks();
    if (tabId === 'groups') renderGroups();
    if (tabId === 'materials') renderMaterials();
    if (tabId === 'profile') renderProfile();
}

// DASHBOARD VIEW
function renderDashboard() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();
    const users = getUsers();
    const userGroups = users[currentUser]?.userGroups || [];
    
    const allMaterials = getGlobalMaterials();
    const accessibleMaterials = allMaterials.filter(m => !m.groupId || userGroups.includes(m.groupId));

    document.getElementById('stat-subjects-count').textContent = subjects.length;
    document.getElementById('stat-tasks-count').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('stat-groups-count').textContent = userGroups.length;
    document.getElementById('stat-materials-count').textContent = accessibleMaterials.length;

    const grid = document.getElementById('dashboard-subject-progress-grid');
    grid.innerHTML = '';

    if (subjects.length === 0) {
        grid.innerHTML = '<p class="text-xs text-slate-400 italic py-4">No subjects found.</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    subjects.forEach(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const completed = subTasks.filter(t => t.completed).length;
        const total = subTasks.length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        const overdue = subTasks.filter(t => !t.completed && t.deadline < today).length;
        const dueToday = subTasks.filter(t => !t.completed && t.deadline === today).length;

        let warningBadge = '';
        if (overdue > 0) {
            warningBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400">⚠️ ${overdue} OVERDUE</span>`;
        } else if (dueToday > 0) {
            warningBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400">🚨 ${dueToday} DUE TODAY</span>`;
        } else {
            warningBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">✓ UP TO DATE</span>`;
        }

        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-3';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">${sub.name}</h4>
                ${warningBadge}
            </div>
            <div class="space-y-1">
                <div class="flex justify-between text-xs text-slate-500">
                    <span>Progress (${completed}/${total})</span>
                    <span>${percent}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div class="bg-indigo-600 h-2 rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// SUBJECTS VIEW
function renderSubjects() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';

    if (subjects.length === 0) {
        grid.innerHTML = '<p class="text-sm text-slate-400 italic">No subjects added yet. Click "+ Add Subject" to get started.</p>';
        return;
    }

    subjects.forEach(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between h-40';
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between">
                    <h3 class="font-bold text-lg">${sub.name}</h3>
                    <div class="flex gap-1">
                        <button onclick="editSubject('${sub.id}')" class="text-slate-400 hover:text-indigo-600 p-1 text-xs">✏️</button>
                        <button onclick="deleteSubject('${sub.id}')" class="text-slate-400 hover:text-red-600 p-1 text-xs">🗑️</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${subTasks.length} total tasks assigned</p>
            </div>
            <button onclick="viewSubjectTasks('${sub.id}')" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View Tasks &rarr;
            </button>
        `;
        grid.appendChild(card);
    });
}

function openSubjectModal(editId = null) {
    document.getElementById('edit-subject-id').value = editId || '';
    document.getElementById('subject-modal-title').textContent = editId ? 'Edit Subject' : 'Create Subject';
    document.getElementById('sub-name').value = '';

    if (editId) {
        const subjects = getUserSubjects();
        const sub = subjects.find(s => s.id === editId);
        if (sub) document.getElementById('sub-name').value = sub.name;
    }

    document.getElementById('subject-modal').classList.remove('hidden');
    document.getElementById('subject-modal').classList.add('flex');
}

function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
    document.getElementById('subject-modal').classList.remove('flex');
}

function handleSubjectSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('sub-name').value.trim();
    const editId = document.getElementById('edit-subject-id').value;
    let subjects = getUserSubjects();

    if (editId) {
        subjects = subjects.map(s => s.id === editId ? { ...s, name } : s);
    } else {
        subjects.push({ id: 'sub-' + Date.now(), name });
    }

    saveUserSubjects(subjects);
    closeSubjectModal();
    renderSubjects();
    renderDashboard();
}

function editSubject(id) {
    openSubjectModal(id);
}

function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject? Associated tasks will be removed.')) return;
    let subjects = getUserSubjects().filter(s => s.id !== id);
    let tasks = getUserTasks().filter(t => t.subjectId !== id);
    saveUserSubjects(subjects);
    saveUserTasks(tasks);
    renderSubjects();
    renderDashboard();
}

function viewSubjectTasks(subId) {
    activeTaskSubjectFilter = subId;
    switchTab('tasks');
}

// TASK PLANNER VIEW
function renderTasks() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();

    const tabsContainer = document.getElementById('task-subject-tabs');
    tabsContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTaskSubjectFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`;
    allBtn.textContent = 'All Subjects';
    allBtn.onclick = () => { activeTaskSubjectFilter = 'ALL'; renderTasks(); };
    tabsContainer.appendChild(allBtn);

    subjects.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTaskSubjectFilter === sub.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`;
        btn.textContent = sub.name;
        btn.onclick = () => { activeTaskSubjectFilter = sub.id; renderTasks(); };
        tabsContainer.appendChild(btn);
    });

    let filtered = tasks;
    if (activeTaskSubjectFilter !== 'ALL') {
        filtered = filtered.filter(t => t.subjectId === activeTaskSubjectFilter);
    }

    if (activeTaskFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (activeTaskFilter === 'completed') filtered = filtered.filter(t => t.completed);

    const list = document.getElementById('tasks-list');
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400 italic py-4">No tasks found in this section.</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    filtered.forEach(task => {
        const sub = subjects.find(s => s.id === task.subjectId);
        const subName = sub ? sub.name : 'General';
        const isOverdue = !task.completed && task.deadline < today;

        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border ${task.completed ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} shadow-xs flex items-center justify-between gap-4`;
        card.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-sm truncate ${task.completed ? 'line-through text-slate-400' : ''}">${task.title}</h4>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">${subName}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${task.category}</span>
                    </div>
                    <div class="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span class="${isOverdue ? 'text-red-500 font-bold' : ''}">📅 Due: ${task.deadline} ${isOverdue ? '(Overdue)' : ''}</span>
                        ${task.attachments && task.attachments.length ? `<span>📎 ${task.attachments.length} attachment(s)</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="openTaskModal('${task.id}')" class="p-1 text-slate-400 hover:text-indigo-600 text-xs">✏️</button>
                <button onclick="deleteTask('${task.id}')" class="p-1 text-slate-400 hover:text-red-600 text-xs">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function filterTasks(type) {
    activeTaskFilter = type;
    ['all', 'pending', 'completed'].forEach(t => {
        const btn = document.getElementById(`filter-task-${t}`);
        if (t === type) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });
    renderTasks();
}

function openTaskModal(editId = null) {
    const subjects = getUserSubjects();
    const select = document.getElementById('task-subject-select');
    select.innerHTML = '';
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });

    document.getElementById('edit-task-id').value = editId || '';
    document.getElementById('task-modal-title').textContent = editId ? 'Edit Task' : 'Create New Task';
    document.getElementById('task-submit-btn').textContent = editId ? 'Save Changes' : 'Add Task';
    document.getElementById('task-title').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-files').value = '';

    if (editId) {
        const tasks = getUserTasks();
        const task = tasks.find(t => t.id === editId);
        if (task) {
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-subject-select').value = task.subjectId;
            document.getElementById('task-deadline').value = task.deadline;
            document.getElementById('task-category').value = task.category;
        }
    }

    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('flex');
}

function handleTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const subjectId = document.getElementById('task-subject-select').value;
    const deadline = document.getElementById('task-deadline').value;
    const category = document.getElementById('task-category').value;
    const fileInput = document.getElementById('task-files');
    const editId = document.getElementById('edit-task-id').value;

    let tasks = getUserTasks();
    const attachments = [];

    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(f => {
            attachments.push({ name: f.name, size: f.size });

            const mats = getGlobalMaterials();
            mats.push({
                id: 'mat-' + Date.now() + Math.random(),
                title: f.name,
                category: category,
                fileName: f.name,
                sharedBy: currentUser,
                groupId: null,
                uploadDate: new Date().toISOString().split('T')[0]
            });
            saveGlobalMaterials(mats);
        });
    }

    if (editId) {
        tasks = tasks.map(t => t.id === editId ? {
            ...t,
            title,
            subjectId,
            deadline,
            category,
            attachments: attachments.length ? attachments : t.attachments
        } : t);
    } else {
        tasks.push({
            id: 'task-' + Date.now(),
            title,
            subjectId,
            deadline,
            category,
            completed: false,
            attachments
        });
    }

    saveUserTasks(tasks);
    closeTaskModal();
    renderTasks();
    renderDashboard();
    renderMaterials();
}

function toggleTaskComplete(id) {
    let tasks = getUserTasks();
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveUserTasks(tasks);
    renderTasks();
    renderDashboard();
}

function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    let tasks = getUserTasks().filter(t => t.id !== id);
    saveUserTasks(tasks);
    renderTasks();
    renderDashboard();
}

// STUDY GROUPS & CHAT VIEW
function renderGroups() {
    const users = getUsers();
    const userGroups = users[currentUser]?.userGroups || [];
    const allGroups = getGlobalGroups();
    const joinedGroups = allGroups.filter(g => userGroups.includes(g.id));

    const tabsContainer = document.getElementById('group-selector-tabs');
    tabsContainer.innerHTML = '';

    if (joinedGroups.length === 0) {
        activeGroupId = null;
        tabsContainer.innerHTML = '<p class="text-xs text-slate-400 italic py-2">You haven\'t joined any study groups yet. Create or join one above.</p>';
        renderActiveGroup();
        return;
    }

    if (!activeGroupId || !joinedGroups.find(g => g.id === activeGroupId)) {
        activeGroupId = joinedGroups[0].id;
    }

    joinedGroups.forEach(g => {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold ${activeGroupId === g.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`;
        btn.textContent = `${g.name} (${g.code})`;
        btn.onclick = () => { activeGroupId = g.id; renderGroups(); };
        tabsContainer.appendChild(btn);
    });

    renderActiveGroup();
}

function renderActiveGroup() {
    const allGroups = getGlobalGroups();
    const group = allGroups.find(g => g.id === activeGroupId);

    const titleEl = document.getElementById('active-group-title');
    const codeEl = document.getElementById('active-group-code');
    const countEl = document.getElementById('active-group-members-count');
    const messagesContainer = document.getElementById('chat-messages-container');
    const membersList = document.getElementById('group-members-list');
    const leaveBtn = document.getElementById('leave-group-btn');

    if (!group) {
        titleEl.textContent = 'Select a Study Group';
        codeEl.textContent = 'Group Code: ---';
        countEl.textContent = '0 Members';
        messagesContainer.innerHTML = '<div class="text-center text-slate-400 py-12 text-sm">Select or create a study group to start chatting.</div>';
        membersList.innerHTML = '<p class="text-xs text-slate-400 italic">No group selected.</p>';
        if (leaveBtn) leaveBtn.classList.add('hidden');
        return;
    }

    if (leaveBtn) leaveBtn.classList.remove('hidden');
    titleEl.textContent = group.name;
    codeEl.textContent = `Group Code: ${group.code}`;
    countEl.textContent = `${group.members.length} Member(s)`;

    membersList.innerHTML = '';
    group.members.forEach(m => {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs font-medium';
        item.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] uppercase">${m.charAt(0)}</div>
            <span>${m} ${m === group.creator ? '<span class="text-[10px] text-slate-400">(Creator)</span>' : ''}</span>
        `;
        membersList.appendChild(item);
    });

    messagesContainer.innerHTML = '';
    if (!group.messages || group.messages.length === 0) {
        messagesContainer.innerHTML = '<div class="text-center text-slate-400 py-12 text-sm">No messages yet. Say hi to your group!</div>';
        return;
    }

    group.messages.forEach(msg => {
        const isMe = msg.sender === currentUser;
        const div = document.createElement('div');
        div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;

        let attachmentHTML = '';
        if (msg.file) {
            attachmentHTML = `
                <div class="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-700 text-xs space-y-1">
                    <p class="font-semibold">Shared file: ${msg.file.name}</p>
                    <a href="#" onclick="alert('Downloading ${msg.file.name}'); return false;" class="text-indigo-600 dark:text-indigo-400 underline inline-block">Download</a>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="text-[10px] text-slate-400 mb-1">${msg.sender} • ${msg.time}</div>
            <div class="max-w-[75%] p-3 rounded-xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none'} shadow-xs">
                ${msg.text ? `<div>${msg.text}</div>` : ''}
                ${attachmentHTML}
            </div>
        `;
        messagesContainer.appendChild(div);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendChatMessage() {
    if (!activeGroupId) return;
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text) return;

    let groups = getGlobalGroups();
    const index = groups.findIndex(g => g.id === activeGroupId);
    if (index === -1) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    groups[index].messages.push({
        sender: currentUser,
        text,
        time
    });

    saveGlobalGroups(groups);
    input.value = '';
    renderActiveGroup();
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function handleChatFileUpload(e) {
    if (!activeGroupId || !e.target.files.length) return;
    const file = e.target.files[0];

    let groups = getGlobalGroups();
    const index = groups.findIndex(g => g.id === activeGroupId);
    if (index === -1) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    groups[index].messages.push({
        sender: currentUser,
        text: '',
        file: { name: file.name, size: file.size },
        time
    });
    saveGlobalGroups(groups);

    const mats = getGlobalMaterials();
    mats.push({
        id: 'mat-' + Date.now(),
        title: file.name,
        category: 'Group Resources',
        fileName: file.name,
        sharedBy: currentUser,
        groupId: activeGroupId,
        groupName: groups[index].name,
        uploadDate: new Date().toISOString().split('T')[0]
    });
    saveGlobalMaterials(mats);

    e.target.value = '';
    renderActiveGroup();
    renderMaterials();
}

function leaveCurrentGroup() {
    if (!activeGroupId) return;
    const groups = getGlobalGroups();
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    if (!confirm(`Are you sure you want to leave ${group.name}? You will lose access to files shared inside this group.`)) return;

    group.members = group.members.filter(m => m !== currentUser);
    saveGlobalGroups(groups);

    const users = getUsers();
    if (users[currentUser]) {
        users[currentUser].userGroups = (users[currentUser].userGroups || []).filter(gid => gid !== activeGroupId);
        saveUsers(users);
    }

    activeGroupId = null;
    renderGroups();
    renderMaterials();
    renderDashboard();
}

function openCreateGroupModal() {
    document.getElementById('new-group-name').value = '';
    document.getElementById('create-group-modal').classList.remove('hidden');
    document.getElementById('create-group-modal').classList.add('flex');
}
function closeCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('hidden');
    document.getElementById('create-group-modal').classList.remove('flex');
}

function handleCreateGroupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-group-name').value.trim();
    if (!name) return;

    const code = 'GRP-' + Math.floor(1000 + Math.random() * 9000);
    const newGroup = {
        id: 'grp-' + Date.now(),
        name,
        code,
        creator: currentUser,
        members: [currentUser],
        messages: []
    };

    const groups = getGlobalGroups();
    groups.push(newGroup);
    saveGlobalGroups(groups);

    const users = getUsers();
    users[currentUser].userGroups = users[currentUser].userGroups || [];
    users[currentUser].userGroups.push(newGroup.id);
    saveUsers(users);

    activeGroupId = newGroup.id;
    closeCreateGroupModal();
    renderGroups();
    renderDashboard();
}

function openJoinGroupModal() {
    document.getElementById('join-group-code-input').value = '';
    document.getElementById('join-group-modal').classList.remove('hidden');
    document.getElementById('join-group-modal').classList.add('flex');
}
function closeJoinGroupModal() {
    document.getElementById('join-group-modal').classList.add('hidden');
    document.getElementById('join-group-modal').classList.remove('flex');
}

function handleJoinGroupSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('join-group-code-input').value.trim().toUpperCase();
    const groups = getGlobalGroups();
    const group = groups.find(g => g.code === code);

    if (!group) {
        alert('Invalid group code. Please check and try again.');
        return;
    }

    const users = getUsers();
    users[currentUser].userGroups = users[currentUser].userGroups || [];

    if (users[currentUser].userGroups.includes(group.id)) {
        alert('You are already a member of this study group.');
        closeJoinGroupModal();
        return;
    }

    group.members.push(currentUser);
    saveGlobalGroups(groups);

    users[currentUser].userGroups.push(group.id);
    saveUsers(users);

    activeGroupId = group.id;
    closeJoinGroupModal();
    renderGroups();
    renderMaterials();
    renderDashboard();
}

// MATERIALS LIBRARY VIEW
function renderMaterials() {
    const users = getUsers();
    const userGroups = users[currentUser]?.userGroups || [];
    const allMaterials = getGlobalMaterials();

    let accessible = allMaterials.filter(m => {
        if (!m.groupId) return m.sharedBy === currentUser;
        return userGroups.includes(m.groupId);
    });

    const dropdownContainer = document.getElementById('material-group-dropdown-container');
    const groupSelect = document.getElementById('material-group-filter-select');

    if (activeMaterialFilter === 'Group Resources') {
        dropdownContainer.classList.remove('hidden');
        groupSelect.innerHTML = '<option value="ALL">All Joined Groups</option>';
        const groups = getGlobalGroups().filter(g => userGroups.includes(g.id));
        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            groupSelect.appendChild(opt);
        });
    } else {
        dropdownContainer.classList.add('hidden');
    }

    if (activeMaterialFilter !== 'ALL') {
        accessible = accessible.filter(m => m.category === activeMaterialFilter);
        if (activeMaterialFilter === 'Group Resources' && groupSelect.value !== 'ALL') {
            accessible = accessible.filter(m => m.groupId === groupSelect.value);
        }
    }

    const grid = document.getElementById('materials-grid');
    grid.innerHTML = '';

    if (accessible.length === 0) {
        grid.innerHTML = '<p class="text-sm text-slate-400 italic py-4 col-span-3 text-center">No study materials found in this category.</p>';
        return;
    }

    accessible.forEach(mat => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between h-36';
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between">
                    <h4 class="font-bold text-sm truncate" title="${mat.title}">${mat.title}</h4>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">${mat.category}</span>
                </div>
                <p class="text-xs text-slate-400 mt-2">Shared by: <span class="font-semibold text-slate-600 dark:text-slate-300">${mat.sharedBy}</span> ${mat.groupName ? `(${mat.groupName})` : ''}</p>
            </div>
            <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700">
                <span class="text-slate-400">${mat.uploadDate}</span>
                <button onclick="alert('Downloading ${mat.fileName}')" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Download</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterMaterials(cat) {
    activeMaterialFilter = cat;
    ['ALL', 'Group Resources', 'Lecture Notes', 'Lab Guide', 'Exam Prep'].forEach(c => {
        const btn = document.getElementById(`mat-filter-${c}`);
        if (c === cat) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });
    renderMaterials();
}

// PROFILE VIEW & SAVING
function renderProfile() {
    const users = getUsers();
    const user = users[currentUser];

    if (!user) return;

    const avatarEl = document.getElementById('profile-avatar-large');
    const nameEl = document.getElementById('profile-display-name');
    const roleEl = document.getElementById('profile-display-role');

    if (avatarEl) avatarEl.textContent = currentUser.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = currentUser;
    if (roleEl) roleEl.textContent = user.specialty || 'Student';

    const inputUser = document.getElementById('profile-input-username');
    const inputSpec = document.getElementById('profile-input-specialty');
    const inputUniv = document.getElementById('profile-input-university');
    const inputGrp = document.getElementById('profile-input-group');
    const inputPass = document.getElementById('profile-input-password');

    if (inputUser) inputUser.value = currentUser;
    if (inputSpec) inputSpec.value = user.specialty || 'Student';
    if (inputUniv) inputUniv.value = user.university || '';
    if (inputGrp) inputGrp.value = user.groupName || '';
    if (inputPass) inputPass.value = '';
}

function saveProfileSettings(event) {
    event.preventDefault();
    const newUsername = document.getElementById('profile-input-username').value.trim();
    const rawSpecialty = document.getElementById('profile-input-specialty').value;
    const university = document.getElementById('profile-input-university').value.trim();
    const groupName = document.getElementById('profile-input-group').value.trim();
    const confirmPassword = document.getElementById('profile-input-password').value;

    let users = getUsers();
    const userAccount = users[currentUser];

    if (!userAccount) return;

    if (userAccount.password !== hashPassword(confirmPassword)) {
        alert('Incorrect password! Please enter your current password to save profile changes.');
        return;
    }

    const formattedSpecialty = formatStudentSpecialty(rawSpecialty);

    if (newUsername !== currentUser) {
        if (!newUsername) {
            alert('Username cannot be empty.');
            return;
        }
        if (users[newUsername]) {
            alert('Username is already taken by another account.');
            return;
        }

        users[newUsername] = {
            ...userAccount,
            specialty: formattedSpecialty,
            university: university,
            groupName: groupName
        };
        delete users[currentUser];

        ['tasks', 'subjects'].forEach(key => {
            const data = localStorage.getItem(`studysync_${currentUser}_${key}`);
            if (data) {
                localStorage.setItem(`studysync_${newUsername}_${key}`, data);
                localStorage.removeItem(`studysync_${currentUser}_${key}`);
            }
        });

        let groups = getGlobalGroups();
        groups = groups.map(g => {
            if (g.creator === currentUser) g.creator = newUsername;
            g.members = g.members.map(m => m === currentUser ? newUsername : m);
            g.messages = g.messages.map(msg => {
                if (msg.sender === currentUser) msg.sender = newUsername;
                return msg;
            });
            return g;
        });
        saveGlobalGroups(groups);

        let mats = getGlobalMaterials();
        mats = mats.map(m => {
            if (m.sharedBy === currentUser) m.sharedBy = newUsername;
            return m;
        });
        saveGlobalMaterials(mats);

        if (localStorage.getItem('studysync_remember_user') === currentUser) {
            localStorage.setItem('studysync_remember_user', newUsername);
        }

        currentUser = newUsername;
        document.getElementById('nav-username').textContent = currentUser;
        document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();
    } else {
        users[currentUser].specialty = formattedSpecialty;
        users[currentUser].university = university;
        users[currentUser].groupName = groupName;
    }

    saveUsers(users);
    alert('Profile saved successfully!');
    renderProfile();
}

// THEME TOGGLE
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon-sun').classList.toggle('hidden', !isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', isDark);
}

// INITIALIZATION ON PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
    switchAuthTab('login');
});