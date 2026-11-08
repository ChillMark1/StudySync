<<<<<<< HEAD
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

    // Verify password before saving changes or changing username
    if (userAccount.password !== hashPassword(confirmPassword)) {
        alert('Incorrect password! Please enter your correct password to save changes.');
        return;
    }

    const formattedSpecialty = formatStudentSpecialty(rawSpecialty);

    // If changing username, check availability & update data references
    if (newUsername !== currentUser) {
        if (!newUsername) {
            alert('Username cannot be empty.');
            return;
        }
        if (users[newUsername]) {
            alert('Username is already taken by another account.');
            return;
        }

        // Migrate User Account Key
        users[newUsername] = {
            ...userAccount,
            specialty: formattedSpecialty,
            university: university,
            groupName: groupName
        };
        delete users[currentUser];

        // Migrate User Data Keys (tasks, subjects, materials)
        ['tasks', 'subjects', 'materials'].forEach(key => {
            const oldData = localStorage.getItem(`studysync_${currentUser}_${key}`);
            if (oldData) {
                localStorage.setItem(`studysync_${newUsername}_${key}`, oldData);
                localStorage.removeItem(`studysync_${currentUser}_${key}`);
            }
        });

        // Update username references in Global Groups
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

        // Update username references in Global Materials
        let globalMats = getGlobalMaterials();
        globalMats = globalMats.map(m => {
            if (m.sharedBy === currentUser) m.sharedBy = newUsername;
            return m;
        });
        saveGlobalMaterials(globalMats);

        // Update saved Remember Me credentials if active
        if (localStorage.getItem('studysync_remember_user') === currentUser) {
            localStorage.setItem('studysync_remember_user', newUsername);
        }

        // Set active user to new username
        currentUser = newUsername;
        document.getElementById('nav-username').textContent = currentUser;
        document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();
    } else {
        // Standard profile update
        users[currentUser].specialty = formattedSpecialty;
        users[currentUser].university = university;
        users[currentUser].groupName = groupName;
    }

    saveUsers(users);
    alert('Profile updated successfully!');
    renderProfile();
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
=======
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

    // Verify password before saving changes or changing username
    if (userAccount.password !== hashPassword(confirmPassword)) {
        alert('Incorrect password! Please enter your correct password to save changes.');
        return;
    }

    const formattedSpecialty = formatStudentSpecialty(rawSpecialty);

    // If changing username, check availability & update data references
    if (newUsername !== currentUser) {
        if (!newUsername) {
            alert('Username cannot be empty.');
            return;
        }
        if (users[newUsername]) {
            alert('Username is already taken by another account.');
            return;
        }

        // Migrate User Account Key
        users[newUsername] = {
            ...userAccount,
            specialty: formattedSpecialty,
            university: university,
            groupName: groupName
        };
        delete users[currentUser];

        // Migrate User Data Keys (tasks, subjects, materials)
        ['tasks', 'subjects', 'materials'].forEach(key => {
            const oldData = localStorage.getItem(`studysync_${currentUser}_${key}`);
            if (oldData) {
                localStorage.setItem(`studysync_${newUsername}_${key}`, oldData);
                localStorage.removeItem(`studysync_${currentUser}_${key}`);
            }
        });

        // Update username references in Global Groups
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

        // Update username references in Global Materials
        let globalMats = getGlobalMaterials();
        globalMats = globalMats.map(m => {
            if (m.sharedBy === currentUser) m.sharedBy = newUsername;
            return m;
        });
        saveGlobalMaterials(globalMats);

        // Update saved Remember Me credentials if active
        if (localStorage.getItem('studysync_remember_user') === currentUser) {
            localStorage.setItem('studysync_remember_user', newUsername);
        }

        // Set active user to new username
        currentUser = newUsername;
        document.getElementById('nav-username').textContent = currentUser;
        document.getElementById('nav-user-avatar').textContent = currentUser.charAt(0).toUpperCase();
    } else {
        // Standard profile update
        users[currentUser].specialty = formattedSpecialty;
        users[currentUser].university = university;
        users[currentUser].groupName = groupName;
    }

    saveUsers(users);
    alert('Profile updated successfully!');
    renderProfile();
}
>>>>>>> REPLACE