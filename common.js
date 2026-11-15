/* ===== 1. FIREBASE CONFIG ===== */
const CFG = { apiKey: "PASTE_HERE", authDomain: "PASTE_HERE", projectId: "PASTE_HERE", appId: "PASTE_HERE" };
/* ===== 2. ZUMER'S LOGIN EMAIL ===== */
export const ZUMER_EMAIL = "zumer@example.com";

export const GENRES = [
  { slug: "psychological-thriller", name: "Psychological Thriller", note: "Minds that don't tell the whole truth" },
  { slug: "short-stories", name: "Short Stories", note: "Quiet moments, finished in one sitting" },
  { slug: "my-stories-quotes", name: "Quotes from Stories", note: "Fragments from Zumer's notebook" },
  { slug: "non-fiction", name: "Non-Fiction", note: "Real thoughts, written plainly" }
];

const SAMPLE = [];

export const isZumer = u => !!u && u.email === ZUMER_EMAIL;
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const gname = slug => (GENRES.find(g => g.slug === slug) || {}).name || "";
export const toast = t => { const e = document.getElementById("toast"); if (!e) return; e.textContent = t; e.className = "show"; setTimeout(() => e.className = "", 3200); };
export const storyCard = s => `<a class="card" href="read.html?story=${s.id}"><small>${esc(gname(s.genre))}</small><h3>${esc(s.title)}</h3><p>${esc(s.summary || "")}</p><span>${(s.chapters || []).length} chapter${(s.chapters || []).length === 1 ? "" : "s"} · by Zumer</span></a>`;

/* Sticky Header with Search Input & Clean ZUMER Logo */
const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
put("hdr", `<header class="bar">
  <a href="index.html" class="brand">ZUMER</a>
  <nav><a href="index.html#home">Home</a><a href="index.html#stories">Stories</a><a href="index.html#about">About</a><a href="index.html#contact">Contact</a></nav>
  <form class="hsearch" action="read.html" method="GET">
    <input name="q" type="search" placeholder="Search stories..." aria-label="Search stories" required>
  </form>
  <div class="who" id="who"></div>
  <button class="burger" id="burger" aria-label="Menu">☰</button>
</header>`);

put("ftr", `<footer>
  <div class="foot">
    <div>
      <p class="brand">ZUMER</p>
      <p class="mute">Unspoken truths, stories that stay.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <a href="index.html#stories">Stories</a>
      <a href="index.html#about">About Zumer</a>
      <a href="index.html#contact">Contact</a>
    </div>
    <div>
      <h4>Members</h4>
      <a href="login.html?signup=1">Join the book club</a>
      <a href="login.html">Log in</a>
      <a href="admin.html">Writer sign in</a>
    </div>
  </div>
  <div style="max-width: 1000px; margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; text-align: left;">
    <p class="small mute">© ${new Date().getFullYear()} Zumer. All rights reserved. Unauthorized reproduction prohibited.</p>
    <div style="display: flex; gap: 1.5rem;">
      <a href="#" class="small mute" onclick="alert('Privacy Policy: All reader accounts and messages are securely stored.'); return false;">Privacy Policy</a>
      <a href="#" class="small mute" onclick="alert('Terms: All stories written by Zumer are protected under copyright law.'); return false;">Terms of Use</a>
    </div>
  </div>
</footer>`);

document.getElementById("burger")?.addEventListener("click", () => document.querySelector(".bar").classList.toggle("open"));
const guest = '<a class="btn sm" href="login.html">Log in</a><a class="btn sm red" href="login.html?signup=1">Sign up</a>';
put("who", guest);

/* Firebase & LocalStorage Fallback Authentication */
export let auth = null, db = null, ready = false;
export const F = {};

