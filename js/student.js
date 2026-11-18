// ==========================================
// GLOBAL HELPERS
// ==========================================
function speakFemale(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 1.35;
  utterance.volume = 1;
  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = window.speechSynthesis.getVoices();
      const femaleVoice = v.find(voice =>
        /female|samantha|victoria|karen|zira|aria|jenny|ava|susan/i.test(voice.name)
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      window.speechSynthesis.speak(utterance);
    };
    return;
  }
  const femaleVoice = voices.find(v =>
    /female|samantha|victoria|karen|zira|aria|jenny|ava|susan/i.test(v.name)
  );
  if (femaleVoice) utterance.voice = femaleVoice;
  window.speechSynthesis.speak(utterance);
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatDate(value) {
  if (!value) return "No date";
  try {
    return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  } catch { return value; }
}

// ==========================================
// DATA MANAGEMENT & STRICT STUDENT FILTERING
// ==========================================
function getAssignments() {
  const savedRaw = localStorage.getItem("taskwiseAssignments");
  if (!savedRaw) return [];
  try {
    const saved = JSON.parse(savedRaw);
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    console.warn("Corrupted assignments data:", e);
    return [];
  }
}

function saveAssignments(assignments) {
  localStorage.setItem("taskwiseAssignments", JSON.stringify(assignments));
}

function getCurrentStudent() {
  const username = localStorage.getItem("taskwiseUsername") || "";
  try {
    const users = JSON.parse(localStorage.getItem("taskwiseUsers") || "[]");
    return users.find(u => u.username === username) || { username };
  } catch {
    return { username };
  }
}

// Helper to get ONLY the current student's submission for an assignment
function getMySubmission(assignment, student) {
  const username = student.username || localStorage.getItem("taskwiseUsername") || "";
  if (assignment.submissions && username && assignment.submissions[username]) {
    return assignment.submissions[username];
  }
  // Backward compatibility if legacy single submission belonged to this student
  if (assignment.submission && (!assignment.submission.studentUsername || assignment.submission.studentUsername === username)) {
    return assignment.submission;
  }
  return null;
}

function isCompletedByStudent(assignment, student) {
  return Boolean(getMySubmission(assignment, student));
}

// Strict filter: Only show assignments from this student's assigned teacher & matching grade/section/student
function getStudentAssignments() {
  const student = getCurrentStudent();
  const studentUsername = String(student.username || localStorage.getItem("taskwiseUsername") || "").toLowerCase();
  const assignedTeacher = String(student.classTeacherUsername || "").toLowerCase();

  return getAssignments().filter(a => {
    // 1. Strict Teacher Check: If the student has an assigned class teacher, ONLY accept assignments from that teacher
    if (assignedTeacher && a.postedByUsername) {
      if (String(a.postedByUsername).toLowerCase() !== assignedTeacher) {
        return false;
      }
    }

    // 2. Direct Individual Targeting Check (if teacher sent to a specific student)
    if (a.targetStudent && a.targetStudent !== "All") {
      return String(a.targetStudent).toLowerCase() === studentUsername;
    }

    // 3. Grade & Section Check
    const gradeMatches =
      !a.targetGrade ||
      a.targetGrade === "All" ||
      String(a.targetGrade).toLowerCase() === String(student.gradeLevel || "").toLowerCase();

    const sectionMatches =
      !a.targetSection ||
      a.targetSection === "All" ||
      String(a.targetSection).toLowerCase() === String(student.section || "").toLowerCase();

    return gradeMatches && sectionMatches;
  });
}

// ==========================================
// PROFILE & WELCOME
// ==========================================
function setupStudentProfile() {
  const student = getCurrentStudent();
  const name = localStorage.getItem("taskwiseName") || student.name || localStorage.getItem("taskwiseUsername") || "Student";
  const picture = localStorage.getItem("taskwiseProfilePicture") || student.profilePicture || "";
  const nameEl = document.getElementById("studentProfileName");
  const titleEl = document.getElementById("studentWelcomeTitle");
  const photoEl = document.getElementById("studentProfilePicture");
  const avatarEl = document.getElementById("studentAvatar");

  if (nameEl) nameEl.textContent = name;
  if (titleEl) titleEl.textContent = `Welcome, ${name}! 👋`;
  if (picture && photoEl) {
    photoEl.src = picture;
    photoEl.classList.remove("hidden");
    if (avatarEl) avatarEl.classList.add("hidden");
  }
  if (!sessionStorage.getItem("taskwiseStudentWelcomeSpoken")) {
    speakFemale(`Welcome, ${name}. You are viewing your TaskWise student dashboard.`);
    sessionStorage.setItem("taskwiseStudentWelcomeSpoken", "1");
  }
}

