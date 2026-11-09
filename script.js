// GLOBAL APP STATE
let currentUser = null;
let activeTab = 'dashboard';
let authMode = 'login';
let currentTaskFilter = 'all';
let currentTaskSubjectFilter = 'ALL';
let currentMaterialFilter = 'ALL';
let activeGroupId = null;

// INITIALIZATION
window.onload = function() {
    checkDarkMode();
    initStoredUserSession();
};

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('studysync_theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function checkDarkMode() {
    const savedTheme = localStorage.getItem('studysync_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    document.getElementById('theme-icon-sun').classList.toggle('hidden', !isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', isDark);
}

// AUTHENTICATION LOGIC
function switchAuthTab(mode) {
    authMode = mode;
    const errDiv = document.getElementById('auth-error');
    errDiv.classList.add('hidden');
    errDiv.innerText = '';

    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-confirm-password').value = '';

    if (mode === 'login') {
        document.getElementById('tab-login').className = "flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors";
        document.getElementById('tab-register').className = "flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors";
        document.getElementById('confirm-password-container').classList.add('hidden');
        document.getElementById('remember-me-container').classList.remove('hidden');
        document.getElementById('auth-submit-btn').innerText = "Sign In";

        const remembered = JSON.parse(localStorage.getItem('studysync_remembered_creds') || 'null');
        if (remembered) {
            document.getElementById('auth-username').value = remembered.username || '';
            document.getElementById('auth-password').value = remembered.password || '';
            document.getElementById('remember-me').checked = true;
        }
    } else {
        document.getElementById('tab-register').className = "flex-1 pb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors";
        document.getElementById('tab-login').className = "flex-1 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors";
        document.getElementById('confirm-password-container').classList.remove('hidden');
        document.getElementById('remember-me-container').classList.add('hidden');
        document.getElementById('auth-submit-btn').innerText = "Create Account";
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const errDiv = document.getElementById('auth-error');
    errDiv.classList.add('hidden');

    if (!username || !password) {
        showAuthError('Please fill in all required fields.');
        return;
    }

    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');

    if (authMode === 'register') {
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
            username: username,
            password: password,
            specialty: 'Student',
            university: '',
            groupName: '',
            joinedGroups: []
        };
        localStorage.setItem('studysync_users', JSON.stringify(users));
        loginUser(username);
    } else {
        if (!users[username] || users[username].password !== password) {
            showAuthError('Invalid username or password.');
            return;
        }
        const rememberMe = document.getElementById('remember-me').checked;
        if (rememberMe) {
            localStorage.setItem('studysync_remembered_creds', JSON.stringify({ username, password }));
        } else {
            localStorage.removeItem('studysync_remembered_creds');
        }
        loginUser(username);
    }
}

function showAuthError(msg) {
    const errDiv = document.getElementById('auth-error');
    errDiv.innerText = msg;
    errDiv.classList.remove('hidden');
}

function loginUser(username) {
    currentUser = username;
    sessionStorage.setItem('studysync_active_session', username);
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    document.getElementById('nav-username').innerText = currentUser;
    document.getElementById('nav-user-avatar').innerText = currentUser.charAt(0);

    renderDashboard();
    switchTab('dashboard');
}

function initStoredUserSession() {
    const activeSession = sessionStorage.getItem('studysync_active_session');
    if (activeSession) {
        loginUser(activeSession);
    } else {
        switchAuthTab('login');
    }
}

function logout() {
    sessionStorage.removeItem('studysync_active_session');
    currentUser = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-modal').classList.remove('hidden');
    switchAuthTab('login');
}

// STORAGE UTILITIES
function getUserData() {
    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
    return users[currentUser] || {};
}

function saveUserData(data) {
    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
    users[currentUser] = { ...users[currentUser], ...data };
    localStorage.setItem('studysync_users', JSON.stringify(users));
}

function getUserSubjects() {
    return JSON.parse(localStorage.getItem(`studysync_subjects_${currentUser}`) || '[]');
}

function saveUserSubjects(subs) {
    localStorage.setItem(`studysync_subjects_${currentUser}`, JSON.stringify(subs));
}

function getUserTasks() {
    return JSON.parse(localStorage.getItem(`studysync_tasks_${currentUser}`) || '[]');
}

