import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// =========================
// 🔌 SUPABASE
// =========================
const supabase = createClient(
  "https://qnceucksnoskacjntvgr.supabase.co"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuY2V1Y2tzbm9za2Fjam50dmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTY2NzYsImV4cCI6MjA5MTA3MjY3Nn0.aPFMGlUEq4apUKvs_dMPShHN8WXS0gSd0UfPdAcXOPs"
);

// =========================
// 🧠 GAME DATA (JS-DRIVEN)
// =========================
let allElements = [];      // from JS or optional Supabase
let allCombinations = [];   // from JS or optional Supabase

let unlockedElements = [];  // array of element IDs
let currentUser = null;
let profile = null;

let saveTimeout = null;

// =========================
// 🎮 YOUR SETTINGS
// =========================
const settings = JSON.parse(localStorage.getItem("settings")) || {
  sound: true,
  darkMode: false
};

// =========================
// 🧩 HELPERS
// =========================
const $ = (id) => document.getElementById(id);
const val = (id) => $(id)?.value;

// =========================
// 🚀 INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  applySettings();

  setupAuth();
  setupGame();
  setupUI();

  loadLocalProgress();

  populateDropdowns();
  updateUnlocked();
  populateEncyclopedia();

  supabase.auth.onAuthStateChange((_, session) => {
    if (session?.user) {
      initUser(session.user);
    } else {
      currentUser = null;
      profile = null;
      $("authStatus").textContent = "Logged out";
    }
  });
});

// =========================
// 👤 USER INIT (PROFILE + SAVE LOAD)
// =========================
async function initUser(user) {
  currentUser = user;

  // 🔹 Load or create profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!existingProfile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: "Player" + Math.floor(Math.random() * 9999)
      })
      .select()
      .single();

    profile = newProfile;
  } else {
    profile = existingProfile;
  }

  $("authStatus").textContent = `Welcome ${profile.username}`;

  await loadCloudProgress();
}

// =========================
// 🔐 AUTH
// =========================
function setupAuth() {

  $("signupBtn").addEventListener("click", async () => {
    const { error } = await supabase.auth.signUp({
      email: val("email"),
      password: val("password")
    });

    $("authStatus").textContent =
      error ? error.message : "Check email to confirm signup!";
  });

  $("loginBtn").addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: val("email"),
      password: val("password")
    });

    if (error) $("authStatus").textContent = error.message;
  });

  $("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
}

// =========================
// 🎮 GAME LOGIC
// =========================
function setupGame() {
  $("combineBtn").addEventListener("click", combineElements);
  $("clearBtn").addEventListener("click", clearSelection);
  $("hintBtn").addEventListener("click", showHint);
}

function combineElements() {
  const id1 = parseInt(val("element1"));
  const id2 = parseInt(val("element2"));

  if (!id1 || !id2) {
    $("result").textContent = "Select two elements.";
    return;
  }

  const combo = allCombinations.find(c =>
    (c.element1_id === id1 && c.element2_id === id2) ||
    (c.element1_id === id2 && c.element2_id === id1)
  );

  if (!combo) {
    $("result").textContent = "Nothing happens.";
    return;
  }

  const result = allElements.find(e => e.id === combo.result_id);
  if (!result) return;

  const isNew = !unlockedElements.includes(result.id);

  if (isNew) {
    unlockedElements.push(result.id);

    saveProgress();

    $("result").textContent = `🎉 Created: ${result.element_name}`;

    if (settings.sound) {
      new Audio("https://www.myinstants.com/media/sounds/pop.mp3").play().catch(() => {});
    }

    populateDropdowns();
    updateUnlocked();
  } else {
    $("result").textContent = `${result.element_name} already unlocked`;
  }
}

function clearSelection() {
  $("element1").value = "";
  $("element2").value = "";
  $("result").textContent = "";
}

// =========================
// 💾 SAVE SYSTEM (LOCAL + SUPABASE)
// =========================
function saveProgress() {
  localStorage.setItem("progress", JSON.stringify(unlockedElements));
  queueCloudSave();
}

function loadLocalProgress() {
  const saved = JSON.parse(localStorage.getItem("progress"));
  unlockedElements = Array.isArray(saved)
    ? saved
    : allElements.slice(0, 4).map(e => e.id);
}

function queueCloudSave() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    if (!currentUser) return;

    await supabase.from("user_progress").upsert({
      user_id: currentUser.id,
      unlocked_elements: unlockedElements,
      updated_at: new Date()
    });
  }, 800);
}

async function loadCloudProgress() {
  if (!currentUser) return;

  const { data } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", currentUser.id)
    .single();

  if (data?.unlocked_elements) {
    unlockedElements = data.unlocked_elements;
  }

  populateDropdowns();
  updateUnlocked();
}

// =========================
// 🎛 UI
// =========================
function setupUI() {

  $("themeToggle").addEventListener("click", () => {
    settings.darkMode = !settings.darkMode;
    document.body.classList.toggle("dark", settings.darkMode);
    localStorage.setItem("settings", JSON.stringify(settings));
  });

  $("resetBtn").addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });

  $("settingsBtn").addEventListener("click", () => {
    $("settingsModal").classList.remove("hidden");
  });

  $("encyclopediaBtn").addEventListener("click", () => {
    $("encyclopediaModal").classList.remove("hidden");
  });

  document.querySelectorAll(".closeBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").classList.add("hidden");
    });
  });
}

// =========================
// 🧩 UI RENDER
// =========================
function populateDropdowns() {
  const s1 = $("element1");
  const s2 = $("element2");

  s1.innerHTML = "<option value=''>Select</option>";
  s2.innerHTML = "<option value=''>Select</option>";

  unlockedElements.forEach(id => {
    const e = allElements.find(x => x.id === id);
    if (!e) return;

    s1.add(new Option(e.element_name, e.id));
    s2.add(new Option(e.element_name, e.id));
  });
}

function updateUnlocked() {
  $("unlockedList").innerHTML = unlockedElements
    .map(id => {
      const e = allElements.find(x => x.id === id);
      return `<li>${e?.element_name || "Unknown"}</li>`;
    })
    .join("");
}

function populateEncyclopedia() {
  $("allElementsList").innerHTML = allElements
    .map(e => `<li>${e.element_name}</li>`)
    .join("");
}

// =========================
// 💡 HINT SYSTEM
// =========================
function showHint() {
  const possible = allCombinations.filter(c =>
    unlockedElements.includes(c.element1_id) &&
    unlockedElements.includes(c.element2_id)
  );

  if (!possible.length) {
    $("result").textContent = "No hints available.";
    return;
  }

  const hint = possible[Math.floor(Math.random() * possible.length)];
  const e1 = allElements.find(e => e.id === hint.element1_id);
  const e2 = allElements.find(e => e.id === hint.element2_id);

  $("result").textContent = `Hint: ${e1.element_name} + ${e2.element_name}`;
}

// =========================
// 🎨 SETTINGS
// =========================
function applySettings() {
  if (settings.darkMode) document.body.classList.add("dark");
}