function initLocalAuth() {
  ready = true;
  const checkUser = () => {
    const raw = localStorage.getItem("zumer_current_user");
    return raw ? JSON.parse(raw) : null;
  };
  
  const updateHeader = () => {
    const u = checkUser();
    put("who", u 
      ? `${isZumer(u) ? '<a class="btn sm red" href="admin.html">Studio</a>' : `<span class="small mute">Hi, ${esc(u.displayName || "reader")}</span>`}<button class="btn sm" id="out">Log out</button>`
      : guest);
    document.getElementById("out")?.addEventListener("click", () => {
      localStorage.removeItem("zumer_current_user");
      toast("Logged out successfully.");
      updateHeader();
      setTimeout(() => location.href = "index.html", 600);
    });
  };
  updateHeader();

  F.createUserWithEmailAndPassword = async (a, email, pw) => {
    let users = JSON.parse(localStorage.getItem("zumer_users") || "[]");
    if (users.find(u => u.email === email)) throw { code: "auth/email-already-in-use" };
    if (!email || !email.includes("@")) throw { code: "auth/invalid-email" };
    if (pw.length < 6) throw { code: "auth/weak-password" };
    const newUser = { uid: "user_" + Date.now(), email, displayName: email.split("@")[0] };
    users.push({ ...newUser, pw });
    localStorage.setItem("zumer_users", JSON.stringify(users));
    localStorage.setItem("zumer_current_user", JSON.stringify(newUser));
    updateHeader();
    return { user: newUser };
  };

  F.signInWithEmailAndPassword = async (a, email, pw) => {
    let users = JSON.parse(localStorage.getItem("zumer_users") || "[]");
    if (email === ZUMER_EMAIL && !users.find(u => u.email === ZUMER_EMAIL)) {
      users.push({ uid: "zumer_admin", email: ZUMER_EMAIL, pw: "zumer123", displayName: "Zumer" });
    }
    const found = users.find(u => u.email === email && u.pw === pw);
    if (!found) throw { code: "auth/invalid-credential" };
    const sessionUser = { uid: found.uid, email: found.email, displayName: found.displayName };
    localStorage.setItem("zumer_current_user", JSON.stringify(sessionUser));
    updateHeader();
    return { user: sessionUser };
  };

  F.signOut = async () => {
    localStorage.removeItem("zumer_current_user");
    updateHeader();
  };

  F.updateProfile = async (u, { displayName }) => {
    let users = JSON.parse(localStorage.getItem("zumer_users") || "[]");
    const idx = users.findIndex(x => x.email === u.email);
    if (idx >= 0) {
      users[idx].displayName = displayName;
      localStorage.setItem("zumer_users", JSON.stringify(users));
    }
    u.displayName = displayName;
    localStorage.setItem("zumer_current_user", JSON.stringify(u));
    updateHeader();
  };

  F.setDoc = async () => {};
  F.addDoc = async () => {};
  F.collection = () => {};
  F.serverTimestamp = () => new Date().toISOString();
}

try {
  if (!CFG.apiKey.startsWith("PASTE")) {
    const B = "https://www.gstatic.com/firebasejs/10.12.2/";
    const [a, au, fs] = await Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
    const app = a.initializeApp(CFG);
    auth = au.getAuth(app); db = fs.getFirestore(app);
    Object.assign(F, au, fs); ready = true;
    F.onAuthStateChanged(auth, u => {
      put("who", u
        ? `${isZumer(u) ? '<a class="btn sm red" href="admin.html">Studio</a>' : `<span class="small mute">Hi, ${esc(u.displayName || "reader")}</span>`}<button class="btn sm" id="out">Log out</button>`
        : guest);
      document.getElementById("out")?.addEventListener("click", () => F.signOut(auth));
    });
  } else {
    initLocalAuth();
  }
} catch (e) { 
  initLocalAuth(); 
}

export const loadStories = async () => !ready ? SAMPLE
  : (await F.getDocs(F.query(F.collection(db, "stories"), F.orderBy("createdAt", "desc")))).docs.map(d => ({ id: d.id, ...d.data() }));
