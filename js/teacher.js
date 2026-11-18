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
// DATA & ROSTER HELPERS
// ==========================================
function getCurrentTeacher() {
  const username = localStorage.getItem("taskwiseUsername") || "teacher_user";
  const name = localStorage.getItem("taskwiseName") || "Teacher";
  return { username, name };
}

function getAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem("taskwiseAssignments") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function saveAssignments(assignments) {
  localStorage.setItem("taskwiseAssignments", JSON.stringify(assignments));
}

// ==========================================
// PROFILE & STATS
// ==========================================
function setupTeacherProfile() {
  const teacher = getCurrentTeacher();
  const nameEl = document.getElementById("teacherName");
  if (nameEl) nameEl.textContent = teacher.name;
}

function updateTeacherStats() {
  const assignments = getAssignments();
  let completedCount = 0;
  let pendingCount = assignments.length;

  assignments.forEach(a => {
    if (a.status === "Completed") completedCount++;
  });

  const totalEl = document.getElementById("totalPosted");
  const pendingEl = document.getElementById("totalPending");
  const completedEl = document.getElementById("totalDone");

  if (totalEl) totalEl.textContent = assignments.length;
  if (pendingEl) pendingEl.textContent = pendingCount;
  if (completedEl) completedEl.textContent = completedCount;
}

// ==========================================
// RENDER POSTED ASSIGNMENTS
// ==========================================
function renderPostedAssignments() {
  const list = document.getElementById("postedList");
  if (!list) return;

  const assignments = getAssignments();

  if (!assignments.length) {
    list.innerHTML = `<div class="empty-state"><h3>No assignments posted yet</h3><p>Click "Create Assignment" to assign work to your students.</p></div>`;
    updateTeacherStats();
    return;
  }

  list.innerHTML = assignments.map(a => `
    <article class="assignment-row">
      <span class="subject-tag">${escapeHTML(a.subject)}</span>
      <h3>${escapeHTML(a.title)}</h3>
      <p>${escapeHTML(a.description || "")}</p>
      <div style="font-size:0.85em; color:#64748b; margin-top:6px;">
        Grade: ${escapeHTML(a.grade)} | Section: ${escapeHTML(a.section)} | Due: ${formatDate(a.dueDate)}
      </div>
      ${a.fileName ? `<div style="margin-top:6px;"><a href="${escapeHTML(a.fileData)}" download="${escapeHTML(a.fileName)}" style="color:#3730a3; font-size:0.9em;">📄 Download Attachment: ${escapeHTML(a.fileName)}</a></div>` : ''}
      <button type="button" onclick="deleteAssignment(${a.id})" class="danger-btn" style="margin-top:10px;">🗑 Delete</button>
    </article>
  `).join("");

  updateTeacherStats();
}

// ==========================================
// CREATE & DELETE ASSIGNMENT
// ==========================================
function handleCreateAssignment(e) {
  if (e) e.preventDefault();

  // Match the exact IDs from your HTML form
  const subject = document.getElementById("assignSubject")?.value.trim();
  const title = document.getElementById("assignTitle")?.value.trim();
  const description = document.getElementById("assignDesc")?.value.trim() || "";
  const grade = document.getElementById("assignGrade")?.value.trim();
  const section = document.getElementById("assignSection")?.value.trim() || "All Sections";
  const dueDate = document.getElementById("assignDue")?.value || "";
  const fileInput = document.getElementById("assignFile");
  const statusEl = document.getElementById("postStatus");

  if (!subject || !title || !grade) {
    alert("Please enter both a Subject, an Assignment Title, and select a Grade Level.");
    return;
  }

  const newAssignment = {
    id: Date.now(),
    subject,
    title,
    description,
    grade,
    section,
    dueDate,
    fileName: null,
    fileData: null,
    status: 'Pending',
    datePosted: new Date().toLocaleDateString()
  };

  const finalizeSave = () => {
    const assignments = getAssignments();
    assignments.unshift(newAssignment);
    saveAssignments(assignments);
    
    if (statusEl) {
      statusEl.style.color = '#166534';
      statusEl.textContent = 'Assignment posted successfully!';
    }
    
    // Reset form
    document.getElementById("assignSubject").value = '';
    document.getElementById("assignTitle").value = '';
    document.getElementById("assignDesc").value = '';
    document.getElementById("assignGrade").value = '';
    document.getElementById("assignSection").value = '';
    document.getElementById("assignDue").value = '';
    if (fileInput) fileInput.value = '';

    updateTeacherStats();
  };

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Attachment must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      newAssignment.fileName = file.name;
      newAssignment.fileData = ev.target.result;
      finalizeSave();
    };
    reader.readAsDataURL(file);
  } else {
    finalizeSave();
  }
}

window.postAssignment = handleCreateAssignment;

window.deleteAssignment = function(id) {
  if (!confirm("Delete this assignment?")) return;
  const updated = getAssignments().filter(a => String(a.id) !== String(id));
  saveAssignments(updated);
  renderPostedAssignments();
};

// ==========================================
// NAVIGATION
// ==========================================
function hideAllSections() {
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
}

window.showDashboard = function() {
  hideAllSections();
  document.getElementById("teacherDashboardSection")?.classList.remove("hidden");
  document.querySelector('[onclick="showDashboard()"]')?.classList.add("active");
  updateTeacherStats();
};

window.showCreate = function() {
  hideAllSections();
  document.getElementById("createSection")?.classList.remove("hidden");
  document.querySelector('[onclick="showCreate()"]')?.classList.add("active");
};

window.showPosted = function() {
  hideAllSections();
  document.getElementById("postedSection")?.classList.remove("hidden");
  document.querySelector('[onclick="showPosted()"]')?.classList.add("active");
  renderPostedAssignments();
};

window.logout = function() {
  speakFemale("Logging out. Thank you for using TaskWise.");
  setTimeout(() => {
    localStorage.clear();
    window.location.href = "index.html";
  }, 800);
};

// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  setupTeacherProfile();
  updateTeacherStats();
  renderPostedAssignments();
});