let combineLock = false;

/* Modal open */
function openModal(id){
  document.getElementById(id).style.display = "flex";
  if (id === "encyclopediaModal") {
    loadEncyclopedia();
  }
}

/* Modal close */
function closeModal(e,id){
  if(e.target.classList.contains("modal")){
    document.getElementById(id).style.display="none";
  }
}

/* Clear workspace */
function clearWorkspace() {
  if (!confirm("Erase all placed elements?"))
    return;
  const workspace = document.getElementById("workspace");
  workspace.innerHTML = "";
  workspace.querySelectorAll(".element").forEach(el => el.remove());
  console.log("Workspace cleared");
}

/* Theme toggle */
function toggleTheme() {
  document.body.classList.toggle("light-mode");
}

/* Light mode styles */
const lightStyle = document.createElement("style");
lightStyle.innerHTML = `
body.light-mode {
  background: #f2f2f2;
  color: #111;
}
body.light-mode #workspace {
  background: #ffffff;
  border-color: #ccc;
}
body.light-mode #sidePanel {
  background: #e8e8e8;
}
body.light-mode .menuTile {
  background: #dddddd;
  color: black;
}
`;
document.head.appendChild(lightStyle);

/* Reset progress */
function resetProgress() {
  if (confirm("Reset all progress? This cannot be undone.")) {
    localStorage.clear();
    location.reload();
  }
}

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* Supabase setup */
const supabaseUrl = "https://ddbiqoyucdjxwauwytla.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmlxb3l1Y2RqeHdhdXd5dGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDA2MTMsImV4cCI6MjA5MjQ3NjYxM30.wCRnticq4Bgce6AyAvKbwgugILZsUFWlGjUxph382pI";
const supabase = createClient(supabaseUrl, supabaseKey);

/* Signup */
window.signup = async function () {
  const email = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;
  const { error } = await supabase.auth.signUp({
    email,
    password
  });
if (error) {
  console.log("FULL ERROR:", error);
  alert(JSON.stringify(error, null, 2));
}
};

/* Login */
window.login = async function () {
  const email = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    alert(error.message);
    return;
  }
  document.getElementById("accountStatus").innerText =
    "Logged in as: " + data.user.email;
};

/* Logout */
window.logout = async function () {
  await supabase.auth.signOut();
  document.getElementById("accountStatus").innerText = "Not logged in";
};

/* Auth listener */
supabase.auth.onAuthStateChange((event, session) => {
  console.log("AUTH EVENT:", event, session);
});

/* Auth UI update */
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    document.getElementById("accountStatus").innerText =
      "Logged in as: " + session.user.email;
  } else {
    document.getElementById("accountStatus").innerText =
      "Not logged in";
  }
});

/* Encyclopedia cache */
let encyclopediaCache = [];

/* Load encyclopedia */
window.loadEncyclopedia = async function () {
  const list = document.getElementById("encyclopediaList");
  list.innerHTML = "Loading...";
  const { data, error } = await supabase
    .from("elements")
    .select("element_name, category, description")
    .order("id", { ascending: true })
    .limit(10);
  if (error) {
    console.error(error);
    list.innerHTML = "Failed to load encyclopedia.";
    return;
  }
  list.innerHTML = "";
  data.forEach(el => {
    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.style.background = "#2d3b66";
    div.style.borderRadius = "10px";
    div.innerHTML = `
      <strong>${el.element_name}</strong><br>
      <small>${el.category || "Unknown"}</small><br>
      <span>${el.description || "No description"}</span>
    `;
    list.appendChild(div);
  });
  encyclopediaCache.forEach(el => {
    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.style.background = "#2d3b66";
    div.style.borderRadius = "10px";
    div.innerHTML = `
      <strong>${el.element_name}</strong><br>
      <small>${el.category || "Discovered"}</small><br>
      <span>${el.description || "Player discovered element"}</span>
    `;
    list.appendChild(div);
  });
};

/* Add to encyclopedia */
function appendEncyclopedia(el) {
  if (!el) return;
  // prevent duplicates by element_name
  const exists = encyclopediaCache.some(
    item => item.element_name === el.element_name
  );
  if (exists) return;
  encyclopediaCache.push(el);
  const list = document.getElementById("encyclopediaList");
  if (!list) return;
  const div = document.createElement("div");
  div.style.padding = "10px";
  div.style.marginBottom = "10px";
  div.style.background = "#2d3b66";
  div.style.borderRadius = "10px";
  div.innerHTML = `
    <strong>${el.element_name}</strong><br>
    <small>${el.category || "Discovered"}</small><br>
    <span>${el.description || "Player discovered element"}</span>
  `;

  list.appendChild(div);
}

/* Boundary check */
function isTouchingBoundary(tile) {
  const wr = workspace.getBoundingClientRect();
  const tr = tile.getBoundingClientRect();
  return (
    tr.left <= wr.left ||
    tr.right >= wr.right ||
    tr.top <= wr.top ||
    tr.bottom >= wr.bottom
  );
}

/* DOM refs */
const sidebar = document.getElementById("elementsContainer");
const workspace = document.getElementById("workspace");
const resultDiv = document.getElementById("result");