// ==========================================
// STATS
// ==========================================
function updateStats() {
  const student = getCurrentStudent();
  const assignments = getStudentAssignments();
  const pending = assignments.filter(a => !isCompletedByStudent(a, student));
  const completed = assignments.filter(a => isCompletedByStudent(a, student));

  const now = new Date();
  const soon = new Date();
  soon.setDate(now.getDate() + 3);

  const dueSoon = pending.filter(a => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate + "T23:59:59");
    return due >= now && due <= soon;
  });

  const totalEl = document.getElementById("studentTotalAssignments");
  const pendingEl = document.getElementById("studentPendingAssignments");
  const completedEl = document.getElementById("studentCompletedAssignments");
  const dueSoonEl = document.getElementById("studentDueSoonAssignments");

  if (totalEl) totalEl.textContent = assignments.length;
  if (pendingEl) pendingEl.textContent = pending.length;
  if (completedEl) completedEl.textContent = completed.length;
  if (dueSoonEl) dueSoonEl.textContent = dueSoon.length;
}

// ==========================================
// ASSIGNMENT CARD — with FILE DOWNLOADS
// ==========================================
function studentCard(assignment) {
  const student = getCurrentStudent();
  const submission = getMySubmission(assignment, student);
  const completed = Boolean(submission);

  let attachmentsHTML = "";
  if (assignment.attachments && assignment.attachments.length > 0) {
    attachmentsHTML = `
      <div class="attachments-list">
        <p><strong>📎 Teacher's Attached Files:</strong></p>
        ${assignment.attachments.map(file => `
          <a href="${escapeHTML(file.data)}" download="${escapeHTML(file.name)}" class="file-download-link">
            📄 ${escapeHTML(file.name)}
          </a>
        `).join("")}
      </div>`;
  }

  const description = assignment.instructions || assignment.description || "";
  const submissionHTML = completed && submission
    ? `<div class="attachments-list">
        <p><strong>📤 Your submitted answer:</strong></p>
        <a class="file-download-link" href="${escapeHTML(submission.data)}" download="${escapeHTML(submission.name)}">
          📥 ${escapeHTML(submission.name)}
        </a>
        <small style="display:block;color:#64748b;">Submitted: ${escapeHTML(submission.submittedAt || "")}</small>
       </div>`
    : `<div class="submission-box">
        <label for="answerFile-${assignment.id}"><strong>📤 Upload your answer file (required):</strong></label>
        <input type="file" id="answerFile-${assignment.id}" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png" />
        <small>Maximum file size: 5 MB. Upload your answer before marking this assignment completed.</small>
        <button class="upload-btn" type="button" onclick="submitAssignment(${assignment.id})">Submit Answer &amp; Mark Completed</button>
        <div id="submissionStatus-${assignment.id}" class="upload-status" aria-live="polite"></div>
       </div>`;

  return `
    <article class="assignment-card">
      <div class="assignment-info">
        <span class="subject-tag">${escapeHTML(assignment.subject)}</span>
        <h3>${escapeHTML(assignment.title)}</h3>
        ${description ? `<p>${escapeHTML(description)}</p>` : ""}
        <div class="due-date">Due: ${formatDate(assignment.dueDate)}</div>
        <p class="assignment-teacher" style="color:#64748b;font-size:.9em;">
          👨‍🏫 Posted by: ${escapeHTML(assignment.postedBy || "Your Class Teacher")} • Assigned Teacher
        </p>
        <span class="status-badge ${completed ? "completed" : "pending"}">
          ${completed ? "Submitted / Completed ✓" : "Pending — Answer required"}
        </span>
        ${attachmentsHTML}
        ${submissionHTML}
      </div>
    </article>`;
}

// ==========================================
// RENDER SECTIONS
// ==========================================
function renderAssignments() {
  const list = document.getElementById("studentAssignmentList");
  if (!list) return;
  const assignments = getStudentAssignments();
  list.innerHTML = assignments.length
    ? assignments.map(studentCard).join("")
    : `<div class="empty-state"><h3>No assignments yet</h3><p>Your assigned teacher has not posted any assignments for you.</p></div>`;
  updateStats();
}

function renderUpcoming() {
  const list = document.getElementById("studentUpcomingList");
  if (!list) return;
  const student = getCurrentStudent();
  const assignments = getStudentAssignments()
    .filter(a => !isCompletedByStudent(a, student))
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 3);

  list.innerHTML = assignments.length
    ? assignments.map(studentCard).join("")
    : `<div class="empty-state"><h3>All caught up! 🎉</h3><p>No assignments due soon.</p></div>`;
}

