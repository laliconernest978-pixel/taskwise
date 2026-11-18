document.addEventListener("DOMContentLoaded", () => {
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  
  // ─── PAGE TITLES DICTIONARY ───
  const pageTitles = {
    dashboard: "Dashboard",
    users: "Manage Users",
    verification: "Account Verification",
    "add-user": "Add New User",
    assignments: "Teacher Assignments",
    settings: "System Settings",
    reports: "Reports"
  };

  // ─── AUTH CHECK — MATCHES YOUR LOGIN STORAGE ───
  const role = localStorage.getItem("taskwiseRole");
  const username = localStorage.getItem("taskwiseUsername");
  const name = localStorage.getItem("taskwiseName");
  const picture = localStorage.getItem("taskwiseProfilePicture");

  if (role !== "admin" || !username) {
    alert("Unauthorized access — Redirecting to Login Page.");
    window.location.href = "index.html";
    return;
  }

  const currentUser = { name, username, role, picture };

  // ─── DISPLAY ADMIN INFO ───
  document.getElementById("adminName").textContent = name;
  document.getElementById("adminNameShort").textContent = name;
  document.getElementById("adminAvatar").textContent = name.charAt(0).toUpperCase();

  // ─── FEMALE VOICE GREETING (MATCHES YOUR LOGIN STYLE) ───
  function speakFemale(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1.35;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice =>
      /female|samantha|victoria|karen|zira|aria|jenny|ava|susan/i.test(voice.name)
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    window.speechSynthesis.speak(utterance);
  }

  if (sessionStorage.getItem("justLoggedIn") === "true") {
    speakFemale(`Welcome ${name}. You are now in TaskWise Admin Control Panel — Mangaldan National High School.`);
    sessionStorage.removeItem("justLoggedIn");
  }

  // ─── USER DATA — MATCHES YOUR LOGIN STORAGE KEY ───
  function getUsers() {
    const saved = localStorage.getItem("taskwiseUsers");
    if (!saved) {
      const defaults = [
        { name: "Admin", username: "admin", password: "admin123", role: "admin", picture: "", verification: "Approved" },
        { name: "Teacher", username: "teacher", password: "teacher123", role: "teacher", picture: "", verification: "Approved" },
        { name: "Student", username: "student", password: "student123", role: "student", picture: "", verification: "Approved" }
      ];
      localStorage.setItem("taskwiseUsers", JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(saved);
  }

  function saveUsers(users) {
    localStorage.setItem("taskwiseUsers", JSON.stringify(users));
    renderUserTable();
    updateStats();
    renderVerification();
  }

  // ─── UPDATE STATISTICS ───
  function updateStats() {
    const users = getUsers();
    document.getElementById("statTotal").textContent = users.length;
    document.getElementById("statAdmins").textContent = users.filter(u => u.role === "admin").length;
    document.getElementById("statTeachers").textContent = users.filter(u => u.role === "teacher").length;
    document.getElementById("statStudents").textContent = users.filter(u => u.role === "student").length;
  }

  // ─── FILL TEACHER OPTIONS ───
  function fillTeacherOptions(selectId, selected = "") {
    const select = document.getElementById(selectId);
    if (!select) return;
    const teachers = getUsers().filter(u => u.role === "teacher");
    select.innerHTML = '<option value="">No class teacher selected</option>' + teachers.map(t =>
      `<option value="${String(t.username).replace(/[&<>"']/g, "")}" ${t.username === selected ? "selected" : ""}>${String(t.name).replace(/[&<>"']/g, "")} (${String(t.username).replace(/[&<>"']/g, "")})</option>`
    ).join("");
  }

  // ─── RENDER USER TABLE ───
  function renderUserTable() {
    const users = getUsers();
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";
    users.forEach((user, index) => {
      const pillClass = user.role === "admin" ? "success" : user.role === "teacher" ? "" : "warning";
      const classTeacher = user.classTeacherUsername
        ? (users.find(u => u.username === user.classTeacherUsername)?.name || user.classTeacherUsername)
        : "Not assigned";
      const gradeInfo = [user.gradeLevel, user.section ? `Section ${user.section}` : ""].filter(Boolean).join(" • ") || "Not specified";
      const verificationBadge = user.role !== "admin"
        ? `<small style="display:block; color:${user.verification === "Approved" ? "#10b981" : user.verification === "Rejected" ? "#ef4444" : "#f59e0b"}; font-weight:600;">Status: ${user.verification || "Pending"}</small>`
        : "";
      const row = document.createElement("div");
      row.className = "student-row";
      row.style.gridTemplateColumns = "1.1fr 1fr .8fr 1.5fr 1.2fr";
      row.innerHTML = `
        <div><strong>${escapeHTML(user.name)}</strong> ${verificationBadge}</div>
        <div>${escapeHTML(user.username)}</div>
        <div><span class="pill ${pillClass}">${escapeHTML(user.role)}</span></div>
        <div><strong>${escapeHTML(gradeInfo)}</strong><small style="display:block;color:#64748b;">${user.role === "student" ? `Class teacher: ${escapeHTML(classTeacher)}` : user.role === "teacher" ? "Teacher assignment" : "Administrator"}</small></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="edit-btn" data-index="${index}">✏️ Edit</button>
          <button class="delete-btn" data-index="${index}">🗑️ Delete</button>
        </div>`;
      tbody.appendChild(row);
    });
  }

  // ─── ✅ ACCOUNT VERIFICATION SYSTEM (SHOWS STUDENT-TEACHER LINK) ───
  function renderVerification() {
    const users = getUsers();
    const pending = users.filter(u => u.role !== "admin" && (u.verification || "Pending") === "Pending");
    const approved = users.filter(u => u.role !== "admin" && u.verification === "Approved");
    const rejected = users.filter(u => u.role !== "admin" && u.verification === "Rejected");

    const pendingEl = document.getElementById("verifyPending");
    const approvedEl = document.getElementById("verifyApproved");
    const rejectedEl = document.getElementById("verifyRejected");
    if (pendingEl) pendingEl.textContent = pending.length;
    if (approvedEl) approvedEl.textContent = approved.length;
    if (rejectedEl) rejectedEl.textContent = rejected.length;

    const search = (document.getElementById("verifySearch")?.value || "").toLowerCase();
    const roleFilter = document.getElementById("verifyRole")?.value || "all";
    const statusFilter = document.getElementById("verifyStatus")?.value || "all";
    const list = document.getElementById("verificationList");
    if (!list) return;
    list.innerHTML = "";

    const filtered = users.filter(user => {
      if (user.role === "admin") return false;
      const matchSearch = !search ||
        (user.name || "").toLowerCase().includes(search) ||
        (user.username || "").toLowerCase().includes(search);
      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || (user.verification || "Pending") === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });

    if (filtered.length === 0) {
      list.innerHTML = `<p style="color:#64748b;text-align:center;padding:20px;">No accounts found.</p>`;
      return;
    }

    filtered.forEach(user => {
      const status = user.verification || "Pending";
      const card = document.createElement("div");
      card.className = "student-row";
      card.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:15px;margin-bottom:10px;flex-wrap:wrap;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;";
      
      const statusColor = status === "Pending" ? "#f59e0b" : status === "Approved" ? "#10b981" : "#ef4444";

      // Lookup class teacher name if user is a student
      let teacherInfo = "Not assigned";
      if (user.role === "student" && user.classTeacherUsername) {
        const foundTeacher = users.find(u => u.username === user.classTeacherUsername);
        teacherInfo = foundTeacher ? `${foundTeacher.name} (${foundTeacher.username})` : user.classTeacherUsername;
      }

      card.innerHTML = `
        <div>
          <strong>${escapeHTML(user.name)}</strong> <span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; text-transform:uppercase; font-weight:bold;">${escapeHTML(user.role)}</span><br>
          <small style="color:#475569;">ID: ${escapeHTML(user.username)}</small><br>
          <small style="color:#475569;">Grade: ${escapeHTML(user.gradeLevel || "—")} | Section: ${escapeHTML(user.section || "—")}</small><br>
          ${user.role === "student" ? `<small style="color:#2563eb; font-weight:600;">👨‍🏫 Assigned Class Teacher: ${escapeHTML(teacherInfo)}</small><br>` : `<small style="color:#059669; font-weight:600;">👨‍🏫 Teacher Account</small><br>`}
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${statusColor}20;color:${statusColor};font-size:12px;margin-top:4px;font-weight:600;">${status}</span>
        </div>
        <div style="display:flex;gap:8px;">
          ${status === "Pending" ? `
            <button class="approve-btn" data-username="${escapeHTML(user.username)}" style="background:#10b981;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;">✅ Approve</button>
            <button class="reject-btn" data-username="${escapeHTML(user.username)}" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;">❌ Reject</button>
          ` : status === "Approved" ? `
            <button class="revoke-btn" data-username="${escapeHTML(user.username)}" style="background:#f59e0b;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;">⚠️ Revoke</button>
          ` : `
            <button class="reapply-btn" data-username="${escapeHTML(user.username)}" style="background:#10b981;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;">✅ Re-approve</button>
          `}
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", () => updateVerification(btn.dataset.username, "Approved"));
    });
    list.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", () => updateVerification(btn.dataset.username, "Rejected"));
    });
    list.querySelectorAll(".revoke-btn").forEach(btn => {
      btn.addEventListener("click", () => updateVerification(btn.dataset.username, "Pending"));
    });
    list.querySelectorAll(".reapply-btn").forEach(btn => {
      btn.addEventListener("click", () => updateVerification(btn.dataset.username, "Approved"));
    });
  }

  function updateVerification(targetUsername, newStatus) {
    const users = getUsers();
    const user = users.find(u => u.username === targetUsername);
    if (!user) return;
    user.verification = newStatus;
    saveUsers(users);
    speakFemale(`${user.name} has been ${newStatus.toLowerCase()}.`);
    alert(`✅ Account "${user.name}" status updated to ${newStatus}!`);
  }

  // ─── TEACHER POSTS / ASSIGNMENT MONITORING ───
  function renderAdminAssignments() {
    const list = document.getElementById("adminAssignmentsList");
    if (!list) return;
    let assignments = [];
    try {
      const saved = JSON.parse(localStorage.getItem("taskwiseAssignments") || "[]");
      assignments = Array.isArray(saved) ? saved : [];
    } catch { assignments = []; }
    list.replaceChildren();
    if (!assignments.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No assignments posted yet. Posts made by teachers will appear here.";
      list.appendChild(empty);
      return;
    }
    assignments.forEach(a => {
      const card = document.createElement("article");
      card.className = "assignment-row";
      const subject = document.createElement("span");
      subject.className = "pill";
      subject.textContent = a.subject || "General";
      const title = document.createElement("h3");
      title.textContent = a.title || "Untitled assignment";
      const desc = document.createElement("p");
      desc.textContent = a.instructions || "No instructions provided.";
      const due = document.createElement("p");
      due.textContent = "Due: " + (a.dueDate || "No deadline");
      const status = document.createElement("p");
      status.textContent = "Status: " + (a.status || "Pending");
      const owner = document.createElement("p");
      owner.textContent = `Posted by: ${a.postedBy || "Unknown teacher"} (${a.postedByUsername || "no username saved"})`;
      const target = document.createElement("p");
      target.textContent = `Assigned to: ${a.targetGrade || "All grades"}${a.targetSection ? " — Section " + a.targetSection : " — All sections"}`;
      card.append(subject, title, desc, due, owner, target, status);
      list.appendChild(card);
    });
  }

  // ─── VIEW SWITCHING ───
  function switchView(viewName) {
    ["dashboard", "users", "verification", "add-user", "assignments", "settings", "reports"].forEach(v => {
      const el = document.getElementById(v + "View");
      if (el) el.classList.toggle("hidden", v !== viewName);
    });
    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    document.getElementById("pageTitle").textContent = pageTitles[viewName] || "Dashboard";
    if (viewName === "assignments") renderAdminAssignments();
    if (viewName === "verification") renderVerification();
    const showWelcome = viewName === "dashboard";
    document.getElementById("welcomeSection").classList.toggle("hidden", !showWelcome);
    document.getElementById("statsSection").classList.toggle("hidden", !showWelcome);
  }

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  document.querySelectorAll("[data-switch]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.switch));
  });

  // ─── VERIFICATION FILTERS ───
  const verifySearch = document.getElementById("verifySearch");
  const verifyRole = document.getElementById("verifyRole");
  const verifyStatus = document.getElementById("verifyStatus");
  if (verifySearch) verifySearch.addEventListener("input", renderVerification);
  if (verifyRole) verifyRole.addEventListener("change", renderVerification);
  if (verifyStatus) verifyStatus.addEventListener("change", renderVerification);

  // ─── ADD NEW USER ───
  document.getElementById("addUserForm").addEventListener("submit", e => {
    e.preventDefault();
    const users = getUsers();
    const newRole = document.getElementById("newRole").value;
    const newUser = {
      name: document.getElementById("newName").value.trim(),
      username: document.getElementById("newUsername").value.trim(),
      password: document.getElementById("newPassword").value,
      role: newRole,
      gradeLevel: document.getElementById("newGrade").value,
      section: document.getElementById("newSection").value.trim(),
      classTeacherUsername: document.getElementById("newClassTeacher").value,
      verification: newRole === "admin" ? "Approved" : "Pending",
      picture: ""
    };
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      alert("❌ That Username/ID is already registered. Please use a different one.");
      return;
    }
    if (newUser.role === "student" && newUser.classTeacherUsername && !users.some(u => u.role === "teacher" && u.username === newUser.classTeacherUsername)) {
      alert("Please select a valid teacher for this student.");
      return;
    }
    users.push(newUser);
    saveUsers(users);
    speakFemale(`${newUser.name} has been added to TaskWise as ${newUser.role}.`);
    alert(`✅ Account Created!\nName: ${newUser.name}\nRole: ${newUser.role}`);
    e.target.reset();
    switchView("users");
  });

  // ─── EDIT & DELETE ───
  document.getElementById("userTableBody").addEventListener("click", e => {
    const idx = parseInt(e.target.dataset.index);
    if (e.target.classList.contains("edit-btn")) {
      const user = getUsers()[idx];
      document.getElementById("editIndex").value = idx;
      document.getElementById("editName").value = user.name;
      document.getElementById("editUsername").value = user.username;
      document.getElementById("editPassword").value = user.password;
      document.getElementById("editRole").value = user.role;
      document.getElementById("editGrade").value = user.gradeLevel || "";
      document.getElementById("editSection").value = user.section || "";
      fillTeacherOptions("editClassTeacher", user.classTeacherUsername || "");
      document.getElementById("editModal").classList.remove("hidden");
    }
    if (e.target.classList.contains("delete-btn")) {
      const users = getUsers();
      if (users[idx].username === username) {
        speakFemale("You cannot delete your own administrator account.");
        alert("❌ You cannot delete your own account!");
        return;
      }
      if (confirm(`⚠️ Permanently delete:\n"${users[idx].name}"\nThis action cannot be undone!`)) {
        users.splice(idx, 1);
        saveUsers(users);
        speakFemale(`${users[idx]?.name || "User"} has been removed from the system.`);
      }
    }
  });

  // ─── SAVE EDITS ───
  document.getElementById("editUserForm").addEventListener("submit", e => {
    e.preventDefault();
    const users = getUsers();
    const idx = parseInt(document.getElementById("editIndex").value);
    users[idx] = {
      ...users[idx],
      name: document.getElementById("editName").value.trim(),
      username: document.getElementById("editUsername").value.trim(),
      password: document.getElementById("editPassword").value,
      role: document.getElementById("editRole").value,
      gradeLevel: document.getElementById("editGrade").value,
      section: document.getElementById("editSection").value.trim(),
      classTeacherUsername: document.getElementById("editClassTeacher").value
    };
    saveUsers(users);
    document.getElementById("editModal").classList.add("hidden");
    speakFemale("User information has been updated.");
    alert("✅ Changes Saved Successfully!");
  });

  // ─── CLOSE MODAL ───
  document.getElementById("closeEditModal").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
  });
  document.getElementById("cancelEdit").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
  });

  // ─── LOGOUT ───
  document.getElementById("logoutBtn").addEventListener("click", () => {
    speakFemale("Logging out. Thank you for using TaskWise.");
    setTimeout(() => {
      localStorage.removeItem("taskwiseRole");
      localStorage.removeItem("taskwiseUsername");
      localStorage.removeItem("taskwiseName");
      localStorage.removeItem("taskwiseProfilePicture");
      sessionStorage.removeItem("justLoggedIn");
      window.location.href = "index.html";
    }, 1200);
  });

  // ─── INITIALIZE ───
  fillTeacherOptions("newClassTeacher");
  renderUserTable();
  updateStats();
  renderVerification();
});