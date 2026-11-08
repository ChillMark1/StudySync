let currentUser = null;
let currentTab = 'dashboard';
let taskFilter = 'all';
let materialFilter = 'ALL';
let activeGroupId = null;
let activeTaskSubjectId = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkSession();
});

function initTheme() {
    const savedTheme = localStorage.getItem('studysync_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-icon-sun').classList.remove('hidden');
        document.getElementById('theme-icon-moon').classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-icon-sun').add ? document.getElementById('theme-icon-sun').classList.add('hidden') : null;
        document.getElementById('theme-icon-moon').classList.add('block');
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('studysync_theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon-sun').classList.toggle('hidden', !isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', isDark);
}

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').className = isLogin 
        ? 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors'
        : 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
    document.getElementById('tab-register').className = !isLogin 
        ? 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors'
        : 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
    
    document.getElementById('auth-submit-btn').textContent = isLogin ? 'Sign In' : 'Create Account';
    document.getElementById('confirm-password-container').style.display = isLogin ? 'none' : 'block';
    document.getElementById('remember-me-container').style.display = isLogin ? 'flex' : 'none';
    
    // Always start with clean inputs when switching to Register or Login
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-confirm-password').value = '';

    if (isLogin) {
        // Restore remembered credentials only when in Sign In tab
        const remUser = localStorage.getItem('studysync_remember_user') || '';
        const remPass = localStorage.getItem('studysync_remember_pass') || '';
        document.getElementById('auth-username').value = remUser;
        document.getElementById('auth-password').value = remPass;
        document.getElementById('remember-me').checked = !!remUser;
    }
    hideAuthError();
}

function showAuthError(msg) {
    const errBox = document.getElementById('auth-error');
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
}

function hideAuthError() {
    const errBox = document.getElementById('auth-error');
    errBox.textContent = '';
    errBox.classList.add('hidden');
}

