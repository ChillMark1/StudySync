// Storage Keys
const STORAGE_USERS = 'studysync_app_users';
const STORAGE_SESSION = 'studysync_app_session';
const STORAGE_DATA = 'studysync_app_data_';
const STORAGE_GROUPS = 'studysync_app_shared_groups';
const STORAGE_THEME = 'studysync_app_theme';
const STORAGE_REMEMBER = 'studysync_app_remember_credentials';

// State Container
let currentUser = null;
let userData = {
    groupCode: null,
    subjects: [],
    materials: []
};
let activeTab = 'dashboard';
let selectedMaterialCategory = 'ALL';
let pendingUploadFile = null;
let stagedSubjectFiles = [];

// --- THEME & UTILITY FUNCTIONS ---
function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_THEME);
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcon(false);
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_THEME, isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon text-slate-500';
    }
}

function hashPassword(pwd) {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
        const char = pwd.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_USERS)) || {};
    } catch (e) {
        return {};
    }
}

function getGlobalGroups() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_GROUPS)) || {};
    } catch (e) {
        return {};
    }
}

function saveGlobalGroups(groups) {
    localStorage.setItem(STORAGE_GROUPS, JSON.stringify(groups));
}

function showAuthError(msg) {
    const banner = document.getElementById('auth-error-banner');
    const text = document.getElementById('auth-error-text');
    if (!msg) {
        banner.classList.add('hidden');
    } else {
        text.innerText = msg;
        banner.classList.remove('hidden');
    }
}

function switchAuthTab(mode) {
    showAuthError(null);
    document.getElementById('auth-mode').value = mode;
    const btnLogin = document.getElementById('btn-toggle-login');
    const btnRegister = document.getElementById('btn-toggle-register');
    const subtitle = document.getElementById('auth-subtitle');
    const registerFields = document.getElementById('register-fields');
    const rememberContainer = document.getElementById('remember-me-container');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (mode === 'login') {
        btnLogin.className = 'flex-1 py-2 text-xs font-semibold rounded-lg transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm';
        btnRegister.className = 'flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
        subtitle.innerText = 'Sign in to access your study planner and collaborative workspace.';
        registerFields.classList.add('hidden');
        rememberContainer.classList.remove('hidden');
        submitBtn.querySelector('span').innerText = 'Log In';
        fillRememberedCredentials();
    } else {
        btnRegister.className = 'flex-1 py-2 text-xs font-semibold rounded-lg transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm';
        btnLogin.className = 'flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
        subtitle.innerText = 'Create a new account to organize your subjects and study materials.';
        registerFields.classList.remove('hidden');
        rememberContainer.classList.add('hidden');
        submitBtn.querySelector('span').innerText = 'Register Account';
    }
}

function saveData() {
    if (currentUser) {
        localStorage.setItem(STORAGE_DATA + currentUser.toLowerCase(), JSON.stringify(userData));
    }
}

function loadUserData() {
    if (!currentUser) return;
    try {
        const saved = localStorage.getItem(STORAGE_DATA + currentUser.toLowerCase());
        if (saved) {
            userData = JSON.parse(saved);
            if (!userData.subjects) userData.subjects = [];
            if (!userData.materials) userData.materials = [];
        } else {
            userData = { groupCode: null, subjects: [], materials: [] };
        }
    } catch (e) {
        userData = { groupCode: null, subjects: [], materials: [] };
    }
}

function initApp() {
    if (!currentUser) return;
    document.getElementById('display-name').innerText = currentUser;
    document.getElementById('dash-user-name').innerText = currentUser;
    document.getElementById('user-avatar').innerText = currentUser.charAt(0).toUpperCase();
    
    renderGroupInfo();
    renderGroupChat();
    renderTasks();
    renderMaterials();
    renderDashboard();
    renderAnalytics();
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('#desktop-nav .nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.className = 'nav-btn active px-3.5 py-2 rounded-lg text-sm font-medium transition-all text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-slate-700';
        } else {
            btn.className = 'nav-btn px-3.5 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700';
        }
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.className = 'mobile-nav-btn py-2 px-2 flex flex-col items-center text-brand-600 dark:text-brand-400 font-medium';
        } else {
            btn.className = 'mobile-nav-btn py-2 px-2 flex flex-col items-center text-slate-500 dark:text-slate-400 font-medium';
        }
    });
}

