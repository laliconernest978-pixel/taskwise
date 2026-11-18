document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const registerForm = document.getElementById("registerForm");
  const pictureInput = document.getElementById("registerPicture");
  const previewBox = document.getElementById("picturePreview");
  const previewImage = document.getElementById("previewImage");

  const DEMO_USERS = [
    {
      name: "Admin",
      username: "admin",
      password: "admin123",
      role: "admin",
      picture: ""
    },
    {
      name: "Teacher",
      username: "teacher",
      password: "teacher123",
      role: "teacher",
      picture: ""
    },
    {
      name: "Student",
      username: "student",
      password: "student123",
      role: "student",
      picture: ""
    }
  ];

  function getUsers() {
    const savedRaw = localStorage.getItem("taskwiseUsers");
    let saved;
    try {
      saved = savedRaw ? JSON.parse(savedRaw) : null;
    } catch (e) {
      console.warn("Corrupted user data, resetting:", e);
      saved = null;
    }

    if (!Array.isArray(saved)) {
      localStorage.setItem("taskwiseUsers", JSON.stringify(DEMO_USERS));
      return [...DEMO_USERS];
    }

    // Remove malformed records so one damaged entry cannot break login.
    saved = saved.filter(user =>
      user && typeof user.username === "string" &&
      typeof user.password === "string" &&
      typeof user.role === "string"
    );

    // Ensure the administrator demo account is always available.
    if (!saved.some(user => user.username.toLowerCase() === "admin")) {
      saved.unshift(DEMO_USERS[0]);
    }
    saveUsers(saved);
    return saved;
  }

  function saveUsers(users) {
    localStorage.setItem("taskwiseUsers", JSON.stringify(users));
  }

  // Female voice greeting
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

    const femaleVoice = voices.find(voice =>
      /female|samantha|victoria|karen|zira|aria|jenny|ava|susan/i.test(voice.name)
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    window.speechSynthesis.speak(utterance);
  }

  function speakWelcome(user) {
    speakFemale(`Welcome, ${user.name}. Welcome to TaskWise. You are logged in as an ${user.role}.`);
  }

  // Intro greeting
  function playIntro() {
    if (sessionStorage.getItem("taskwiseIntroSpoken")) return;
    speakFemale("Welcome to TaskWise. Please log in as an admin, student, or teacher.");
    sessionStorage.setItem("taskwiseIntroSpoken", "1");
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", playIntro);
  }
  setTimeout(playIntro, 700);

  // LOGIN
  form.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    message.className = "login-message";
    message.textContent = "";

    if (!role) {
      showMessage("Please select your role.", "error");
      return;
    }

    const users = getUsers();
    const user = users.find(account =>
      account.username.toLowerCase() === username.toLowerCase() &&
      account.password === password &&
      account.role === role
    );

    if (user) {
      localStorage.setItem("taskwiseRole", user.role);
      localStorage.setItem("taskwiseUsername", user.username);
      localStorage.setItem("taskwiseName", user.name);
      localStorage.setItem("taskwiseProfilePicture", user.picture || "");

      // ✅ CRITICAL — tells admin dashboard login just happened
      sessionStorage.setItem("justLoggedIn", "true");

      speakWelcome(user);
      showMessage(`Welcome, ${user.name}! Opening dashboard...`, "success");

      setTimeout(() => {
        const dashboards = {
          admin: "admin.html",
          teacher: "teacher.html",
          student: "student.html"
        };
        window.location.href = dashboards[user.role] || "index.html";
      }, 900);
    } else {
      showMessage("Invalid username, password, or role.", "error");
      speakFemale("The login information is not correct. Please try again.");
    }
  });

  // REGISTRATION MODAL
  window.openRegisterModal = function () {
    document.getElementById("registerModal").classList.remove("hidden");
  };

  window.closeRegisterModal = function () {
    document.getElementById("registerModal").classList.add("hidden");
    registerForm.reset();
    previewBox.classList.add("hidden");
    previewImage.removeAttribute("src");
  };

  // Profile picture preview
  pictureInput.addEventListener("change", () => {
    const file = pictureInput.files[0];
    if (!file) {
      previewBox.classList.add("hidden");
      previewImage.removeAttribute("src");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      pictureInput.value = "";
      previewBox.classList.add("hidden");
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      previewImage.src = event.target.result;
      previewBox.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  // Register account
  registerForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const role = document.getElementById("registerRole").value;
    const file = pictureInput.files[0];

    if (!name || !username || !password || !role) {
      alert("Please complete all required fields.");
      return;
    }

    const users = getUsers();
    if (users.some(user =>
      typeof user.username === "string" &&
      user.username.toLowerCase() === username.toLowerCase()
    )) {
      alert("That username is already registered. Please choose another one.");
      return;
    }

    function finishRegistration(picture) {
      users.push({
        name,
        username,
        password,
        role,
        picture: picture || ""
      });
      saveUsers(users);
      alert("Account registered successfully! You can now log in.");
      closeRegisterModal();
      document.getElementById("username").value = username;
      document.getElementById("password").value = password;
      document.getElementById("role").value = role;
      speakFemale(`Registration successful. Welcome to TaskWise, ${name}.`);
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        finishRegistration(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      finishRegistration("");
    }
  });

  // Close modal on background click
  document.getElementById("registerModal").addEventListener("click", event => {
    if (event.target.id === "registerModal") {
      closeRegisterModal();
    }
  });

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `login-message ${type}`;
  }

  // Initialize
  getUsers();
});