function saveUserTasks(tasks) {
    localStorage.setItem(`studysync_tasks_${currentUser}`, JSON.stringify(tasks));
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

// NAVIGATION
function switchTab(tabId) {
    activeTab = tabId;
    ['dashboard', 'subjects', 'tasks', 'groups', 'materials', 'profile'].forEach(id => {
        const sec = document.getElementById(`view-${id}`);
        const btn = document.getElementById(`nav-tab-${id}`);
        if (id === tabId) {
            sec.classList.remove('hidden');
            btn.className = "py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 transition-colors whitespace-nowrap";
        } else {
            sec.classList.add('hidden');
            btn.className = "py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors whitespace-nowrap";
        }
    });

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'subjects') renderSubjects();
    if (tabId === 'tasks') renderTasks();
    if (tabId === 'groups') renderGroupsWorkspace();
    if (tabId === 'materials') renderMaterials();
    if (tabId === 'profile') loadProfileView();
}

// DEADLINE HELPER
function calculateDeadlineInfo(deadlineStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(deadlineStr);
    due.setHours(0,0,0,0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `OVERDUE (${deadlineStr})`, color: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-800' };
    if (diffDays === 0) return { label: `DUE TODAY (${deadlineStr})`, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    if (diffDays === 1) return { label: `Due tomorrow (${deadlineStr})`, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
    return { label: `Due in ${diffDays} days (${deadlineStr})`, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
}

// DASHBOARD
function renderDashboard() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();
    const userData = getUserData();
    const joinedGroups = userData.joinedGroups || [];
    const globalMaterials = getGlobalMaterials();

    document.getElementById('stat-subjects-count').innerText = subjects.length;
    document.getElementById('stat-tasks-count').innerText = tasks.filter(t => !t.completed).length;
    document.getElementById('stat-groups-count').innerText = joinedGroups.length;

    const visibleMats = globalMaterials.filter(m => m.uploader === currentUser || (m.groupId && joinedGroups.includes(m.groupId)));
    document.getElementById('stat-materials-count').innerText = visibleMats.length;

    const grid = document.getElementById('dashboard-subject-progress-grid');
    if (subjects.length === 0) {
        grid.innerHTML = '<p class="text-xs text-slate-400 italic py-4 col-span-full">No subjects found.</p>';
        return;
    }

    grid.innerHTML = subjects.map(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const completedCount = subTasks.filter(t => t.completed).length;
        const total = subTasks.length;
        const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        const pendingTasks = subTasks.filter(t => !t.completed && t.deadline).sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
        const nearestTask = pendingTasks[0];
        const deadlineBadge = nearestTask ? calculateDeadlineInfo(nearestTask.deadline) : null;

        return `
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-sm text-slate-900 dark:text-white">${sub.name}</h4>
                    <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${percent}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>${completedCount} / ${total} Tasks</span>
                    ${deadlineBadge ? `<span class="px-2 py-0.5 rounded border ${deadlineBadge.color} font-medium text-[11px]">${deadlineBadge.label}</span>` : '<span class="text-slate-400">No pending deadlines</span>'}
                </div>
            </div>
        `;
    }).join('');
}

// SUBJECTS
function renderSubjects() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();
    const grid = document.getElementById('subjects-grid');

    if (subjects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p class="text-sm text-slate-500 mb-3">You haven't created any subjects yet.</p>
                <button type="button" onclick="openSubjectModal()" class="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg">+ Add Subject</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = subjects.map(sub => {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        const completedCount = subTasks.filter(t => t.completed).length;
        const total = subTasks.length;
        const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        return `
            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                    <div class="flex items-start justify-between">
                        <h3 class="font-bold text-base text-slate-900 dark:text-white">${sub.name}</h3>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="openSubjectModal('${sub.id}')" class="p-1 text-slate-400 hover:text-indigo-600 text-xs">✏️</button>
                            <button type="button" onclick="deleteSubject('${sub.id}')" class="p-1 text-slate-400 hover:text-red-600 text-xs">🗑️</button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${total} total task(s) assigned</p>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium">${completedCount} / ${total} Tasks Done</span>
                        <span class="font-bold text-indigo-600 dark:text-indigo-400">${percent}%</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                    </div>
                    <button type="button" onclick="filterTasksBySubject('${sub.id}')" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 inline-block">View Tasks →</button>
                </div>
            </div>
        `;
    }).join('');
}

function openSubjectModal(editId = null) {
    document.getElementById('edit-subject-id').value = editId || '';
    document.getElementById('sub-name').value = '';
    const modal = document.getElementById('subject-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (editId) {
        document.getElementById('subject-modal-title').innerText = "Edit Subject";
        const subjects = getUserSubjects();
        const target = subjects.find(s => s.id === editId);
        if (target) document.getElementById('sub-name').value = target.name;
    } else {
        document.getElementById('subject-modal-title').innerText = "Create Subject";
    }
}

function closeSubjectModal() {
    const modal = document.getElementById('subject-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleSubjectSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('sub-name').value.trim();
    const editId = document.getElementById('edit-subject-id').value;
    if (!name) return;

    let subjects = getUserSubjects();
    if (editId) {
        subjects = subjects.map(s => s.id === editId ? { ...s, name } : s);
    } else {
        subjects.push({ id: `sub-${Date.now()}`, name });
    }
    saveUserSubjects(subjects);
    closeSubjectModal();
    renderSubjects();
    renderDashboard();
}

function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this subject? Associated tasks will be removed.")) return;
    let subjects = getUserSubjects().filter(s => s.id !== id);
    saveUserSubjects(subjects);
    let tasks = getUserTasks().filter(t => t.subjectId !== id);
    saveUserTasks(tasks);
    renderSubjects();
    renderDashboard();
}

// TASK PLANNER
function filterTasksBySubject(subId) {
    currentTaskSubjectFilter = subId;
    switchTab('tasks');
}

function filterTasks(status) {
    currentTaskFilter = status;
    ['all', 'pending', 'completed'].forEach(st => {
        const btn = document.getElementById(`filter-task-${st}`);
        if (st === status) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";
        }
    });
    renderTasks();
}

function renderTasks() {
    const subjects = getUserSubjects();
    const tasks = getUserTasks();

    // Render Subject Tabs
    const tabsContainer = document.getElementById('task-subject-tabs');
    let tabsHtml = `<button type="button" onclick="setTaskSubjectTab('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${currentTaskSubjectFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">All Subjects</button>`;
    subjects.forEach(sub => {
        tabsHtml += `<button type="button" onclick="setTaskSubjectTab('${sub.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${currentTaskSubjectFilter === sub.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">${sub.name}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    // Filter tasks
    let filtered = tasks;
    if (currentTaskSubjectFilter !== 'ALL') {
        filtered = filtered.filter(t => t.subjectId === currentTaskSubjectFilter);
    }
    if (currentTaskFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (currentTaskFilter === 'completed') filtered = filtered.filter(t => t.completed);

    const listContainer = document.getElementById('tasks-list');
    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">No tasks found matching your filter.</div>`;
        return;
    }

    listContainer.innerHTML = filtered.map(t => {
        const sub = subjects.find(s => s.id === t.subjectId);
        const subName = sub ? sub.name : 'Unassigned';
        const deadlineInfo = calculateDeadlineInfo(t.deadline);

        return `
            <div class="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4">
                <div class="flex items-start gap-3">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTaskComplete('${t.id}')" class="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer">
                    <div>
                        <h4 class="font-bold text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}">${t.title}</h4>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                            <span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">${subName}</span>
                            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium">${t.category || 'General'}</span>
                            <span class="px-2 py-0.5 rounded border text-[11px] font-medium ${deadlineInfo.color}">${deadlineInfo.label}</span>
                        </div>
                        ${t.files && t.files.length > 0 ? `
                            <div class="mt-2 flex flex-wrap gap-2">
                                ${t.files.map(f => `
                                    <a href="${f.data}" download="${f.name}" class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                        📎 ${f.name}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="openTaskModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 text-xs">✏️ Edit</button>
                    <button type="button" onclick="deleteTask('${t.id}')" class="p-1.5 text-slate-400 hover:text-red-600 text-xs">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function setTaskSubjectTab(subId) {
    currentTaskSubjectFilter = subId;
    renderTasks();
}

function toggleTaskComplete(id) {
    let tasks = getUserTasks();
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveUserTasks(tasks);
    renderTasks();
    renderDashboard();
    renderSubjects();
}

function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    let tasks = getUserTasks().filter(t => t.id !== id);
    saveUserTasks(tasks);
    renderTasks();
    renderDashboard();
    renderSubjects();
}

function openTaskModal(editId = null) {
    const subjects = getUserSubjects();
    if (subjects.length === 0) {
        alert("Please create at least one subject before adding tasks.");
        return;
    }

    const select = document.getElementById('task-subject-select');
    select.innerHTML = '<option value="" disabled selected>-- Choose Subject --</option>' + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    document.getElementById('edit-task-id').value = editId || '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-category').value = '';
    document.getElementById('task-files').value = '';

    const modal = document.getElementById('task-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (editId) {
        document.getElementById('task-modal-title').innerText = "Edit Task";
        const tasks = getUserTasks();
        const target = tasks.find(t => t.id === editId);
        if (target) {
            document.getElementById('task-title').value = target.title;
            document.getElementById('task-subject-select').value = target.subjectId;
            document.getElementById('task-deadline').value = target.deadline;
            document.getElementById('task-category').value = target.category || '';
        }
    } else {
        document.getElementById('task-modal-title').innerText = "Create New Task";
    }
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const subjectId = document.getElementById('task-subject-select').value;
    const deadline = document.getElementById('task-deadline').value;
    const category = document.getElementById('task-category').value;
    const editId = document.getElementById('edit-task-id').value;
    const fileInput = document.getElementById('task-files');

    if (!title || !subjectId || !deadline) return;

    let tasks = getUserTasks();
    const existingTask = editId ? tasks.find(t => t.id === editId) : null;
    let fileList = existingTask && existingTask.files ? [...existingTask.files] : [];

    const processFiles = () => {
        if (editId) {
            tasks = tasks.map(t => t.id === editId ? { ...t, title, subjectId, deadline, category, files: fileList } : t);
        } else {
            const newTask = {
                id: `task-${Date.now()}`,
                title,
                subjectId,
                deadline,
                category,
                completed: false,
                files: fileList
            };
            tasks.push(newTask);

            fileList.forEach(f => {
                const allMat = getGlobalMaterials();
                allMat.push({
                    id: `mat-${Date.now()}-${Math.random()}`,
                    title: f.name,
                    category: category,
                    uploader: currentUser,
                    date: new Date().toLocaleDateString(),
                    fileData: f.data
                });
                saveGlobalMaterials(allMat);
            });
        }

        saveUserTasks(tasks);
        closeTaskModal();
        renderTasks();
        renderDashboard();
        renderSubjects();
    };

    if (fileInput.files.length > 0) {
        let filesRead = 0;
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const reader = new FileReader();
            reader.onload = function(evt) {
                fileList.push({ name: file.name, data: evt.target.result });
                filesRead++;
                if (filesRead === fileInput.files.length) processFiles();
            };
            reader.readAsDataURL(file);
        }
    } else {
        processFiles();
    }
}

// STUDY GROUPS & CHAT
function renderGroupsWorkspace() {
    const userData = getUserData();
    const joinedGroupIds = userData.joinedGroups || [];
    const globalGroups = getGlobalGroups();
    const userGroups = globalGroups.filter(g => joinedGroupIds.includes(g.id));

    const tabsContainer = document.getElementById('group-selector-tabs');
    if (userGroups.length === 0) {
        tabsContainer.innerHTML = '<p class="text-xs text-slate-400 italic py-1">You are not a member of any study groups. Create or join one below.</p>';
        activeGroupId = null;
        renderActiveGroupDetails(null);
        return;
    }

    if (!activeGroupId || !joinedGroupIds.includes(activeGroupId)) {
        activeGroupId = userGroups[0].id;
    }

    tabsContainer.innerHTML = userGroups.map(g => `
        <button type="button" onclick="selectGroup('${g.id}')" class="px-4 py-2 rounded-lg text-xs font-semibold ${g.id === activeGroupId ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}">
            ${g.name} (${g.code})
        </button>
    `).join('');

    const targetGroup = globalGroups.find(g => g.id === activeGroupId);
    renderActiveGroupDetails(targetGroup);
}

function selectGroup(gId) {
    activeGroupId = gId;
    renderGroupsWorkspace();
}

function renderActiveGroupDetails(group) {
    const leaveBtn = document.getElementById('leave-group-btn');
    if (!group) {
        document.getElementById('active-group-title').innerText = "Select a Study Group";
        document.getElementById('active-group-code').innerText = "Group Code: ---";
        document.getElementById('active-group-members-count').innerText = "0 Members";
        document.getElementById('chat-messages-container').innerHTML = '<div class="text-center text-slate-400 py-12 text-sm">Select or create a study group to start chatting.</div>';
        document.getElementById('group-members-list').innerHTML = '<p class="text-xs text-slate-400 italic">No group selected.</p>';
        if (leaveBtn) {
            leaveBtn.classList.add('hidden');
            leaveBtn.classList.remove('flex');
        }
        return;
    }

    if (leaveBtn) {
        leaveBtn.classList.remove('hidden');
        leaveBtn.classList.add('flex');
    }

    document.getElementById('active-group-title').innerText = group.name;
    document.getElementById('active-group-code').innerText = `Group Code: ${group.code}`;
    document.getElementById('active-group-members-count').innerText = `${group.members.length} Member(s)`;

    const messagesContainer = document.getElementById('chat-messages-container');
    const messages = group.messages || [];
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="text-center text-slate-400 py-12 text-sm">No messages yet. Start the conversation!</div>';
    } else {
        messagesContainer.innerHTML = messages.map(m => {
            const isSelf = m.sender === currentUser;
            return `
                <div class="flex flex-col ${isSelf ? 'items-end' : 'items-start'}">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">${m.sender}</span>
                        <span class="text-[10px] text-slate-400">${m.time}</span>
                    </div>
                    <div class="max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'} shadow-xs">
                        ${m.text ? `<p>${m.text}</p>` : ''}
                        ${m.file ? `
                            <div class="mt-2 pt-2 border-t ${isSelf ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between gap-3">
                                <span class="text-xs font-semibold truncate">📄 ${m.file.name}</span>
                                <a href="${m.file.data}" download="${m.file.name}" class="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">Download</a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    const membersList = document.getElementById('group-members-list');
    membersList.innerHTML = group.members.map(m => `
        <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60">
            <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">${m.charAt(0)}</div>
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">${m} ${m === group.creator ? '<span class="text-slate-400 font-normal">(Creator)</span>' : ''}</span>
        </div>
    `).join('');
}

function sendChatMessage() {
    if (!activeGroupId) return;
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text) return;

    const globalGroups = getGlobalGroups();
    const groupIndex = globalGroups.findIndex(g => g.id === activeGroupId);
    if (groupIndex === -1) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    globalGroups[groupIndex].messages = globalGroups[groupIndex].messages || [];
    globalGroups[groupIndex].messages.push({
        sender: currentUser,
        text,
        time: timeStr
    });

    saveGlobalGroups(globalGroups);
    input.value = '';
    renderActiveGroupDetails(globalGroups[groupIndex]);
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function handleChatFileUpload(e) {
    if (!activeGroupId) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const globalGroups = getGlobalGroups();
        const groupIndex = globalGroups.findIndex(g => g.id === activeGroupId);
        if (groupIndex === -1) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        globalGroups[groupIndex].messages = globalGroups[groupIndex].messages || [];
        globalGroups[groupIndex].messages.push({
            sender: currentUser,
            text: `Shared file: ${file.name}`,
            time: timeStr,
            file: { name: file.name, data: evt.target.result }
        });
        saveGlobalGroups(globalGroups);

        const globalMats = getGlobalMaterials();
        globalMats.push({
            id: `mat-${Date.now()}-${Math.random()}`,
            title: file.name,
            category: 'Group Resources',
            uploader: currentUser,
            groupId: activeGroupId,
            groupName: globalGroups[groupIndex].name,
            date: new Date().toLocaleDateString(),
            fileData: evt.target.result
        });
        saveGlobalMaterials(globalMats);

        document.getElementById('chat-file-input').value = '';
        renderActiveGroupDetails(globalGroups[groupIndex]);
        renderDashboard();
    };
    reader.readAsDataURL(file);
}

function leaveCurrentGroup() {
    if (!activeGroupId) return;
    const globalGroups = getGlobalGroups();
    const group = globalGroups.find(g => g.id === activeGroupId);
    if (!group) return;

    const confirmLeave = window.confirm(`Are you sure you want to leave ${group.name}? Files shared in this group will be removed from your Materials Library.`);
    if (!confirmLeave) return;

    const leavingGroupId = activeGroupId;

    group.members = group.members.filter(m => m !== currentUser);
    saveGlobalGroups(globalGroups);

    const userData = getUserData();
    userData.joinedGroups = (userData.joinedGroups || []).filter(gId => gId !== leavingGroupId);
    saveUserData(userData);

    activeGroupId = null;
    renderGroupsWorkspace();
    renderDashboard();
    if (activeTab === 'materials') {
        renderMaterials();
    }
}

function openCreateGroupModal() {
    document.getElementById('new-group-name').value = '';
    const modal = document.getElementById('create-group-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCreateGroupModal() {
    const modal = document.getElementById('create-group-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleCreateGroupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-group-name').value.trim();
    if (!name) return;

    const code = 'GRP-' + Math.floor(1000 + Math.random() * 9000);
    const newGroup = {
        id: `grp-${Date.now()}`,
        name,
        code,
        creator: currentUser,
        members: [currentUser],
        messages: []
    };

    const globalGroups = getGlobalGroups();
    globalGroups.push(newGroup);
    saveGlobalGroups(globalGroups);

    const userData = getUserData();
    userData.joinedGroups = userData.joinedGroups || [];
    userData.joinedGroups.push(newGroup.id);
    saveUserData(userData);

    closeCreateGroupModal();
    activeGroupId = newGroup.id;
    renderGroupsWorkspace();
    renderDashboard();
}

function openJoinGroupModal() {
    document.getElementById('join-group-code-input').value = '';
    const modal = document.getElementById('join-group-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeJoinGroupModal() {
    const modal = document.getElementById('join-group-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleJoinGroupSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('join-group-code-input').value.trim().toUpperCase();
    if (!code) return;

    const globalGroups = getGlobalGroups();
    const group = globalGroups.find(g => g.code === code);

    if (!group) {
        alert("Invalid group code. Please check and try again.");
        return;
    }

    if (!group.members.includes(currentUser)) {
        group.members.push(currentUser);
        saveGlobalGroups(globalGroups);
    }

    const userData = getUserData();
    userData.joinedGroups = userData.joinedGroups || [];
    if (!userData.joinedGroups.includes(group.id)) {
        userData.joinedGroups.push(group.id);
        saveUserData(userData);
    }

    closeJoinGroupModal();
    activeGroupId = group.id;
    renderGroupsWorkspace();
    renderDashboard();
}

// MATERIALS LIBRARY
function filterMaterials(category) {
    currentMaterialFilter = category;
    const categories = ['ALL', 'Group Resources', 'Lecture Notes', 'Lab Guide', 'Exam Prep'];
    categories.forEach(cat => {
        const btn = document.getElementById(`mat-filter-${cat}`);
        if (btn) {
            if (cat === category) {
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";
            }
        }
    });

    const dropdownContainer = document.getElementById('material-group-dropdown-container');
    if (category === 'Group Resources') {
        dropdownContainer.classList.remove('hidden');
        populateMaterialGroupDropdown();
    } else {
        dropdownContainer.classList.add('hidden');
    }

    renderMaterials();
}

function populateMaterialGroupDropdown() {
    const userData = getUserData();
    const userGroups = userData.joinedGroups || [];
    const globalGroups = getGlobalGroups();
    const joinedGroups = globalGroups.filter(g => userGroups.includes(g.id));

    const select = document.getElementById('material-group-filter-select');
    select.innerHTML = '<option value="ALL">All Joined Groups</option>' + 
        joinedGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

function renderMaterials() {
    const userData = getUserData();
    const userGroups = userData.joinedGroups || [];
    const allMaterials = getGlobalMaterials();

    let visibleMaterials = allMaterials.filter(m => {
        const isOwner = m.uploader === currentUser;
        if (m.groupId) {
            return userGroups.includes(m.groupId);
        }
        return isOwner;
    });

    if (currentMaterialFilter !== 'ALL') {
        visibleMaterials = visibleMaterials.filter(m => m.category === currentMaterialFilter);
    }

    if (currentMaterialFilter === 'Group Resources') {
        const selectedGroupId = document.getElementById('material-group-filter-select').value;
        if (selectedGroupId !== 'ALL') {
            visibleMaterials = visibleMaterials.filter(m => m.groupId === selectedGroupId);
        }
    }

    const grid = document.getElementById('materials-grid');
    if (visibleMaterials.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-sm italic">No study materials found in this category.</div>';
        return;
    }

    grid.innerHTML = visibleMaterials.map(m => `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-start justify-between">
                    <h4 class="font-bold text-sm text-slate-900 dark:text-white truncate">${m.title}</h4>
                    <span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">${m.category}</span>
                </div>
                <p class="text-xs text-slate-400 mt-2">Shared by <span class="font-semibold text-slate-600 dark:text-slate-300">${m.uploader}</span> ${m.groupName ? `in <span class="font-semibold text-indigo-500">${m.groupName}</span>` : ''}</p>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span class="text-[11px] text-slate-400">${m.date}</span>
                <a href="${m.fileData}" download="${m.title}" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors">Download File</a>
            </div>
        </div>
    `).join('');
}

// PROFILE VIEW & EDITING
function loadProfileView() {
    const userData = getUserData();
    document.getElementById('profile-avatar-large').innerText = currentUser.charAt(0);
    document.getElementById('profile-display-name').innerText = currentUser;
    document.getElementById('profile-display-role').innerText = formatStudentSpecialty(userData.specialty || 'Student');

    document.getElementById('profile-input-username').value = currentUser;
    document.getElementById('profile-input-specialty').value = userData.specialty || '';
    document.getElementById('profile-input-university').value = userData.university || '';
    document.getElementById('profile-input-group').value = userData.groupName || '';
    document.getElementById('profile-input-password').value = '';
}

function formatStudentSpecialty(inputStr) {
    if (!inputStr || !inputStr.trim()) return 'Student';
    let cleaned = inputStr.trim();
    if (/\bstudent\b/i.test(cleaned)) {
        cleaned = cleaned.replace(/\bstudent\b/gi, 'Student');
    } else {
        cleaned = `${cleaned} Student`;
    }
    return cleaned;
}

function saveProfileSettings(e) {
    e.preventDefault();
    const newUsername = document.getElementById('profile-input-username').value.trim();
    const specialty = document.getElementById('profile-input-specialty').value.trim();
    const university = document.getElementById('profile-input-university').value.trim();
    const groupName = document.getElementById('profile-input-group').value.trim();
    const password = document.getElementById('profile-input-password').value;

    const userData = getUserData();

    if (password !== userData.password) {
        alert("Incorrect password. Settings were not saved.");
        return;
    }

    const formattedSpecialty = formatStudentSpecialty(specialty);
    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');

    if (newUsername !== currentUser) {
        if (users[newUsername]) {
            alert("Username already taken. Please pick another.");
            return;
        }

        const oldUserKey = currentUser;
        delete users[oldUserKey];
        
        users[newUsername] = {
            username: newUsername,
            password: password,
            specialty: formattedSpecialty,
            university,
            groupName,
            joinedGroups: userData.joinedGroups || []
        };
        localStorage.setItem('studysync_users', JSON.stringify(users));

        const subs = localStorage.getItem(`studysync_subjects_${oldUserKey}`);
        if (subs) {
            localStorage.setItem(`studysync_subjects_${newUsername}`, subs);
            localStorage.removeItem(`studysync_subjects_${oldUserKey}`);
        }
        const tasks = localStorage.getItem(`studysync_tasks_${oldUserKey}`);
        if (tasks) {
            localStorage.setItem(`studysync_tasks_${newUsername}`, tasks);
            localStorage.removeItem(`studysync_tasks_${oldUserKey}`);
        }

        const globalGroups = getGlobalGroups();
        globalGroups.forEach(g => {
            g.members = g.members.map(m => m === oldUserKey ? newUsername : m);
            if (g.creator === oldUserKey) g.creator = newUsername;
        });
        saveGlobalGroups(globalGroups);

        currentUser = newUsername;
        sessionStorage.setItem('studysync_active_session', newUsername);
        document.getElementById('nav-username').innerText = newUsername;
        document.getElementById('nav-user-avatar').innerText = newUsername.charAt(0);
    } else {
        saveUserData({
            specialty: formattedSpecialty,
            university,
            groupName
        });
    }

    document.getElementById('profile-display-name').innerText = currentUser;
    document.getElementById('profile-display-role').innerText = formattedSpecialty;
    document.getElementById('profile-input-password').value = '';

    alert("Profile settings updated successfully!");
}