function getUsers() {
    return JSON.parse(localStorage.getItem('studysync_users') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('studysync_users', JSON.stringify(users));
}

function handleAuthSubmit(event) {
    event.preventDefault();
    hideAuthError();

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const isLogin = document.getElementById('auth-submit-btn').textContent === 'Sign In';
    const users = getUsers();

    if (isLogin) {
        if (!users[username] || users[username].password !== hashPassword(password)) {
            showAuthError('Invalid username or password.');
            return;
        }
        currentUser = username;
        const rememberMe = document.getElementById('remember-me').checked;
        if (rememberMe) {
            localStorage.setItem('studysync_remember_user', username);
            localStorage.setItem('studysync_remember_pass', password);
        } else {
            localStorage.removeItem('studysync_remember_user');
            localStorage.removeItem('studysync_remember_pass');
        }
        startAppSession();
    } else {
        const confirmPass = document.getElementById('auth-confirm-password').value;
        if (password !== confirmPass) {
            showAuthError('Passwords do not match.');
            return;
        }
        if (users[username]) {
            showAuthError('Account already registered.');
            return;
        }
        users[username] = {
            password: hashPassword(password),
            university: '',
            groupName: '',
            joinedGroups: []
        };
        saveUsers(users);
        currentUser = username;
        localStorage.setItem('studysync_remember_user', username);
        localStorage.setItem('studysync_remember_pass', password);
        startAppSession();
    }
}

function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

function checkSession() {
    const rememberedUser = localStorage.getItem('studysync_remember_user');
    const rememberedPass = localStorage.getItem('studysync_remember_pass');
    const isExplicitLogout = sessionStorage.getItem('studysync_logged_out') === 'true';

    if (rememberedUser && rememberedPass && !isExplicitLogout) {
        const users = getUsers();
        if (users[rememberedUser] && users[rememberedUser].password === hashPassword(rememberedPass)) {
            currentUser = rememberedUser;
            document.getElementById('auth-username').value = rememberedUser;
            document.getElementById('auth-password').value = rememberedPass;
            document.getElementById('remember-me').checked = true;
            startAppSession();
            return;
        }
    }

    if (rememberedUser && rememberedPass) {
        document.getElementById('auth-username').value = rememberedUser;
        document.getElementById('auth-password').value = rememberedPass;
        document.getElementById('remember-me').checked = true;
    }

    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function startAppSession() {
    sessionStorage.removeItem('studysync_logged_out');
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    document.getElementById('nav-username').textContent = currentUser;
    document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();

    const users = getUsers();
    if (users[currentUser] && !users[currentUser].joinedGroups) {
        users[currentUser].joinedGroups = [];
        saveUsers(users);
    }

    initGlobalGroups();
    switchTab('dashboard');
}

function logout() {
    const rememberMe = document.getElementById('remember-me').checked;
    if (!rememberMe) {
        localStorage.removeItem('studysync_remember_user');
        localStorage.removeItem('studysync_remember_pass');
    }
    sessionStorage.setItem('studysync_logged_out', 'true');
    currentUser = null;

    document.getElementById('auth-username').value = localStorage.getItem('studysync_remember_user') || '';
    document.getElementById('auth-password').value = localStorage.getItem('studysync_remember_pass') || '';
    document.getElementById('auth-confirm-password').value = '';
    document.getElementById('remember-me').checked = !!localStorage.getItem('studysync_remember_user');
    
    switchAuthTab('login');
    checkSession();
}

function switchTab(tabId) {
    currentTab = tabId;
    ['dashboard', 'subjects', 'tasks', 'groups', 'materials', 'profile'].forEach(t => {
        document.getElementById(`view-${t}`).classList.toggle('hidden', t !== tabId);
        const navBtn = document.getElementById(`nav-tab-${t}`);
        if (navBtn) {
            navBtn.className = t === tabId 
                ? 'py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors'
                : 'py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors';
        }
    });

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'subjects') renderSubjects();
    if (tabId === 'tasks') renderTasks();
    if (tabId === 'groups') renderGroupsWorkspace();
    if (tabId === 'materials') renderMaterials();
    if (tabId === 'profile') renderProfile();
}

function getUserData(key) {
    return JSON.parse(localStorage.getItem(`studysync_${currentUser}_${key}`) || '[]');
}

function saveUserData(key, data) {
    localStorage.setItem(`studysync_${currentUser}_${key}`, JSON.stringify(data));
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

function initGlobalGroups() {
    let groups = getGlobalGroups();
    saveGlobalGroups(groups);
}

// --- SUBJECTS ---
function openSubjectModal(subjectId = null) {
    const modal = document.getElementById('subject-modal');
    const form = document.getElementById('subject-form');
    form.reset();
    document.getElementById('edit-subject-id').value = '';
    document.getElementById('subject-modal-title').textContent = 'Create Subject';

    if (subjectId) {
        const subjects = getUserData('subjects');
        const sub = subjects.find(s => s.id === subjectId);
        if (sub) {
            document.getElementById('edit-subject-id').value = sub.id;
            document.getElementById('sub-name').value = sub.name;
            document.getElementById('subject-modal-title').textContent = 'Edit Subject';
        }
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
    document.getElementById('subject-modal').classList.remove('flex');
}

function handleSubjectSubmit(event) {
    event.preventDefault();
    const editId = document.getElementById('edit-subject-id').value;
    const name = document.getElementById('sub-name').value.trim();

    let subjects = getUserData('subjects');

    if (editId) {
        subjects = subjects.map(s => s.id === editId ? { ...s, name } : s);
    } else {
        subjects.push({ id: 'sub_' + Math.random().toString(36).substring(2, 9), name });
    }

    saveUserData('subjects', subjects);
    closeSubjectModal();
    renderSubjects();
    renderDashboard();
}

function deleteSubject(id, event) {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to delete this subject?')) {
        let subjects = getUserData('subjects');
        subjects = subjects.filter(s => s.id !== id);
        saveUserData('subjects', subjects);
        renderSubjects();
        renderDashboard();
    }
}

function viewSubjectTasks(subjectId) {
    activeTaskSubjectId = subjectId;
    switchTab('tasks');
}

function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    const subjects = getUserData('subjects');
    const tasks = getUserData('tasks');

    if (subjects.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 italic text-xs">No subjects created yet. Click "+ Add Subject" to begin.</div>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const pendingCount = subTasks.filter(t => !t.completed).length;

        return `
            <div onclick="viewSubjectTasks('${sub.id}')" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 flex flex-col justify-between cursor-pointer hover:border-indigo-500 transition-all group">
                <div>
                    <div class="flex items-start justify-between gap-2 mb-3">
                        <h3 class="font-bold text-sm leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${escapeHTML(sub.name)}</h3>
                        <div class="flex gap-1" onclick="event.stopPropagation()">
                            <button type="button" onclick="openSubjectModal('${sub.id}')" class="p-1 text-xs text-slate-400 hover:text-indigo-600">✏️</button>
                            <button type="button" onclick="deleteSubject('${sub.id}', event)" class="p-1 text-xs text-slate-400 hover:text-red-600">🗑️</button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span>Pending Tasks: <strong class="text-indigo-600 dark:text-indigo-400">${pendingCount}</strong> / ${subTasks.length}</span>
                        <span class="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">View Tasks →</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- TASKS ---
function openTaskModal(taskId = null) {
    const subjects = getUserData('subjects');
    const select = document.getElementById('task-subject-select');
    select.innerHTML = '<option value="">-- Select a Subject --</option>' + 
        subjects.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');

    const form = document.getElementById('task-form');
    form.reset();
    document.getElementById('edit-task-id').value = '';
    document.getElementById('task-modal-title').textContent = 'Create New Task';
    document.getElementById('task-submit-btn').textContent = 'Add Task';

    if (taskId) {
        const tasks = getUserData('tasks');
        const t = tasks.find(task => task.id === taskId);
        if (t) {
            document.getElementById('edit-task-id').value = t.id;
            document.getElementById('task-title').value = t.title;
            document.getElementById('task-subject-select').value = t.subjectId;
            document.getElementById('task-deadline').value = t.deadline;
            document.getElementById('task-category').value = t.category || 'Lecture Notes';
            document.getElementById('task-modal-title').textContent = 'Edit Task';
            document.getElementById('task-submit-btn').textContent = 'Save Changes';
        }
    }

    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('flex');
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    const editId = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-title').value;
    const subjectId = document.getElementById('task-subject-select').value;
    const deadline = document.getElementById('task-deadline').value;
    const category = document.getElementById('task-category').value;
    const fileInput = document.getElementById('task-files');

    if (!subjectId) {
        alert('Please select a subject before adding a task.');
        return;
    }

    let filesList = [];
    if (fileInput && fileInput.files.length > 0) {
        for (let file of fileInput.files) {
            const dataUrl = await readFileAsDataURL(file);
            filesList.push({
                id: 'file_' + Math.random().toString(36).substring(2, 9),
                name: file.name,
                size: formatFileSize(file.size),
                url: dataUrl
            });
        }
    }

    let tasks = getUserData('tasks');
    if (editId) {
        tasks = tasks.map(t => {
            if (t.id === editId) {
                return {
                    ...t,
                    title,
                    subjectId,
                    deadline,
                    category,
                    files: filesList.length > 0 ? [...(t.files || []), ...filesList] : t.files
                };
            }
            return t;
        });
    } else {
        tasks.push({
            id: 'task_' + Math.random().toString(36).substring(2, 9),
            title,
            subjectId,
            deadline,
            category,
            completed: false,
            files: filesList
        });
    }

    saveUserData('tasks', tasks);
    closeTaskModal();
    renderTasks();
    renderDashboard();
    syncTaskFilesToMaterials();
}

function toggleTaskCompletion(taskId) {
    let tasks = getUserData('tasks');
    tasks = tasks.map(t => {
        if (t.id === taskId) t.completed = !t.completed;
        return t;
    });
    saveUserData('tasks', tasks);
    renderTasks();
    renderDashboard();
}

function deleteTask(taskId) {
    let tasks = getUserData('tasks');
    tasks = tasks.filter(t => t.id !== taskId);
    saveUserData('tasks', tasks);
    renderTasks();
    renderDashboard();
}

function filterTasks(status) {
    taskFilter = status;
    ['all', 'pending', 'completed'].forEach(f => {
        const btn = document.getElementById(`filter-task-${f}`);
        if (btn) {
            btn.className = f === status 
                ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });
    renderTasks();
}

function selectTaskSubjectTab(subjectId) {
    activeTaskSubjectId = subjectId;
    renderTasks();
}

function renderTasks() {
    const subjects = getUserData('subjects');
    const tasks = getUserData('tasks');
    const container = document.getElementById('tasks-list');
    const tabsContainer = document.getElementById('task-subject-tabs');

    tabsContainer.innerHTML = `
        <button type="button" onclick="selectTaskSubjectTab('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTaskSubjectId === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">All Subjects</button>
        ${subjects.map(s => `
            <button type="button" onclick="selectTaskSubjectTab('${s.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTaskSubjectId === s.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">${escapeHTML(s.name)}</button>
        `).join('')}
    `;

    let filtered = tasks;
    if (activeTaskSubjectId !== 'ALL') {
        filtered = filtered.filter(t => t.subjectId === activeTaskSubjectId);
    }
    if (taskFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (taskFilter === 'completed') filtered = filtered.filter(t => t.completed);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="py-12 text-center text-slate-400 italic text-xs">No tasks found for this view.</div>`;
        return;
    }

    container.innerHTML = filtered.map(t => {
        const sub = subjects.find(s => s.id === t.subjectId);
        const subName = sub ? sub.name : 'General';
        const deadlineInfo = calculateDeadlineInfo(t.deadline);

        return `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTaskCompletion('${t.id}')" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer">
                    <div class="truncate flex-1">
                        <h4 class="font-bold text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'} truncate">${escapeHTML(t.title)}</h4>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">${escapeHTML(subName)}</span>
                            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">${t.category || 'General'}</span>
                            <span class="text-slate-500">${deadlineInfo.badgeText} (${t.deadline})</span>
                        </div>
                        ${t.files && t.files.length > 0 ? `
                            <div class="mt-2 space-y-1">
                                <p class="text-[10px] font-semibold text-slate-400 uppercase">Attached Files:</p>
                                <div class="flex flex-wrap gap-2">
                                    ${t.files.map(f => `
                                        <a href="${f.url}" download="${f.name}" class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:underline">
                                            📎 ${escapeHTML(f.name)} (${f.size})
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center">
                    <button type="button" onclick="openTaskModal('${t.id}')" class="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">Edit</button>
                    <button type="button" onclick="toggleTaskCompletion('${t.id}')" class="px-2.5 py-1 rounded text-xs font-semibold ${t.completed ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}">${t.completed ? 'Mark Pending' : '✓ Complete'}</button>
                    <button type="button" onclick="deleteTask('${t.id}')" class="p-1 text-slate-400 hover:text-red-600">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- STUDY GROUPS & CHAT ---
function openCreateGroupModal() {
    document.getElementById('create-group-modal').classList.remove('hidden');
    document.getElementById('create-group-modal').classList.add('flex');
}

function closeCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('hidden');
    document.getElementById('create-group-modal').classList.remove('flex');
}

function openJoinGroupModal() {
    document.getElementById('join-group-modal').classList.remove('hidden');
    document.getElementById('join-group-modal').classList.add('flex');
}

function closeJoinGroupModal() {
    document.getElementById('join-group-modal').classList.add('hidden');
    document.getElementById('join-group-modal').classList.remove('flex');
}

function handleCreateGroupSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('new-group-name').value.trim();
    const code = 'GRP-' + Math.floor(1000 + Math.random() * 9000);

    let groups = getGlobalGroups();
    const newGroup = {
        id: 'group_' + Math.random().toString(36).substring(2, 9),
        name,
        code,
        creator: currentUser,
        members: [currentUser],
        messages: []
    };
    groups.push(newGroup);
    saveGlobalGroups(groups);

    let users = getUsers();
    if (!users[currentUser].joinedGroups) users[currentUser].joinedGroups = [];
    users[currentUser].joinedGroups.push(newGroup.id);
    saveUsers(users);

    closeCreateGroupModal();
    activeGroupId = newGroup.id;
    renderGroupsWorkspace();
}

function handleJoinGroupSubmit(event) {
    event.preventDefault();
    const code = document.getElementById('join-group-code-input').value.trim().toUpperCase();
    let groups = getGlobalGroups();
    const group = groups.find(g => g.code === code);

    if (!group) {
        alert('Study group not found with code: ' + code);
        return;
    }

    if (!group.members.includes(currentUser)) {
        group.members.push(currentUser);
        saveGlobalGroups(groups);
    }

    let users = getUsers();
    if (!users[currentUser].joinedGroups) users[currentUser].joinedGroups = [];
    if (!users[currentUser].joinedGroups.includes(group.id)) {
        users[currentUser].joinedGroups.push(group.id);
        saveUsers(users);
    }

    closeJoinGroupModal();
    activeGroupId = group.id;
    renderGroupsWorkspace();
}

function renderGroupsWorkspace() {
    let groups = getGlobalGroups();
    let userGroups = groups.filter(g => g.members.includes(currentUser));
    const tabsContainer = document.getElementById('group-selector-tabs');
    const leaveBtn = document.getElementById('leave-group-btn');

    if (userGroups.length === 0) {
        tabsContainer.innerHTML = `<p class="text-xs text-slate-400 italic">You have not joined any study groups yet.</p>`;
        document.getElementById('active-group-title').textContent = 'No Study Group Selected';
        document.getElementById('active-group-code').textContent = 'Group Code: ---';
        document.getElementById('active-group-members-count').textContent = '0 Members';
        document.getElementById('chat-messages-container').innerHTML = `<div class="text-center text-slate-400 py-12 text-sm">Create or join a study group above to start chatting.</div>`;
        document.getElementById('group-members-list').innerHTML = `<p class="text-xs text-slate-400 italic">No members.</p>`;
        if (leaveBtn) leaveBtn.classList.add('hidden');
        return;
    }

    if (!activeGroupId || !userGroups.some(g => g.id === activeGroupId)) {
        activeGroupId = userGroups[0].id;
    }

    if (leaveBtn) leaveBtn.classList.remove('hidden');

    tabsContainer.innerHTML = userGroups.map(g => `
        <button type="button" onclick="setActiveGroup('${g.id}')" class="px-4 py-2 rounded-lg text-xs font-semibold ${g.id === activeGroupId ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}">${escapeHTML(g.name)} (${g.code})</button>
    `).join('');

    const activeGroup = userGroups.find(g => g.id === activeGroupId);
    if (activeGroup) {
        document.getElementById('active-group-title').textContent = activeGroup.name;
        document.getElementById('active-group-code').textContent = `Group Code: ${activeGroup.code}`;
        document.getElementById('active-group-members-count').textContent = `${activeGroup.members.length} Member(s)`;

        const msgContainer = document.getElementById('chat-messages-container');
        if (activeGroup.messages.length === 0) {
            msgContainer.innerHTML = `<div class="text-center text-slate-400 py-12 text-sm">No messages in this group yet. Start the discussion!</div>`;
        } else {
            msgContainer.innerHTML = activeGroup.messages.map(m => {
                const isSelf = m.sender === currentUser;
                return `
                    <div class="flex flex-col ${isSelf ? 'items-end' : 'items-start'}">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${escapeHTML(m.sender)}</span>
                            <span class="text-[10px] text-slate-400">${m.time}</span>
                        </div>
                        <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-xs'}">
                            <p>${escapeHTML(m.text)}</p>
                            ${m.file ? `
                                <div class="mt-2 pt-2 border-t border-slate-200/20 flex items-center justify-between gap-4 text-xs">
                                    <span class="truncate font-medium">📎 ${escapeHTML(m.file.name)}</span>
                                    <a href="${m.file.url}" download="${m.file.name}" class="underline font-semibold ml-2">Download</a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        const memContainer = document.getElementById('group-members-list');
        memContainer.innerHTML = activeGroup.members.map(member => `
            <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">${member.charAt(0)}</div>
                <div class="flex-1 truncate">
                    <h4 class="text-xs font-bold truncate">${escapeHTML(member)} ${member === activeGroup.creator ? '(Creator)' : ''}</h4>
                </div>
            </div>
        `).join('');
    }
}

function leaveCurrentGroup() {
    if (!activeGroupId) return;
    let groups = getGlobalGroups();
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    if (confirm(`Are you sure you want to leave ${group.name}? You will lose access to shared files from this group.`)) {
        // Remove user from group members
        groups = groups.map(g => {
            if (g.id === activeGroupId) {
                return {
                    ...g,
                    members: g.members.filter(m => m !== currentUser)
                };
            }
            return g;
        });
        saveGlobalGroups(groups);

        // Remove group ID from user record
        let users = getUsers();
        if (users[currentUser] && users[currentUser].joinedGroups) {
            users[currentUser].joinedGroups = users[currentUser].joinedGroups.filter(id => id !== activeGroupId);
            saveUsers(users);
        }

        activeGroupId = null;
        renderGroupsWorkspace();
        renderMaterials();
        renderDashboard();
    }
}

function leaveCurrentGroup() {
    if (!activeGroupId) return;
    let groups = getGlobalGroups();
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    if (!confirm(`Are you sure you want to leave standard group "${group.name}"? You will lose access to its shared files.`)) {
        return;
    }

    // Remove member from group
    group.members = group.members.filter(m => m !== currentUser);
    saveGlobalGroups(groups);

    // Remove group ID from user's joined groups
    let users = getUsers();
    if (users[currentUser] && users[currentUser].joinedGroups) {
        users[currentUser].joinedGroups = users[currentUser].joinedGroups.filter(id => id !== activeGroupId);
        saveUsers(users);
    }

    activeGroupId = null;
    renderGroupsWorkspace();
    renderMaterials();
    renderDashboard();
}

function setActiveGroup(id) {
    activeGroupId = id;
    renderGroupsWorkspace();
}

function sendChatMessage(fileAttachment = null) {
    if (!activeGroupId) return;
    const textInput = document.getElementById('chat-input-text');
    const text = textInput.value.trim();

    if (!text && !fileAttachment) return;

    let groups = getGlobalGroups();
    groups = groups.map(g => {
        if (g.id === activeGroupId) {
            g.messages.push({
                sender: currentUser,
                text: text || (fileAttachment ? `Shared file: ${fileAttachment.name}` : ''),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                file: fileAttachment
            });
        }
        return g;
    });

    saveGlobalGroups(groups);
    textInput.value = '';
    renderGroupsWorkspace();

    if (fileAttachment) {
        syncGroupResourceToLibrary(fileAttachment, activeGroupId);
    }
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

async function handleChatFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    const fileObj = {
        name: file.name,
        size: formatFileSize(file.size),
        url: dataUrl
    };
    sendChatMessage(fileObj);
    e.target.value = '';
}

function syncGroupResourceToLibrary(file, groupId) {
    let groups = getGlobalGroups();
    const g = groups.find(grp => grp.id === groupId);
    const groupName = g ? g.name : 'Study Group';
    const groupCode = g ? g.code : 'GRP';

    let globalMaterials = getGlobalMaterials();
    const newMaterial = {
        id: 'mat_' + Math.random().toString(36).substring(2, 9),
        title: file.name,
        category: 'Group Resources',
        groupId: groupId,
        groupName: groupName,
        groupCode: groupCode,
        name: file.name,
        size: file.size,
        url: file.url,
        sharedBy: currentUser,
        date: new Date().toLocaleDateString()
    };

    // Store in global materials array so all group members can access it
    globalMaterials.push(newMaterial);
    saveGlobalMaterials(globalMaterials);
}

// --- MATERIALS LIBRARY ---
function openMaterialUploadModal() {
    document.getElementById('material-modal').classList.remove('hidden');
    document.getElementById('material-modal').classList.add('flex');
}

function closeMaterialUploadModal() {
    document.getElementById('material-modal').classList.add('hidden');
    document.getElementById('material-modal').classList.remove('flex');
}

async function handleMaterialUploadSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('mat-title').value;
    const category = document.getElementById('mat-category').value;
    const fileInput = document.getElementById('mat-file');
    const file = fileInput.files[0];
    if (!file) return;

    const dataUrl = await readFileAsDataURL(file);
    let materials = getUserData('materials');
    materials.push({
        id: 'mat_' + Math.random().toString(36).substring(2, 9),
        title,
        category,
        groupId: '',
        groupName: '',
        groupCode: '',
        name: file.name,
        size: formatFileSize(file.size),
        url: dataUrl,
        sharedBy: currentUser,
        date: new Date().toLocaleDateString()
    });

    saveUserData('materials', materials);
    closeMaterialUploadModal();
    renderMaterials();
}

function filterMaterials(cat) {
    materialFilter = cat;
    ['ALL', 'Group Resources', 'Lecture Notes', 'Lab Guide', 'Exam Prep'].forEach(c => {
        const btn = document.getElementById(`mat-filter-${c}`);
        if (btn) {
            btn.className = c === cat 
                ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });

    const dropdownContainer = document.getElementById('material-group-dropdown-container');
    if (cat === 'Group Resources') {
        dropdownContainer.classList.remove('hidden');
        populateMaterialGroupFilter();
    } else {
        dropdownContainer.classList.add('hidden');
    }

    renderMaterials();
}

function populateMaterialGroupFilter() {
    let groups = getGlobalGroups().filter(g => g.members.includes(currentUser));
    const select = document.getElementById('material-group-filter-select');
    select.innerHTML = '<option value="ALL">All Joined Groups</option>' + 
        groups.map(g => `<option value="${g.id}">${escapeHTML(g.name)} (${g.code})</option>`).join('');
}

function renderMaterials() {
    const grid = document.getElementById('materials-grid');
    const userMaterials = getUserData('materials');
    const globalMaterials = getGlobalMaterials();
    const userGroups = getGlobalGroups().filter(g => g.members.includes(currentUser)).map(g => g.id);

    // Filter group-shared materials so only materials belonging to CURRENTLY joined groups are accessible
    const accessibleGroupMaterials = globalMaterials.filter(m => userGroups.includes(m.groupId));
    
    // Filter private/task materials to exclude any that belong to left groups
    const accessibleUserMaterials = userMaterials.filter(m => !m.groupId || userGroups.includes(m.groupId));

    const combinedMap = new Map();
    accessibleUserMaterials.forEach(m => combinedMap.set(m.id, m));
    accessibleGroupMaterials.forEach(m => combinedMap.set(m.id, m));

    let allMaterials = Array.from(combinedMap.values());

    let filtered = allMaterials;
    if (materialFilter !== 'ALL') {
        filtered = allMaterials.filter(m => m.category === materialFilter);
        if (materialFilter === 'Group Resources') {
            const groupFilterVal = document.getElementById('material-group-filter-select').value;
            if (groupFilterVal && groupFilterVal !== 'ALL') {
                filtered = filtered.filter(m => m.groupId === groupFilterVal);
            }
        }
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 italic">No study materials found in this category.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(m => `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-bold text-base leading-tight truncate">${escapeHTML(m.title)}</h3>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">${escapeHTML(m.category)}</span>
                </div>
                <p class="text-xs text-slate-400 mb-2">File: ${escapeHTML(m.name)} (${m.size})</p>
                ${m.groupName ? `<p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Group: ${escapeHTML(m.groupName)} (${escapeHTML(m.groupCode)})</p>` : ''}
                <p class="text-[11px] text-slate-500 font-medium">Shared by ${escapeHTML(m.sharedBy)} • ${m.date}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <a href="${m.url}" download="${m.name}" class="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors">Download File</a>
            </div>
        </div>
    `).join('');
}

function syncTaskFilesToMaterials() {
    let tasks = getUserData('tasks');
    let materials = getUserData('materials');
    const subjects = getUserData('subjects');

    tasks.forEach(t => {
        const sub = subjects.find(s => s.id === t.subjectId);
        const subName = sub ? sub.name : 'General';
        if (t.files && t.files.length > 0) {
            t.files.forEach(tf => {
                if (!materials.some(m => m.url === tf.url)) {
                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substring(2, 9),
                        title: `${subName}: ${t.title} (${tf.name})`,
                        category: t.category || 'Lecture Notes',
                        groupId: '',
                        groupName: '',
                        groupCode: '',
                        name: tf.name,
                        size: tf.size,
                        url: tf.url,
                        sharedBy: currentUser,
                        date: new Date().toLocaleDateString()
                    });
                }
            });
        }
    });
    saveUserData('materials', materials);
}

// --- PROFILE ---
function renderProfile() {
    const users = getUsers();
    const uData = users[currentUser] || {};

    document.getElementById('profile-display-name').textContent = currentUser;
    document.getElementById('profile-avatar-large').textContent = currentUser.charAt(0).toUpperCase();
    document.getElementById('profile-input-username').value = currentUser;
    document.getElementById('profile-input-university').value = uData.university || '';
    document.getElementById('profile-input-group').value = uData.groupName || '';
}

function saveProfileSettings(event) {
    event.preventDefault();
    const university = document.getElementById('profile-input-university').value.trim();
    const groupName = document.getElementById('profile-input-group').value.trim();

    let users = getUsers();
    if (users[currentUser]) {
        users[currentUser].university = university;
        users[currentUser].groupName = groupName;
        saveUsers(users);
        alert('Profile updated successfully!');
    }
}

// --- DASHBOARD ---
function renderDashboard() {
    const subjects = getUserData('subjects');
    const tasks = getUserData('tasks');
    const userMaterials = getUserData('materials');
    const globalMaterials = getGlobalMaterials();
    const groups = getGlobalGroups().filter(g => g.members.includes(currentUser));
    const userGroupIds = groups.map(g => g.id);

    const sharedGroupMaterials = globalMaterials.filter(m => userGroupIds.includes(m.groupId));
    const combinedMap = new Map();
    userMaterials.forEach(m => combinedMap.set(m.id, m));
    sharedGroupMaterials.forEach(m => combinedMap.set(m.id, m));

    document.getElementById('stat-subjects-count').textContent = subjects.length;
    document.getElementById('stat-tasks-count').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('stat-groups-count').textContent = groups.length;
    document.getElementById('stat-materials-count').textContent = combinedMap.size;

    const grid = document.getElementById('dashboard-subject-progress-grid');
    if (subjects.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 italic py-4 col-span-full">No subjects found. Create a subject to see task progress and deadlines.</p>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const pendingTasks = subTasks.filter(t => !t.completed);
        const completedCount = subTasks.filter(t => t.completed).length;
        const totalCount = subTasks.length;
        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        let warningBadge = '';
        if (pendingTasks.length > 0) {
            const sorted = [...pendingTasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            const closest = sorted[0];
            const dlInfo = calculateDeadlineInfo(closest.deadline);

            if (dlInfo.isOverdue) {
                warningBadge = `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-bold text-[10px]">⚠️ OVERDUE: ${escapeHTML(closest.title)} (${dlInfo.badgeText} - ${closest.deadline})</span>`;
            } else if (dlInfo.diffDays === 0) {
                warningBadge = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-[10px]">🚨 DUE TODAY: ${escapeHTML(closest.title)} (${closest.deadline})</span>`;
            } else {
                warningBadge = `<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-[10px]">⏳ Next: ${escapeHTML(closest.title)} (${dlInfo.badgeText} - ${closest.deadline})</span>`;
            }
        } else {
            warningBadge = `<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:text-emerald-950/40 font-semibold text-[10px]">✓ All tasks complete</span>`;
        }

        return `
            <div onclick="viewSubjectTasks('${sub.id}')" class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between cursor-pointer hover:border-indigo-500 transition-all">
                <div>
                    <h4 class="font-bold text-sm mb-1">${escapeHTML(sub.name)}</h4>
                    <p class="text-xs text-slate-500 mb-3">${pendingTasks.length} task(s) remaining out of ${totalCount}</p>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
                        <div class="bg-indigo-600 h-full transition-all duration-300" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="mt-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                    ${warningBadge}
                </div>
            </div>
        `;
    }).join('');
}

// --- UTILITIES ---
function calculateDeadlineInfo(dateStr) {
    if (!dateStr) return { badgeText: 'No deadline', isOverdue: false, diffDays: 999 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { badgeText: `Overdue by ${Math.abs(diffDays)} day(s)`, isOverdue: true, diffDays };
    if (diffDays === 0) return { badgeText: 'Due Today', isOverdue: false, diffDays: 0 };
    if (diffDays === 1) return { badgeText: 'Due Tomorrow', isOverdue: false, diffDays: 1 };
    return { badgeText: `Due in ${diffDays} days`, isOverdue: false, diffDays };
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    if (typeof bytes === 'string') return bytes;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}