// Global Application State
let currentUser = null;
let currentTab = 'dashboard';
let taskFilter = 'all';
let materialFilter = 'ALL';
let activeGroupId = null;

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkSession();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('studysync_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-icon-sun').classList.remove('hidden');
        document.getElementById('theme-icon-moon').classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-icon-sun').classList.add('hidden');
        document.getElementById('theme-icon-moon').classList.remove('hidden');
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('studysync_theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon-sun').classList.toggle('hidden', !isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', isDark);
}

// Authentication Handlers
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').className = isLogin 
        ? 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors'
        : 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
    document.getElementById('tab-register').className = !isLogin 
        ? 'flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors'
        : 'flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors';
    
    document.getElementById('auth-submit-btn').textContent = isLogin ? 'Sign In' : 'Create Account';
    document.getElementById('remember-me-container').style.display = isLogin ? 'flex' : 'none';
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
    if (rememberedUser && rememberedPass) {
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
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function startAppSession() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Header updates
    document.getElementById('nav-username').textContent = currentUser;
    document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();

    // Ensure user profile data exists
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
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('remember-me').checked = false;
    }
    currentUser = null;
    checkSession();
}

// Navigation Tabs
function switchTab(tabId) {
    currentTab = tabId;
    ['dashboard', 'subjects', 'tasks', 'groups', 'materials', 'profile'].forEach(t => {
        document.getElementById(`view-${t}`).classList.toggle('hidden', t !== tabId);
        const navBtn = document.getElementById(`nav-tab-${t}`);
        if (navBtn) {
            if (t === tabId) {
                navBtn.className = 'py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors';
            } else {
                navBtn.className = 'py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors';
            }
        }
    });

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'subjects') renderSubjects();
    if (tabId === 'tasks') renderTasks();
    if (tabId === 'groups') renderGroupsWorkspace();
    if (tabId === 'materials') renderMaterials();
    if (tabId === 'profile') renderProfile();
}

// User-Specific Storage Helpers
function getUserData(key) {
    const data = JSON.parse(localStorage.getItem(`studysync_${currentUser}_${key}`) || '[]');
    return data;
}

function saveUserData(key, data) {
    localStorage.setItem(`studysync_${currentUser}_${key}`, JSON.stringify(data));
}

// Global Groups Storage
function getGlobalGroups() {
    return JSON.parse(localStorage.getItem('studysync_global_groups') || '[]');
}

function saveGlobalGroups(groups) {
    localStorage.setItem('studysync_global_groups', JSON.stringify(groups));
}

function initGlobalGroups() {
    let groups = getGlobalGroups();
    // Ensure user is in at least one group if any exist, otherwise leave empty
    saveGlobalGroups(groups);
}

// --- SUBJECT MODULES ---
function openSubjectModal(subjectId = null) {
    const modal = document.getElementById('subject-modal');
    const form = document.getElementById('subject-form');
    form.reset();
    document.getElementById('edit-subject-id').value = '';
    document.getElementById('subject-modal-title').textContent = 'Create Subject Module';

    if (subjectId) {
        const subjects = getUserData('subjects');
        const sub = subjects.find(s => s.id === subjectId);
        if (sub) {
            document.getElementById('edit-subject-id').value = sub.id;
            document.getElementById('sub-name').value = sub.name;
            document.getElementById('sub-deadline').value = sub.deadline;
            document.getElementById('subject-modal-title').textContent = 'Edit Subject Module';
        }
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
    document.getElementById('subject-modal').classList.remove('flex');
}

async function handleSubjectSubmit(event) {
    event.preventDefault();
    const editId = document.getElementById('edit-subject-id').value;
    const name = document.getElementById('sub-name').value;
    const deadline = document.getElementById('sub-deadline').value;
    const fileInput = document.getElementById('sub-files');

    let subjects = getUserData('subjects');
    let filesList = [];

    if (fileInput.files.length > 0) {
        for (let file of fileInput.files) {
            const dataUrl = await readFileAsDataURL(file);
            filesList.push({
                id: 'file_' + Math.random().toString(36.substring(2, 9)),
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type || 'application/octet-stream',
                url: dataUrl,
                completed: false,
                uploadedBy: currentUser,
                date: new Date().toLocaleDateString()
            });
        }
    }

    if (editId) {
        subjects = subjects.map(s => {
            if (s.id === editId) {
                return {
                    ...s,
                    name,
                    deadline,
                    files: [...s.files, ...filesList]
                };
            }
            return s;
        });
    } else {
        const newSub = {
            id: 'sub_' + Math.random().toString(36.substring(2, 9)),
            name,
            deadline,
            files: filesList
        };
        subjects.push(newSub);
    }

    saveUserData('subjects', subjects);
    closeSubjectModal();
    renderSubjects();
    syncSubjectFilesToMaterials();
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject module?')) {
        let subjects = getUserData('subjects');
        subjects = subjects.filter(s => s.id !== id);
        saveUserData('subjects', subjects);
        renderSubjects();
    }
}