function calculateDeadlineInfo(deadlineStr) {
    if (!deadlineStr) return { text: 'No Deadline', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
    const now = new Date();
    const due = new Date(deadlineStr);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, color: 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300' };
    } else if (diffDays === 0) {
        return { text: 'Due Today', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' };
    } else if (diffDays <= 3) {
        return { text: `Due in ${diffDays} day(s)`, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' };
    } else {
        return { text: `Due in ${diffDays} days`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' };
    }
}

// --- GROUP & CHAT HANDLERS ---
function renderGroupInfo() {
    const groups = getGlobalGroups();
    const displayGroup = document.getElementById('display-group');
    const titleDisplay = document.getElementById('group-title-display');
    const codeDisplay = document.getElementById('group-code-display');
    const membersList = document.getElementById('group-members-list');

    if (userData.groupCode && groups[userData.groupCode]) {
        const grp = groups[userData.groupCode];
        displayGroup.innerText = grp.name;
        titleDisplay.innerText = grp.name;
        codeDisplay.innerText = `Group Join Code: ${grp.code}`;

        if (!grp.members.includes(currentUser)) {
            grp.members.push(currentUser);
            saveGlobalGroups(groups);
        }

        membersList.innerHTML = grp.members.map(m => `
            <div class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <div class="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]">
                    ${m.charAt(0).toUpperCase()}
                </div>
                <span>${escapeHtml(m)} ${m === currentUser ? '<span class="text-[10px] text-slate-400">(You)</span>' : ''}</span>
            </div>
        `).join('');
    } else {
        displayGroup.innerText = 'No Group';
        titleDisplay.innerText = 'No Active Group';
        codeDisplay.innerText = 'Create or join a study group below.';
        membersList.innerHTML = '<p class="text-xs text-slate-400 italic">No members yet.</p>';
    }
}

function handleCreateGroup(event) {
    event.preventDefault();
    const nameInput = document.getElementById('create-group-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const code = 'GRP-' + Math.floor(1000 + Math.random() * 9000);
    const groups = getGlobalGroups();

    groups[code] = {
        code: code,
        name: name,
        members: [currentUser],
        messages: []
    };

    saveGlobalGroups(groups);
    userData.groupCode = code;
    saveData();

    nameInput.value = '';
    renderGroupInfo();
    renderGroupChat();
    updateDashboardStats();
    showToast(`Group "${name}" created! Code: ${code}`, 'success');
}

function handleJoinGroup(event) {
    event.preventDefault();
    const codeInput = document.getElementById('join-group-code');
    const code = codeInput.value.trim().toUpperCase();
    const groups = getGlobalGroups();

    if (!groups[code]) {
        showToast('Invalid Group Code. Please check and try again.', 'error');
        return;
    }

    if (!groups[code].members.includes(currentUser)) {
        groups[code].members.push(currentUser);
        saveGlobalGroups(groups);
    }

    userData.groupCode = code;
    saveData();

    codeInput.value = '';
    renderGroupInfo();
    renderGroupChat();
    updateDashboardStats();
    showToast(`Successfully joined "${groups[code].name}"!`, 'success');
}

function renderGroupChat() {
    const chatContainer = document.getElementById('chat-messages');
    const groups = getGlobalGroups();

    if (!userData.groupCode || !groups[userData.groupCode]) {
        chatContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-10">Join or create a study group to access the group chat space!</p>';
        return;
    }

    const msgs = groups[userData.groupCode].messages || [];
    if (msgs.length === 0) {
        chatContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-10">No messages yet. Send a message to start the conversation!</p>';
        return;
    }

    chatContainer.innerHTML = msgs.map(m => {
        const isMe = m.sender === currentUser;
        return `
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1">
                <span class="text-[10px] text-slate-400 px-1">${escapeHtml(m.sender)} • ${m.time}</span>
                <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'} shadow-sm">
                    ${escapeHtml(m.text)}
                    ${m.attachment ? `
                        <div class="mt-2 pt-2 border-t ${isMe ? 'border-brand-500' : 'border-slate-200 dark:border-slate-600'}">
                            <a href="${m.attachment.url || m.attachment.data}" ${m.attachment.type === 'file' ? `download="${escapeHtml(m.attachment.title)}"` : 'target="_blank"'} class="flex items-center gap-2 font-semibold hover:underline">
                                <i class="fa-solid ${m.attachment.type === 'file' ? 'fa-file-arrow-down' : 'fa-link'}"></i>
                                <span class="truncate max-w-[150px]">${escapeHtml(m.attachment.title)}</span>
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function postChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    if (!userData.groupCode) {
        showToast('You must join or create a study group first.', 'error');
        return;
    }

    const groups = getGlobalGroups();
    if (!groups[userData.groupCode]) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    groups[userData.groupCode].messages.push({
        sender: currentUser,
        text: text,
        time: timeStr
    });

    saveGlobalGroups(groups);
    input.value = '';
    renderGroupChat();
}

// --- MATERIALS & FILE UPLOAD HANDLERS ---
function toggleMaterialModal(show) {
    const modal = document.getElementById('material-modal');
    if (show) {
        document.getElementById('material-form').reset();
        pendingUploadFile = null;
        document.getElementById('selected-file-badge').classList.add('hidden');
        switchMaterialSourceType('file');
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function switchMaterialSourceType(type) {
    document.getElementById('mat-source-type').value = type;
    const btnFile = document.getElementById('btn-mat-type-file');
    const btnLink = document.getElementById('btn-mat-type-link');
    const fileContainer = document.getElementById('material-file-container');
    const linkContainer = document.getElementById('material-link-container');

    if (type === 'file') {
        btnFile.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm';
        btnLink.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
        fileContainer.classList.remove('hidden');
        linkContainer.classList.add('hidden');
    } else {
        btnLink.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm';
        btnFile.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
        linkContainer.classList.remove('hidden');
        fileContainer.classList.add('hidden');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.add('border-brand-500', 'bg-brand-50/50');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.remove('border-brand-500', 'bg-brand-50/50');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.remove('border-brand-500', 'bg-brand-50/50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUploadFile(e.dataTransfer.files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        processUploadFile(e.target.files[0]);
    }
}

function processUploadFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds maximum 5MB limit.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        pendingUploadFile = {
            name: file.name,
            size: formatFileSize(file.size),
            data: e.target.result
        };
        document.getElementById('selected-file-name').innerText = file.name;
        document.getElementById('selected-file-size').innerText = `(${formatFileSize(file.size)})`;
        document.getElementById('selected-file-badge').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearSelectedFile() {
    pendingUploadFile = null;
    document.getElementById('mat-file-input').value = '';
    document.getElementById('selected-file-badge').classList.add('hidden');
}

function saveMaterial(event) {
    event.preventDefault();
    const title = document.getElementById('mat-title').value.trim();
    const category = document.getElementById('mat-category').value;
    const subject = document.getElementById('mat-subject').value.trim();
    const type = document.getElementById('mat-source-type').value;

    if (type === 'file' && !pendingUploadFile) {
        showToast('Please attach a file or switch to link sharing.', 'error');
        return;
    }

    const isGroupUpload = Boolean(userData.groupCode);
    const primaryCategory = isGroupUpload ? 'Group Resources' : category;

    const matObj = {
        id: 'mat_' + Date.now(),
        title,
        category: primaryCategory,
        subCategory: category,
        subject,
        type,
        uploader: currentUser,
        date: new Date().toLocaleDateString(),
        url: type === 'link' ? document.getElementById('mat-url').value.trim() : null,
        file: type === 'file' ? pendingUploadFile : null
    };

    if (!userData.materials) userData.materials = [];
    userData.materials.push(matObj);
    saveData();

    if (userData.groupCode) {
        const groups = getGlobalGroups();
        if (groups[userData.groupCode]) {
            const now = new Date();
            groups[userData.groupCode].messages.push({
                sender: currentUser,
                text: `Shared study material: "${title}"`,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                attachment: {
                    type,
                    title,
                    category: category,
                    subject: subject,
                    url: matObj.url,
                    data: matObj.file ? matObj.file.data : null
                }
            });
            saveGlobalGroups(groups);
            renderGroupChat();
        }
    }

    toggleMaterialModal(false);
    renderMaterials();
    renderDashboard();
    showToast('Study material shared successfully!', 'success');
}

function filterMaterials(cat) {
    selectedMaterialCategory = cat;
    document.querySelectorAll('.mat-filter-btn').forEach(btn => {
        if ((cat === 'ALL' && btn.innerText.includes('All')) || 
            (cat !== 'ALL' && btn.innerText.includes(cat))) {
            btn.className = 'mat-filter-btn active bg-brand-600 text-white px-3.5 py-1.5 rounded-full text-xs font-medium transition-all';
        } else {
            btn.className = 'mat-filter-btn bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all';
        }
    });
    renderMaterials();
}

function deleteMaterial(id) {
    if (confirm('Delete this material item?')) {
        userData.materials = userData.materials.filter(m => m.id !== id);
        saveData();
        renderMaterials();
        renderDashboard();
        showToast('Material deleted.', 'info');
    }
}

function renderMaterials() {
    const grid = document.getElementById('materials-grid');
    let list = (userData.materials || []).map(m => ({ ...m }));
    
    if (userData.groupCode) {
        const groups = getGlobalGroups();
        if (groups[userData.groupCode]) {
            const groupMsgs = groups[userData.groupCode].messages || [];
            groupMsgs.forEach(m => {
                if (m.attachment) {
                    const existingIndex = list.findIndex(item => item.title === m.attachment.title && item.uploader === m.sender);
                    if (existingIndex !== -1) {
                        list[existingIndex].category = 'Group Resources';
                        list[existingIndex].subCategory = list[existingIndex].subCategory || m.attachment.category || 'Lecture Notes';
                        list[existingIndex].isGroupShared = true;
                    } else {
                        list.push({
                            id: 'grp_mat_' + Math.random().toString(36).substr(2, 6),
                            title: m.attachment.title,
                            category: 'Group Resources',
                            subCategory: m.attachment.category || 'Lecture Notes',
                            subject: m.attachment.subject || `Group: ${groups[userData.groupCode].name}`,
                            type: m.attachment.type,
                            uploader: m.sender,
                            date: m.time || new Date().toLocaleDateString(),
                            url: m.attachment.url || null,
                            file: m.attachment.data ? { data: m.attachment.data, name: m.attachment.title } : null,
                            isGroupShared: true
                        });
                    }
                }
            });
        }
    }

    if (selectedMaterialCategory !== 'ALL') {
        if (selectedMaterialCategory === 'Group Resources') {
            list = list.filter(m => m.category === 'Group Resources' || m.isGroupShared);
        } else {
            list = list.filter(m => m.category === selectedMaterialCategory || m.subCategory === selectedMaterialCategory);
        }
    }

    if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-xs">No materials found for this category. Click "Upload / Share Material" to add resources.</div>';
        return;
    }

    grid.innerHTML = list.map(m => {
        const isGroupItem = m.isGroupShared || m.category === 'Group Resources';
        const displayCat = isGroupItem ? 'Group Resources' : (m.category || 'Lecture Notes');
        const subCatTag = m.subCategory ? ` • ${m.subCategory}` : '';

        return `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isGroupItem ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-300'}">
                            ${escapeHtml(displayCat)}
                        </span>
                        ${!m.isGroupShared && m.uploader === currentUser ? `
                            <button onclick="deleteMaterial('${m.id}')" class="text-slate-400 hover:text-red-500 text-xs"><i class="fa-solid fa-trash"></i></button>
                        ` : ''}
                    </div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">${escapeHtml(m.title)}</h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">Subject: ${escapeHtml(m.subject)}${escapeHtml(subCatTag)}</p>
                    <p class="text-[10px] text-slate-400">Shared by <span class="font-semibold text-slate-600 dark:text-slate-300">${escapeHtml(m.uploader)}</span> • ${m.date}</p>
                </div>
                <div class="pt-2 border-t border-slate-100 dark:border-slate-700">
                    ${m.type === 'file' && m.file ? `
                        <a href="${m.file.data}" download="${escapeHtml(m.title)}" class="w-full bg-brand-50 hover:bg-brand-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-brand-600 dark:text-brand-400 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                            <i class="fa-solid fa-download"></i> Download File
                        </a>
                    ` : `
                        <a href="${escapeHtml(m.url)}" target="_blank" class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Resource
                        </a>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// --- SUBJECT MODULES & FILES MANAGEMENT ---
function toggleSubjectModal(show) {
    const modal = document.getElementById('subject-modal');
    if (show) {
        document.getElementById('subject-form').reset();
        document.getElementById('subject-edit-id').value = '';
        document.getElementById('subject-modal-title').innerText = 'Create Subject Module';
        stagedSubjectFiles = [];
        renderStagedSubjectFiles();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function editSubjectModule(id) {
    const subj = (userData.subjects || []).find(s => s.id === id);
    if (!subj) return;

    document.getElementById('subject-edit-id').value = subj.id;
    document.getElementById('subject-name-input').value = subj.name;
    document.getElementById('subject-deadline-input').value = subj.deadline || '';
    document.getElementById('subject-modal-title').innerText = 'Edit Subject Module';
    stagedSubjectFiles = [...(subj.files || [])];
    renderStagedSubjectFiles();

    document.getElementById('subject-modal').classList.remove('hidden');
}

function handleSubjectDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('subject-file-drop-zone').classList.add('border-brand-500', 'bg-brand-50/50');
}

function handleSubjectDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('subject-file-drop-zone').classList.remove('border-brand-500', 'bg-brand-50/50');
}

function handleSubjectFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('subject-file-drop-zone').classList.remove('border-brand-500', 'bg-brand-50/50');
    if (e.dataTransfer.files) {
        Array.from(e.dataTransfer.files).forEach(file => addSubjectFile(file));
    }
}

function handleSubjectFilesSelect(e) {
    if (e.target.files) {
        Array.from(e.target.files).forEach(file => addSubjectFile(file));
    }
}

function addSubjectFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 5MB limit.`, 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        stagedSubjectFiles.push({
            id: 'f_' + Date.now() + Math.random().toString(36).substr(2, 4),
            name: file.name,
            size: formatFileSize(file.size),
            data: e.target.result,
            done: false
        });
        renderStagedSubjectFiles();
    };
    reader.readAsDataURL(file);
}

function removeStagedSubjectFile(index) {
    stagedSubjectFiles.splice(index, 1);
    renderStagedSubjectFiles();
}

function renderStagedSubjectFiles() {
    const container = document.getElementById('staged-subject-files');
    if (stagedSubjectFiles.length === 0) {
        container.innerHTML = '<p class="text-[11px] text-slate-400 italic">No files attached yet.</p>';
        return;
    }

    container.innerHTML = stagedSubjectFiles.map((f, i) => `
        <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 truncate">
                <i class="fa-solid fa-file text-brand-600 dark:text-brand-400"></i>
                <span class="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-100">${escapeHtml(f.name)}</span>
                <span class="text-[10px] text-slate-400">(${f.size})</span>
            </div>
            <button type="button" onclick="removeStagedSubjectFile(${i})" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

function saveSubjectModule(event) {
    event.preventDefault();
    const editId = document.getElementById('subject-edit-id').value;
    const name = document.getElementById('subject-name-input').value.trim();
    const deadline = document.getElementById('subject-deadline-input').value;

    if (!userData.subjects) userData.subjects = [];

    if (editId) {
        const subj = userData.subjects.find(s => s.id === editId);
        if (subj) {
            subj.name = name;
            subj.deadline = deadline;
            subj.files = stagedSubjectFiles;
        }
    } else {
        userData.subjects.push({
            id: 'subj_' + Date.now(),
            name,
            deadline,
            files: stagedSubjectFiles
        });
    }

    saveData();
    toggleSubjectModal(false);
    renderTasks();
    renderDashboard();
    renderAnalytics();
    showToast('Subject module saved successfully!', 'success');
}

function deleteSubjectModule(id) {
    if (confirm('Are you sure you want to delete this subject module?')) {
        userData.subjects = userData.subjects.filter(s => s.id !== id);
        saveData();
        renderTasks();
        renderDashboard();
        renderAnalytics();
        showToast('Subject module deleted.', 'info');
    }
}

function toggleSubjectFileDone(subjId, fileId) {
    const subj = (userData.subjects || []).find(s => s.id === subjId);
    if (!subj) return;

    const file = (subj.files || []).find(f => f.id === fileId);
    if (file) {
        file.done = !file.done;
        saveData();
        renderTasks();
        renderDashboard();
        renderAnalytics();
    }
}

function renderTasks() {
    const container = document.getElementById('subjects-list');
    const list = userData.subjects || [];

    if (list.length === 0) {
        container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-xs">No subject modules created yet. Click "Create Subject Module" to begin organizing your work!</div>';
        return;
    }

    container.innerHTML = list.map(subj => {
        const files = subj.files || [];
        const totalFiles = files.length;
        const doneFiles = files.filter(f => f.done).length;
        const pct = totalFiles > 0 ? Math.round((doneFiles / totalFiles) * 100) : 0;
        const remPct = 100 - pct;
        const deadlineInfo = calculateDeadlineInfo(subj.deadline);

        return `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
                <div class="flex items-start justify-between">
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-base">${escapeHtml(subj.name)}</h3>
                        <span class="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${deadlineInfo.color}">
                            ${deadlineInfo.text}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="editSubjectModule('${subj.id}')" class="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs p-1" title="Edit Subject Module"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteSubjectModule('${subj.id}')" class="text-slate-400 hover:text-red-500 text-xs p-1" title="Delete Subject Module"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-slate-600 dark:text-slate-300">${doneFiles}/${totalFiles} files completed</span>
                        <span class="text-amber-600 dark:text-amber-400">${remPct}% remaining</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                        <div class="bg-emerald-500 h-full transition-all duration-300" style="width: ${pct}%"></div>
                    </div>
                </div>

                <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module Study Resources</h4>
                    ${files.length === 0 ? '<p class="text-xs text-slate-400 italic">No files attached to this module.</p>' : ''}
                    <div class="space-y-1.5">
                        ${files.map(f => `
                            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs">
                                <label class="flex items-center gap-2 cursor-pointer truncate max-w-[75%]">
                                    <input type="checkbox" ${f.done ? 'checked' : ''} onchange="toggleSubjectFileDone('${subj.id}', '${f.id}')" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500">
                                    <span class="${f.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'} font-medium truncate">${escapeHtml(f.name)}</span>
                                </label>
                                ${f.data ? `
                                    <a href="${f.data}" download="${escapeHtml(f.name)}" class="text-brand-600 dark:text-brand-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
                                        <i class="fa-solid fa-download"></i> Get
                                    </a>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- DASHBOARD & ANALYTICS ---
function renderDashboard() {
    updateDashboardStats();

    const urgentContainer = document.getElementById('dashboard-urgent-tasks');
    const subjects = (userData.subjects || []).slice().sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (subjects.length === 0) {
        urgentContainer.innerHTML = '<p class="text-xs text-slate-400 italic py-4">No urgent tasks or subject modules scheduled.</p>';
    } else {
        urgentContainer.innerHTML = subjects.slice(0, 4).map(subj => {
            const files = subj.files || [];
            const totalFiles = files.length;
            const doneFiles = files.filter(f => f.done).length;
            const pct = totalFiles > 0 ? Math.round((doneFiles / totalFiles) * 100) : 0;
            const remPct = 100 - pct;
            const dInfo = calculateDeadlineInfo(subj.deadline);

            return `
                <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div class="space-y-1">
                        <h4 class="font-bold text-slate-900 dark:text-white">${escapeHtml(subj.name)}</h4>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-slate-600 dark:text-slate-300">${doneFiles}/${totalFiles} completed (${pct}%)</span>
                            <span class="text-slate-300 dark:text-slate-600">•</span>
                            <span class="font-semibold text-amber-600 dark:text-amber-400">${remPct}% remaining</span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full font-bold text-[10px] self-start sm:self-center ${dInfo.color}">${dInfo.text}</span>
                </div>
            `;
        }).join('');
    }

    renderRecentMaterials();
}

function updateDashboardStats() {
    let totalFiles = 0;
    let doneFiles = 0;

    (userData.subjects || []).forEach(s => {
        const files = s.files || [];
        totalFiles += files.length;
        doneFiles += files.filter(f => f.done).length;
    });

    document.getElementById('stat-total-tasks').innerText = totalFiles;
    document.getElementById('stat-completed-tasks').innerText = doneFiles;
    document.getElementById('stat-pending-tasks').innerText = totalFiles - doneFiles;

    const groups = getGlobalGroups();
    if (userData.groupCode && groups[userData.groupCode]) {
        document.getElementById('stat-active-group').innerText = groups[userData.groupCode].name;
    } else {
        document.getElementById('stat-active-group').innerText = 'None';
    }
}

function renderRecentMaterials() {
    const container = document.getElementById('dashboard-recent-materials');
    const list = (userData.materials || []).slice(-3).reverse();

    if (list.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic py-4">No recent study materials uploaded yet.</p>';
        return;
    }

    container.innerHTML = list.map(m => `
        <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between text-xs">
            <div class="truncate max-w-[70%]">
                <p class="font-bold text-slate-900 dark:text-white truncate">${escapeHtml(m.title)}</p>
                <p class="text-[10px] text-slate-400 truncate">${escapeHtml(m.subject)} • ${m.date}</p>
            </div>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-slate-600 dark:text-brand-300">${escapeHtml(m.category)}</span>
        </div>
    `).join('');
}

function renderAnalytics() {
    let total = 0;
    let done = 0;

    (userData.subjects || []).forEach(s => {
        const files = s.files || [];
        total += files.length;
        done += files.filter(f => f.done).length;
    });

    const pending = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const remPct = 100 - pct;

    document.getElementById('analytics-total-count').innerText = total;
    document.getElementById('analytics-done-count').innerText = done;
    document.getElementById('analytics-pending-count').innerText = pending;
    document.getElementById('analytics-percentage-text').innerText = `${pct}% Completed`;
    document.getElementById('analytics-remaining-text').innerText = `${remPct}% Remaining`;
    document.getElementById('analytics-progress-bar').style.width = `${pct}%`;

    const breakdown = document.getElementById('analytics-subject-breakdown');
    const subjects = userData.subjects || [];

    if (subjects.length === 0) {
        breakdown.innerHTML = '<p class="text-xs text-slate-400 italic">No subject modules available for analytical breakdown.</p>';
        return;
    }

    breakdown.innerHTML = subjects.map(s => {
        const files = s.files || [];
        const sTotal = files.length;
        const sDone = files.filter(f => f.done).length;
        const sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;
        const sRemPct = 100 - sPct;

        return `
            <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                    <span class="text-slate-800 dark:text-slate-200">${escapeHtml(s.name)}</span>
                    <div>
                        <span class="text-emerald-600 dark:text-emerald-400">${sDone}/${sTotal} (${sPct}%)</span>
                        <span class="text-slate-400 mx-1">•</span>
                        <span class="text-amber-600 dark:text-amber-400">${sRemPct}% remaining</span>
                    </div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                    <div class="bg-brand-600 h-full rounded-full transition-all duration-300" style="width: ${sPct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- AUTHENTICATION & SESSION ---
function fillRememberedCredentials() {
    try {
        const rem = JSON.parse(localStorage.getItem(STORAGE_REMEMBER));
        if (rem && rem.username && rem.password) {
            document.getElementById('auth-username').value = rem.username;
            document.getElementById('auth-password').value = rem.password;
            document.getElementById('auth-remember').checked = true;
        }
    } catch (e) {}
}

function checkSession() {
    initTheme();
    fillRememberedCredentials();

    const sessionUser = localStorage.getItem(STORAGE_SESSION);
    if (sessionUser) {
        currentUser = sessionUser;
        loadUserData();
        document.getElementById('auth-modal').classList.add('hidden');
        initApp();
    } else {
        document.getElementById('auth-modal').classList.remove('hidden');
    }
}

function handleAuthSubmit(event) {
    event.preventDefault();
    showAuthError(null);

    const mode = document.getElementById('auth-mode').value;
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const confirmPassword = document.getElementById('auth-confirm-password').value;
    const remember = document.getElementById('auth-remember').checked;

    if (!username || !password) {
        showAuthError('Please fill in all required fields.');
        return;
    }

    const users = getUsers();
    const lowerUser = username.toLowerCase();

    if (mode === 'register') {
        if (password !== confirmPassword) {
            showAuthError('Passwords do not match.');
            return;
        }
        if (users[lowerUser]) {
            showAuthError('Account already registered. Please log in.');
            return;
        }

        users[lowerUser] = {
            username: username,
            passwordHash: hashPassword(password)
        };
        localStorage.setItem(STORAGE_USERS, JSON.stringify(users));

        currentUser = username;
        localStorage.setItem(STORAGE_SESSION, currentUser);

        if (remember) {
            localStorage.setItem(STORAGE_REMEMBER, JSON.stringify({ username, password }));
        } else {
            localStorage.removeItem(STORAGE_REMEMBER);
        }

        loadUserData();
        document.getElementById('auth-modal').classList.add('hidden');
        initApp();
        showToast(`Welcome to StudySync, ${username}!`, 'success');
    } else {
        if (!users[lowerUser] || users[lowerUser].passwordHash !== hashPassword(password)) {
            showAuthError('Invalid username or password.');
            return;
        }

        currentUser = users[lowerUser].username;
        localStorage.setItem(STORAGE_SESSION, currentUser);

        if (remember) {
            localStorage.setItem(STORAGE_REMEMBER, JSON.stringify({ username: currentUser, password }));
        } else {
            localStorage.removeItem(STORAGE_REMEMBER);
        }

        loadUserData();
        document.getElementById('auth-modal').classList.add('hidden');
        initApp();
        showToast(`Logged in successfully as ${currentUser}!`, 'success');
    }
}

function logout() {
    localStorage.removeItem(STORAGE_SESSION);
    currentUser = null;
    userData = { groupCode: null, subjects: [], materials: [] };

    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.reset();

    const rememberData = localStorage.getItem(STORAGE_REMEMBER);
    if (!rememberData) {
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-remember').checked = false;
    }

    switchAuthTab('login');
    document.getElementById('auth-modal').classList.remove('hidden');
    showToast('You have logged out.', 'info');
}

// --- GENERAL HELPERS ---
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let colorClasses = 'bg-slate-800 text-white border-slate-700';
    if (type === 'success') colorClasses = 'bg-emerald-600 text-white border-emerald-500';
    if (type === 'error') colorClasses = 'bg-red-600 text-white border-red-500';

    toast.className = `p-3 rounded-lg border shadow-xl text-xs font-semibold flex items-center justify-between gap-3 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${colorClasses}`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `studysync_backup_${currentUser || 'user'}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
    showToast('JSON backup file exported!', 'success');
}

function clearAllUserData() {
    if (confirm('Warning: This will reset all your subjects, files, and materials. Continue?')) {
        userData = { groupCode: null, subjects: [], materials: [] };
        saveData();
        initApp();
        showToast('User data reset complete.', 'info');
    }
}

window.onload = function() {
    checkSession();
};