/* State */
let activeTile = null;
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let elements = [];
let elementMap = {};
let recipes = {};
let unlockedElements = new Set();

/* Load workspace */
function loadWorkspace() {
  const saved = localStorage.getItem("workspace");
  if (!saved) return;
  const data = JSON.parse(saved);
  data.forEach(item => {
    createTile(item.id, item.x, item.y);
  });
}

/* Init */
window.addEventListener("load", async () => {
  await loadElements();
  await loadRecipes();
  loadWorkspace();
});

/* Save workspace */
function saveWorkspace() {
  const data = [];
  document.querySelectorAll(".tile").forEach(tile => {
    data.push({
      id: tile.dataset.id,
      x: parseFloat(tile.style.left),
      y: parseFloat(tile.style.top)
    });
  });
  localStorage.setItem("workspace", JSON.stringify(data));
}

/* Load elements */
async function loadElements() {
    const { data, error } = await supabase
    .from("elements")
    .select("id, element_name, category, description");
  if (error) {
    console.error(error);
    return;
  }
  elements = data;
  unlockedElements = new Set(
    elements.slice(0, 10).map(e => e.id)
  );
  elementMap = {};
  elements.forEach(e => {
    elementMap[e.id] = e;
  });
  renderSidebar();
}

/* Mouse move */
document.addEventListener("mousemove", (e) => {
  if (!activeTile || !isDragging) return;
  const wr = workspace.getBoundingClientRect();
  const x = e.clientX - wr.left - offsetX;
  const y = e.clientY - wr.top - offsetY;
  activeTile.style.left = `${x}px`;
  activeTile.style.top = `${y}px`;
});

/* Mouse up */
document.addEventListener("mouseup", () => {
  if (!activeTile) return;
  isDragging = false;
  const tiles = document.querySelectorAll(".tile");
  tiles.forEach(other => {
    if (other === activeTile) return;
    if (isColliding(activeTile, other)) {
      combine(activeTile.dataset.id, other.dataset.id, other);
    }
  });
  if (isTouchingBoundary(activeTile)) {
    activeTile.remove();
    }
  activeTile.style.cursor = "grab";
  activeTile = null;
  saveWorkspace();
});

/* Mouse down */
document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  const tile = e.target.closest(".tile");
  if (!tile) return;
  activeTile = tile;
  isDragging = true;
  const wr = workspace.getBoundingClientRect();
  const rect = tile.getBoundingClientRect();
  // convert everything into workspace coordinates
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  tile.style.cursor = "grabbing";
});

/* Collision check */
function isColliding(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
}

/* Load recipes (combinations) */
async function loadRecipes() {
  const { data, error } = await supabase
    .from("combinations")
    .select("element1_id, element2_id, result_id");
  if (error) {
    console.error(error);
    return;
  }
  recipes = {};
  data.forEach(r => {
    recipes[`${r.element1_id}+${r.element2_id}`] = r.result_id;
    recipes[`${r.element2_id}+${r.element1_id}`] = r.result_id;
  });
}

/* Render sidebar */
function renderSidebar() {
  sidebar.innerHTML = "";
  elements
    .filter(el => unlockedElements.has(el.id))
    .forEach(el => {
      const div = document.createElement("div");
      div.className = "element";
      div.textContent = el.element_name;
    div.addEventListener("mousedown", (e) => {
        const wr = workspace.getBoundingClientRect();
        const x = e.clientX - wr.left;
        const y = e.clientY - wr.top;
        const tile = createTile(el.id, x, y);
        activeTile = tile;
        isDragging = true;
        const rect = tile.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        tile.style.cursor = "grabbing";
        });
      sidebar.appendChild(div);
    });
}

/* Create tile */
function createTile(id, x, y) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.textContent = elementMap[String(id)]?.element_name ?? id;
  tile.dataset.id = id;
  tile.style.left = x + "px";
  tile.style.top = y + "px";
  tile.addEventListener("mousedown", (e) => {
    activeTile = tile;
    const rect = tile.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    tile.style.cursor = "grabbing";
  });
  workspace.appendChild(tile);
  return tile;
}

/* Combine system */
function combine(id1, id2, targetTile) {
  const resultId = recipes[`${id1}+${id2}`];
  if (!resultId) {
    resultDiv.textContent = "No combo";
    return;
  }
  const rect = targetTile.getBoundingClientRect();
  const wr = workspace.getBoundingClientRect();
  const x = rect.left - wr.left;
  const y = rect.top - wr.top;
  if (activeTile && activeTile !== targetTile) {
    activeTile.remove();
  }
  targetTile.remove();
  createTile(resultId, x, y);
  unlockedElements.add(resultId);
  renderSidebar();
  const newElement = elementMap[resultId];
  if (newElement) {
    appendEncyclopedia(newElement);
  } else {
        console.warn("Encyclopedia append failed: missing element", resultId);
  }
  resultDiv.textContent =
    `${elementMap[id1]} + ${elementMap[id2]} = ${elementMap[resultId]}`;
}

/* Init load */
window.addEventListener("load", async () => {
  await loadElements();
  await loadRecipes();
});