function toggleSubjectFile(subjectId, fileId) {
    let subjects = getUserData('subjects');
    subjects = subjects.map(s => {
        if (s.id === subjectId) {
            s.files = s.files.map(f => {
                if (f.id === fileId) f.completed = !f.completed;
                return f;
            });
        }
        return s;
    });
    saveUserData('subjects', subjects);
    renderSubjects();
}

function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    const subjects = getUserData('subjects');

    if (subjects.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 italic">No subject modules created yet. Click "+ Add Subject" to begin.</div>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => {
        const totalFiles = sub.files.length;
        const completedFiles = sub.files.filter(f => f.completed).length;
        const remainingFiles = totalFiles - completedFiles;
        const percent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
        const deadlineInfo = calculateDeadlineInfo(sub.deadline);

        return `
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 flex flex-col justify-between">
                <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <h3 class="font-bold text-base leading-tight">${escapeHTML(sub.name)}</h3>
                        <div class="flex gap-1">
                            <button onclick="openSubjectModal('${sub.id}')" class="p-1 rounded text-slate-400 hover:text-indigo-600" title="Edit Subject">✏️</button>
                            <button onclick="deleteSubject('${sub.id}')" class="p-1 rounded text-slate-400 hover:text-red-600" title="Delete Subject">🗑️</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-xs px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium">${deadlineInfo.badgeText}</span>
                        <span class="text-xs text-slate-500">${remainingFiles} file(s) remaining</span>
                    </div>

                    <!-- Progress bar -->
                    <div class="mb-4">
                        <div class="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progress (${completedFileCountText(completedFiles, totalFiles)})</span>
                            <span class="font-semibold">${percent}%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div class="bg-indigo-600 h-full transition-all duration-300" style="width: ${percent}%"></div>
                        </div>
                    </div>

                    <!-- Files Collection List -->
                    <div class="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Files Collection</p>
                        ${sub.files.length === 0 ? '<p class="text-xs text-slate-400 italic">No files attached to this subject.</p>' : 
                            sub.files.map(f => `
                                <div class="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <label class="flex items-center gap-2 cursor-pointer truncate flex-1">
                                        <input type="checkbox" ${f.completed ? 'checked' : ''} onchange="toggleSubjectFile('${sub.id}', '${f.id}')" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
                                        <span class="${f.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'} truncate">${escapeHTML(f.name)}</span>
                                    </label>
                                    <a href="${f.url}" download="${f.name}" class="text-indigo-600 dark:text-indigo-400 hover:underline ml-2">Download</a>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function completedFileCountText(comp, total) {
    return `${comp}/${total} completed`;
}

// --- TASK PLANNER ---
function openTaskModal() {
    const subjects = getUserData('subjects');
    const select = document.getElementById('task-subject-select');
    select.innerHTML = subjects.length === 0 
        ? '<option value="">No subjects available (Create one first)</option>'
        : subjects.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');

    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('flex');
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('task-title').value;
    const subjectId = document.getElementById('task-subject-select').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const fileInput = document.getElementById('task-files');

    let filesList = [];
    if (fileInput.files.length > 0) {
        for (let file of fileInput.files) {
            const dataUrl = await readFileAsDataURL(file);
            filesList.push({
                name: file.name,
                size: formatFileSize(file.size),
                url: dataUrl
            });
        }
    }

    const tasks = getUserData('tasks');
    tasks.push({
        id: 'task_' + Math.random().toString(36.substring(2, 9)),
        title,
        subjectId,
        deadline,
        priority,
        completed: false,
        files: filesList
    });

    saveUserData('tasks', tasks);
    closeTaskModal();
    renderTasks();
}

function toggleTaskComplete(id) {
    let tasks = getUserData('tasks');
    tasks = tasks.map(t => {
        if (t.id === id) t.completed = !t.completed;
        return t;
    });
    saveUserData('tasks', tasks);
    renderTasks();
}

function deleteTask(id) {
    let tasks = getUserData('tasks');
    tasks = tasks.filter(t => t.id !== id);
    saveUserData('tasks', tasks);
    renderTasks();
}

function filterTasks(filter) {
    taskFilter = filter;
    ['all', 'pending', 'completed'].forEach(f => {
        const btn = document.getElementById(`filter-task-${f}`);
        if (f === filter) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    const tasks = getUserData('tasks');
    const subjects = getUserData('subjects');

    let filtered = tasks;
    if (taskFilter === 'pending') filtered = tasks.filter(t => !t.completed);
    if (taskFilter === 'completed') filtered = tasks.filter(t => t.completed);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="py-12 text-center text-slate-400 italic">No tasks found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(t => {
        const sub = subjects.find(s => s.id === t.subjectId);
        const subName = sub ? sub.name : 'General';
        const deadlineInfo = calculateDeadlineInfo(t.deadline);
        const priorityColor = t.priority === 'High' ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400' : (t.priority === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400');

        return `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTaskComplete('${t.id}')" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer">
                    <div class="truncate">
                        <h4 class="font-semibold text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'} truncate">${escapeHTML(t.title)}</h4>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${escapeHTML(subName)}</span>
                            <span class="text-xs px-2 py-0.5 rounded ${priorityColor}">${t.priority}</span>
                            <span class="text-xs text-slate-500">${deadlineInfo.badgeText}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    ${t.files && t.files.length > 0 ? `
                        <div class="flex flex-col gap-1">
                            ${t.files.map(f => `<a href="${f.url}" download="${f.name}" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[120px]">📎 ${escapeHTML(f.name)}</a>`).join('')}
                        </div>
                    ` : ''}
                    <button onclick="deleteTask('${t.id}')" class="p-2 text-slate-400 hover:text-red-600 rounded-lg">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- STUDY GROUPS & COLLABORATIVE CHAT ---
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
        id: 'group_' + Math.random().toString(36.substring(2, 9)),
        name,
        code,
        creator: currentUser,
        members: [currentUser],
        messages: []
    };
    groups.push(newGroup);
    saveGlobalGroups(groups);

    // Add to user joined groups
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

    if (userGroups.length === 0) {
        tabsContainer.innerHTML = `<p class="text-xs text-slate-400 italic">You have not joined any study groups yet.</p>`;
        document.getElementById('active-group-title').textContent = 'No Study Group Selected';
        document.getElementById('active-group-code').textContent = 'Group Code: ---';
        document.getElementById('active-group-members-count').textContent = '0 Members';
        document.getElementById('chat-messages-container').innerHTML = `<div class="text-center text-slate-400 py-12 text-sm">Create or join a study group above to start chatting.</div>`;
        document.getElementById('group-members-list').innerHTML = `<p class="text-xs text-slate-400 italic">No members.</p>`;
        return;
    }

    if (!activeGroupId || !userGroups.some(g => g.id === activeGroupId)) {
        activeGroupId = userGroups[0].id;
    }

    tabsContainer.innerHTML = userGroups.map(g => `
        <button onclick="setActiveGroup('${g.id}')" class="px-4 py-2 rounded-lg text-xs font-semibold ${g.id === activeGroupId ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}">${escapeHTML(g.name)} (${g.code})</button>
    `).join('');

    const activeGroup = userGroups.find(g => g.id === activeGroupId);
    if (activeGroup) {
        document.getElementById('active-group-title').textContent = activeGroup.name;
        document.getElementById('active-group-code').textContent = `Group Code: ${activeGroup.code}`;
        document.getElementById('active-group-members-count').textContent = `${activeGroup.members.length} Member(s)`;

        // Render Chat Messages
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

        // Render Members
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

    let materials = getUserData('materials');
    materials.push({
        id: 'mat_' + Math.random().toString(36.substring(2, 9)),
        title: file.name,
        category: 'Group Resources',
        subCategory: 'Group Shared',
        groupName: groupName,
        name: file.name,
        size: file.size,
        url: file.url,
        sharedBy: currentUser,
        date: new Date().toLocaleDateString()
    });
    saveUserData('materials', materials);
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
        id: 'mat_' + Math.random().toString(36.substring(2, 9)),
        title,
        category,
        subCategory: category,
        groupName: '',
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
            if (c === cat) {
                btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
            } else {
                btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
            }
        }
    });
    renderMaterials();
}

function renderMaterials() {
    const grid = document.getElementById('materials-grid');
    const materials = getUserData('materials');

    let filtered = materials;
    if (materialFilter !== 'ALL') {
        filtered = materials.filter(m => m.category === materialFilter);
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
                <p class="text-xs text-slate-400 mb-4">File: ${escapeHTML(m.name)} (${m.size})</p>
                ${m.groupName ? `<p class="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Group: ${escapeHTML(m.groupName)}</p>` : ''}
                <p class="text-[11px] text-slate-500">Shared by ${escapeHTML(m.sharedBy)} • ${m.date}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <a href="${m.url}" download="${m.name}" class="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors">Download File</a>
            </div>
        </div>
    `).join('');
}

function syncSubjectFilesToMaterials() {
    let subjects = getUserData('subjects');
    let materials = getUserData('materials');
    
    // Add any subject files into materials if not already present
    subjects.forEach(sub => {
        sub.files.forEach(sf => {
            if (!materials.some(m => m.url === sf.url)) {
                materials.push({
                    id: 'mat_' + Math.random().toString(36.substring(2, 9)),
                    title: `${sub.name}: ${sf.name}`,
                    category: 'Lecture Notes',
                    subCategory: 'Subject File',
                    groupName: '',
                    name: sf.name,
                    size: sf.size,
                    url: sf.url,
                    sharedBy: currentUser,
                    date: sf.date || new Date().toLocaleDateString()
                });
            }
        });
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
    const materials = getUserData('materials');
    const groups = getGlobalGroups().filter(g => g.members.includes(currentUser));

    document.getElementById('stat-subjects-count').textContent = subjects.length;
    document.getElementById('stat-tasks-count').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('stat-groups-count').textContent = groups.length;
    document.getElementById('stat-materials-count').textContent = materials.length;

    // Upcoming Deadlines Container
    const urgentContainer = document.getElementById('dashboard-urgent-tasks');
    let combinedItems = [
        ...subjects.map(s => ({ type: 'Subject', name: s.name, deadline: s.deadline })),
        ...tasks.filter(t => !t.completed).map(t => ({ type: 'Task', name: t.title, deadline: t.deadline }))
    ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (combinedItems.length === 0) {
        urgentContainer.innerHTML = `<p class="text-sm text-slate-400 italic py-4 text-center">No upcoming deadlines.</p>`;
    } else {
        urgentContainer.innerHTML = combinedItems.slice(0, 5).map(item => {
            const deadlineInfo = calculateDeadlineInfo(item.deadline);
            return `
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm">
                    <div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 mr-2">${item.type}</span>
                        <span class="font-medium">${escapeHTML(item.name)}</span>
                    </div>
                    <span class="text-xs text-slate-500">${deadlineInfo.badgeText}</span>
                </div>
            `;
        }).join('');
    }

    // Recent Materials Container
    const recentMatContainer = document.getElementById('dashboard-recent-materials');
    if (materials.length === 0) {
        recentMatContainer.innerHTML = `<p class="text-sm text-slate-400 italic py-4 text-center">No materials shared yet.</p>`;
    } else {
        recentMatContainer.innerHTML = materials.slice(-4).reverse().map(m => `
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm">
                <h4 class="font-semibold truncate">${escapeHTML(m.title)}</h4>
                <p class="text-xs text-slate-400 mt-0.5">Shared by ${escapeHTML(m.sharedBy)} • ${m.date}</p>
            </div>
        `).join('');
    }
}

// --- UTILITIES ---
function calculateDeadlineInfo(dateStr) {
    if (!dateStr) return { badgeText: 'No deadline' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { badgeText: `Overdue by ${Math.abs(diffDays)} day(s)` };
    if (diffDays === 0) return { badgeText: 'Due Today' };
    if (diffDays === 1) return { badgeText: 'Due Tomorrow' };
    return { badgeText: `Due in ${diffDays} days` };
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