function renderReminders() {
  const list = document.getElementById("studentReminderList");
  if (!list) return;
  const student = getCurrentStudent();
  const assignments = getStudentAssignments().filter(a => !isCompletedByStudent(a, student));
  list.innerHTML = assignments.length
    ? assignments.map(a => `
      <div class="reminder-item">
        <div class="reminder-icon">🔔</div>
        <div>
          <strong>${escapeHTML(a.title)}</strong>
          <p>Due: ${formatDate(a.dueDate)}</p>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state"><h3>No reminders</h3><p>You have no pending assignments.</p></div>`;
}

function renderCompleted() {
  const list = document.getElementById("studentCompletedList");
  if (!list) return;
  const student = getCurrentStudent();
  const assignments = getStudentAssignments().filter(a => isCompletedByStudent(a, student));

  list.innerHTML = assignments.length
    ? assignments.map(a => {
      const sub = getMySubmission(a, student);
      return `
        <article class="assignment-card">
          <div class="assignment-info">
            <span class="subject-tag">${escapeHTML(a.subject)}</span>
            <h3>${escapeHTML(a.title)}</h3>
            <span class="status-badge completed">Submitted / Completed ✓</span>
            ${sub ? `<p><strong>Submitted answer:</strong> <a class="file-download-link" href="${escapeHTML(sub.data)}" download="${escapeHTML(sub.name)}">📥 ${escapeHTML(sub.name)}</a></p><small>Submitted: ${escapeHTML(sub.submittedAt || "")}</small>` : ""}
          </div>
        </article>
      `;
    }).join("")
    : `<div class="empty-state"><h3>No completed assignments</h3><p>Submit your answers to see completed assignments here.</p></div>`;
}

// ==========================================
// ACTIONS (PER-STUDENT SUBMISSION)
// ==========================================
window.submitAssignment = function(id) {
  const student = getCurrentStudent();
  const studentUsername = student.username || localStorage.getItem("taskwiseUsername") || "student";
  const studentName = student.name || localStorage.getItem("taskwiseName") || studentUsername;

  const assignments = getAssignments();
  const assignment = assignments.find(a => String(a.id) === String(id));
  const input = document.getElementById(`answerFile-${id}`);
  const status = document.getElementById(`submissionStatus-${id}`);
  if (!assignment || !input || !status) return;

  if (isCompletedByStudent(assignment, student)) {
    status.textContent = "You have already submitted this assignment.";
    status.className = "upload-status error";
    return;
  }

  const file = input.files && input.files[0];
  if (!file) {
    status.textContent = "Please choose your answer file before submitting.";
    status.className = "upload-status error";
    input.focus();
    return;
  }

  if (!file.size || file.size > 5 * 1024 * 1024) {
    status.textContent = file.size
      ? "File is too large. Please choose a file 5 MB or smaller."
      : "The selected file is empty. Please choose another file.";
    status.className = "upload-status error";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (!assignment.submissions) {
      assignment.submissions = {};
    }
    assignment.submissions[studentUsername] = {
      studentUsername: studentUsername,
      studentName: studentName,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: file.type || "application/octet-stream",
      data: reader.result,
      submittedAt: new Date().toLocaleString()
    };

    try {
      saveAssignments(assignments);
      refreshStudent();
      alert("✅ Your answer file was submitted to your teacher successfully.");
    } catch {
      status.textContent = "Storage limit reached. Try uploading a smaller file.";
      status.className = "upload-status error";
    }
  };
  reader.onerror = () => {
    status.textContent = "Unable to read this file. Please try again.";
    status.className = "upload-status error";
  };
  reader.readAsDataURL(file);
};

function refreshStudent() {
  renderAssignments();
  renderUpcoming();
  renderReminders();
  renderCompleted();
  updateStats();
}

// ==========================================
// NAVIGATION
// ==========================================
function hideSections() {
  document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
}

function activateNav(sectionId) {
  const item = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (item) item.classList.add("active");
}

window.showDashboard = function() {
  hideSections();
  const sec = document.getElementById("studentDashboardSection");
  if (sec) sec.classList.remove("hidden");
  activateNav("studentDashboardSection");
  renderUpcoming();
  updateStats();
};

window.showAssignments = function() {
  hideSections();
  const sec = document.getElementById("studentAssignmentsSection");
  if (sec) sec.classList.remove("hidden");
  activateNav("studentAssignmentsSection");
  renderAssignments();
};

window.showReminders = function() {
  hideSections();
  const sec = document.getElementById("studentRemindersSection");
  if (sec) sec.classList.remove("hidden");
  activateNav("studentRemindersSection");
  renderReminders();
};

window.showCompleted = function() {
  hideSections();
  const sec = document.getElementById("studentCompletedSection");
  if (sec) sec.classList.remove("hidden");
  activateNav("studentCompletedSection");
  renderCompleted();
};

window.logout = function() {
  speakFemale("Logging out. Thank you for using TaskWise.");
  setTimeout(() => {
    localStorage.removeItem("taskwiseRole");
    localStorage.removeItem("taskwiseUsername");
    localStorage.removeItem("taskwiseName");
    localStorage.removeItem("taskwiseProfilePicture");
    sessionStorage.removeItem("taskwiseStudentWelcomeSpoken");
    sessionStorage.removeItem("justLoggedIn");
    window.location.href = "index.html";
  }, 1000);
};

// ==========================================
// SCOPED FILE SHARING (STUDENT <-> ASSIGNED TEACHER ONLY)
// ==========================================
function getSharedFiles() {
  try {
    const files = JSON.parse(localStorage.getItem("taskwiseFiles") || "[]");
    return Array.isArray(files) ? files : [];
  } catch { return []; }
}

function getStudentSharedFiles() {
  const student = getCurrentStudent();
  const studentUsername = String(student.username || localStorage.getItem("taskwiseUsername") || "").toLowerCase();
  const assignedTeacher = String(student.classTeacherUsername || "").toLowerCase();

  return getSharedFiles().filter(file => {
    // 1. Files uploaded by this student themselves
    if (file.uploadedByUsername && String(file.uploadedByUsername).toLowerCase() === studentUsername) {
      return true;
    }

    // 2. Files uploaded by their assigned teacher
    if (file.uploadedByRole === "teacher") {
      if (assignedTeacher && file.uploadedByUsername && String(file.uploadedByUsername).toLowerCase() !== assignedTeacher) {
        return false;
      }
      if (file.targetStudent && file.targetStudent !== "All") {
        return String(file.targetStudent).toLowerCase() === studentUsername;
      }
      const gradeMatches = !file.targetGrade || file.targetGrade === "All" || String(file.targetGrade).toLowerCase() === String(student.gradeLevel || "").toLowerCase();
      const sectionMatches = !file.targetSection || file.targetSection === "All" || String(file.targetSection).toLowerCase() === String(student.section || "").toLowerCase();
      return gradeMatches && sectionMatches;
    }

    // 3. Legacy files without role metadata
    return !file.uploadedByRole;
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

window.showFileShare = function() {
  hideSections();
  const section = document.getElementById("fileShareSection");
  if (section) section.classList.remove("hidden");
  activateNav("fileShareSection");
  renderSharedFiles();
};

window.uploadFile = function() {
  const input = document.getElementById("fileInput");
  const status = document.getElementById("uploadStatus");
  if (!input || !status || !input.files || !input.files.length) {
    if (status) status.textContent = "Please select a file first.";
    return;
  }

  const student = getCurrentStudent();
  const studentUsername = student.username || localStorage.getItem("taskwiseUsername") || "student";
  const studentName = student.name || localStorage.getItem("taskwiseName") || studentUsername;
  const file = input.files[0];

  if (file.size > 5 * 1024 * 1024) {
    status.textContent = "File is too large (max 5 MB).";
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    const files = getSharedFiles();
    files.unshift({
      id: Date.now(),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      data: event.target.result,
      uploadedAt: new Date().toLocaleString(),
      uploadedBy: studentName,
      uploadedByUsername: studentUsername,
      uploadedByRole: "student",
      targetTeacherUsername: student.classTeacherUsername || "",
      targetGrade: student.gradeLevel || "",
      targetSection: student.section || ""
    });
    try {
      localStorage.setItem("taskwiseFiles", JSON.stringify(files));
      status.textContent = "File sent to your class teacher successfully.";
      input.value = "";
      renderSharedFiles();
    } catch {
      status.textContent = "This file is too large for browser storage. Try a smaller file.";
    }
  };
  reader.readAsDataURL(file);
};

function renderSharedFiles() {
  const list = document.getElementById("sharedFilesList");
  if (!list) return;
  const files = getStudentSharedFiles();
  if (!files.length) {
    list.textContent = "No files shared yet. Upload a file above to send it to your teacher.";
    return;
  }
  list.replaceChildren();
  files.forEach(file => {
    const item = document.createElement("div");
    item.className = "file-item";
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = file.name;
    const meta = document.createElement("small");
    const senderLabel = file.uploadedByRole === "student" ? "Sent by You" : `From ${file.uploadedBy || "Your Teacher"}`;
    meta.textContent = `${senderLabel} • ${file.size} • ${file.uploadedAt}`;
    info.append(name, document.createElement("br"), meta);
    const link = document.createElement("a");
    link.href = file.data;
    link.download = file.name;
    link.className = "file-download-link";
    link.textContent = "Download";
    item.append(info, link);
    list.appendChild(item);
  });
}

// ==========================================
// INITIALIZE & AUTH CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("taskwiseRole") !== "student") {
    alert("Unauthorized — Redirecting to Login Page.");
    window.location.href = "index.html";
    return;
  }
  setupStudentProfile();
  refreshStudent();
});