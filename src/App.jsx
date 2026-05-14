import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { db } from "./firebase";
import {
  doc, setDoc, onSnapshot, updateDoc,
  collection, addDoc, query, where, getDocs, orderBy, arrayUnion
} from "firebase/firestore";

const COLORS = {
  bg: "#0A0A0F", card: "#13131A", border: "#1E1E2E",
  accent: "#6C63FF", accentDim: "#2D2A5E", accentLight: "#9D97FF",
  green: "#22C55E", greenDim: "#14532D", red: "#EF4444", redDim: "#450A0A",
  amber: "#F59E0B", amberDim: "#451A03", text: "#F4F4F8", muted: "#6B6B80", subtle: "#2A2A3A",
};
const FONTS = { display: "'Syne', sans-serif", body: "'DM Sans', sans-serif" };
const PALETTE = ["#6C63FF","#EC4899","#22C55E","#F59E0B","#06B6D4","#EF4444","#F97316","#A855F7","#14B8A6","#84CC16"];
const VAPID_PUBLIC_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtnP-4Kfqxw3m6v4Hd1Z0LdOiS0skseSm6W8YP5bbv4W2OnHAgf_JevLIta_OQ1I5PiKyxHAtx4p9UfqbmZ8ziA";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getInitials = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
};

const getLocalUser = () => { try { const s = localStorage.getItem("squad_user"); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveLocalUser = (u) => { try { localStorage.setItem("squad_user", JSON.stringify(u)); } catch {} };
const getLocalGroup = () => { try { const s = localStorage.getItem("squad_group"); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveLocalGroup = (g) => { try { localStorage.setItem("squad_group", JSON.stringify(g)); } catch {} };
const getSeenWelcome = () => { try { return localStorage.getItem("squad_welcome") === "1"; } catch { return false; } };
const setSeenWelcome = () => { try { localStorage.setItem("squad_welcome", "1"); } catch {} };

const Avatar = ({ user, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: user.color + "33", border: `2px solid ${user.color}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.3, fontWeight: 600, color: user.color, fontFamily: FONTS.body, flexShrink: 0,
  }}>{user.avatar}</div>
);

const Tag = ({ label, color }) => (
  <span style={{
    background: color + "22", color, padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.5, fontFamily: FONTS.body, border: `1px solid ${color}44`,
  }}>{label}</span>
);

const Btn = ({ children, onClick, variant = "primary", style = {}, disabled }) => {
  const base = { padding: "12px 24px", borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, ...style };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff" },
    secondary: { background: COLORS.subtle, color: COLORS.text, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.red, color: "#fff" },
    success: { background: COLORS.green, color: "#fff" },
    ghost: { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
};

// ─── WELCOME SCREEN ──────────────────────────────────────────────────────────

function WelcomeScreen({ onGetStarted }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, padding: "0 28px", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: COLORS.accent + "15", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 52, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>
          squad<span style={{ color: COLORS.accent }}>.</span>
        </div>

        {/* Slogan */}
        <div style={{ fontSize: 18, color: COLORS.accentLight, fontWeight: 600, marginBottom: 12 }}>
          your crew, one tap away
        </div>
        <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6, marginBottom: 48 }}>
          Plan events, track who's coming, split bills, and see your crew's live location — all in one place for you and your friends.
        </div>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48, textAlign: "left" }}>
          {[
            { icon: "📅", title: "Plan anything", desc: "From small hangouts to big nights out" },
            { icon: "📍", title: "Live location", desc: "See where your crew is in real time" },
            { icon: "💰", title: "Split bills", desc: "No more awkward money conversations" },
            { icon: "🏆", title: "Rankings", desc: "Who shows up the most? Find out." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 14, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 16px" }}>
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{f.title}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Btn onClick={onGetStarted} style={{ width: "100%", padding: "16px", fontSize: 17 }}>
          Get Started →
        </Btn>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 16 }}>Free forever · No ads · Just your crew</div>
      </div>
    </div>
  );
}

// ─── LOGIN / SIGNUP ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [view, setView] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [step, setStep] = useState("creds");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const inputStyle = { width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, boxSizing: "border-box", outline: "none", marginBottom: 12 };

  const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: "https://thecircle-seven.vercel.app" }
  });
  if (error) setError(error.message);
};

  useEffect(() => {
    const checkGoogleAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const gUser = session.user;
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", gUser.email)));
        if (!snap.empty) {
          const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
          saveLocalUser(u); onLogin(u);
        } else {
          const newUser = { name: gUser.user_metadata?.full_name || gUser.email.split("@")[0], email: gUser.email, avatar: getInitials(gUser.user_metadata?.full_name || gUser.email), color: PALETTE[Math.floor(Math.random() * PALETTE.length)], attended: 0, total: 0, streak: 0, joinedGroups: [] };
          const ref = await addDoc(collection(db, "users"), newUser);
          const u = { id: ref.id, ...newUser };
          saveLocalUser(u); onLogin(u);
        }
      }
    };
    checkGoogleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkGoogleAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const snap = await getDocs(query(collection(db, "users"), where("username", "==", username.trim().toLowerCase())));
    if (snap.empty) { setError("No account found with that username."); setLoading(false); return; }
    const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (u.password !== password) { setError("Incorrect password."); setLoading(false); return; }
    saveLocalUser(u); onLogin(u);
  };

  const handleSignup = async () => {
    if (step === "creds") {
      if (!name.trim() || !username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
      if (password.length < 4) { setError("Password must be at least 4 characters."); return; }
      setLoading(true); setError("");
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", username.trim().toLowerCase())));
      if (!snap.empty) { setError("Username already taken, try another."); setLoading(false); return; }
      setLoading(false); setStep("color"); return;
    }
    setLoading(true);
    const newUser = { name: name.trim(), username: username.trim().toLowerCase(), password, avatar: getInitials(name), color, attended: 0, total: 0, streak: 0, joinedGroups: [] };
    const ref = await addDoc(collection(db, "users"), newUser);
    const u = { id: ref.id, ...newUser };
    saveLocalUser(u); onLogin(u);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, padding: "0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 44, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -2 }}>squad<span style={{ color: COLORS.accent }}>.</span></div>
        <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>your crew, one tap away</div>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Google Sign In */}
        <button onClick={handleGoogleLogin} style={{
          width: "100%", padding: "14px", borderRadius: 14, border: `1px solid ${COLORS.border}`,
          background: COLORS.card, color: COLORS.text, fontSize: 15, fontWeight: 600,
          fontFamily: FONTS.body, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, transition: "all 0.15s"
        }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          <span style={{ fontSize: 12, color: COLORS.muted }}>or use username</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: COLORS.subtle, borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setView(t); setError(""); setStep("creds"); }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, background: view === t ? COLORS.accent : "transparent", color: view === t ? "#fff" : COLORS.muted, transition: "all 0.15s" }}>
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        {view === "login" && (
          <>
            <input value={username} onChange={e => { setUsername(e.target.value); setError(""); }} placeholder="Username" style={inputStyle} />
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Password" type={showPass ? "text" : "password"}
                style={{ ...inputStyle, marginBottom: 0, paddingRight: 48 }}
                onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>{showPass ? "Hide" : "Show"}</button>
            </div>
            {error && <div style={{ fontSize: 13, color: COLORS.red, marginBottom: 12 }}>{error}</div>}
            <Btn onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: "14px" }}>{loading ? "Logging in..." : "Log In"}</Btn>
          </>
        )}

        {view === "signup" && step === "creds" && (
          <>
            <input value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="Your name" style={inputStyle} />
            <input value={username} onChange={e => { setUsername(e.target.value); setError(""); }} placeholder="Choose a username" style={inputStyle} />
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Choose a password (min 4 chars)" type={showPass ? "text" : "password"}
                style={{ ...inputStyle, marginBottom: 0, paddingRight: 48 }} />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>{showPass ? "Hide" : "Show"}</button>
            </div>
            {error && <div style={{ fontSize: 13, color: COLORS.red, marginBottom: 12 }}>{error}</div>}
            <Btn onClick={handleSignup} disabled={loading} style={{ width: "100%", padding: "14px" }}>{loading ? "Checking..." : "Continue →"}</Btn>
          </>
        )}

        {view === "signup" && step === "color" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Avatar user={{ avatar: getInitials(name), color }} size={64} />
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginTop: 10 }}>Hey {name.split(" ")[0]}! Pick your colour</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>This is how your crew will see you</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 28 }}>
              {PALETTE.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: 40, height: 40, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? `3px solid #fff` : `3px solid transparent`, boxShadow: color === c ? `0 0 0 2px ${c}` : "none", transition: "all 0.15s" }} />)}
            </div>
            <Btn onClick={handleSignup} disabled={loading} style={{ width: "100%", padding: "14px" }}>{loading ? "Creating account..." : "🚀 Create Account"}</Btn>
            <div style={{ textAlign: "center", marginTop: 12 }}><Btn variant="ghost" onClick={() => setStep("creds")} style={{ fontSize: 13 }}>← Back</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GROUP SELECT ─────────────────────────────────────────────────────────────

function GroupSelectScreen({ user, onSelectGroup, onCreateGroup, onJoinGroup }) {
  const [view, setView] = useState("list");
  const [groupName, setGroupName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "groups"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllGroups(all);
      setMyGroups(all.filter(g => g.members && g.members.includes(user.id)));
    });
    return unsub;
  }, [user.id]);

  const genUniqueCode = () => {
    let code;
    do { code = String(Math.floor(1000 + Math.random() * 9000)); }
    while (allGroups.find(g => g.code === code));
    return code;
  };

  const startCreate = () => { setGroupName(""); setGeneratedCode(genUniqueCode()); setView("create"); };

  const handleCreate = async () => {
    if (groupName.trim().length < 2) return;
    setLoading(true);
    const newGroup = { name: groupName.trim(), code: generatedCode, members: [user.id], createdBy: user.id, createdAt: Date.now() };
    const ref = await addDoc(collection(db, "groups"), newGroup);
    const g = { id: ref.id, ...newGroup };
    await updateDoc(doc(db, "users", user.id), { joinedGroups: arrayUnion(g.id) });
    saveLocalGroup(g);
    onCreateGroup(g);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    const found = allGroups.find(g => g.code === code);
    if (!found) { setJoinError("No group found with that code."); return; }
    if (found.members && found.members.includes(user.id)) { setJoinError("You're already in this group!"); return; }
    if (found.members && found.members.length >= 15) { setJoinError("This group is full (15 max)."); return; }
    setLoading(true);
    await updateDoc(doc(db, "groups", found.id), { members: [...(found.members || []), user.id] });
    await updateDoc(doc(db, "users", user.id), { joinedGroups: arrayUnion(found.id) });
    const updated = { ...found, members: [...(found.members || []), user.id] };
    saveLocalGroup(updated);
    onJoinGroup(updated);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: FONTS.body }}>
      <div style={{ padding: "28px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -1 }}>squad<span style={{ color: COLORS.accent }}>.</span></div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Hey {user.name} 👋 pick your crew</div>
          </div>
          <Avatar user={user} size={38} />
        </div>

        {view === "list" && (
          <>
            {myGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>No groups yet</div>
                <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 32 }}>Create one — you'll get a 4-digit code to share with friends.</div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 14 }}>YOUR GROUPS</div>
                {myGroups.map(g => (
                  <div key={g.id} onClick={() => { saveLocalGroup(g); onSelectGroup(g); }} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "16px 18px", marginBottom: 12, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "88"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, fontFamily: FONTS.display }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{(g.members || []).length} member{(g.members || []).length !== 1 ? "s" : ""} · code: <span style={{ color: COLORS.accentLight, fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>{g.code}</span></div>
                    </div>
                    <span style={{ color: COLORS.accentLight, fontSize: 20 }}>→</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={startCreate} style={{ flex: 1 }}>+ Create group</Btn>
              <Btn variant="secondary" onClick={() => { setView("join"); setJoinCode(""); setJoinError(""); }} style={{ flex: 1 }}>Join with code</Btn>
            </div>
          </>
        )}

        {view === "create" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <Btn variant="ghost" onClick={() => setView("list")} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
              <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text }}>Create a group</div>
            </div>
            <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>GROUP NAME</label>
            <input autoFocus value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. The Boys, Beach Gang..."
              onKeyDown={e => { if (e.key === "Enter" && groupName.trim().length >= 2) handleCreate(); }}
              style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px", color: COLORS.text, fontSize: 16, fontFamily: FONTS.body, boxSizing: "border-box", outline: "none", marginTop: 8, marginBottom: 24 }} />
            <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>YOUR GROUP'S JOIN CODE</label>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 12 }}>Share this with your friends so they can join</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              {generatedCode.split("").map((d, i) => (
                <div key={i} style={{ flex: 1, height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, fontFamily: FONTS.display, color: COLORS.accentLight, background: COLORS.accentDim, border: `1px solid ${COLORS.accent}55`, borderRadius: 14 }}>{d}</div>
              ))}
            </div>
            <button onClick={() => setGeneratedCode(genUniqueCode())} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: FONTS.body, marginBottom: 24, padding: 0 }}>🔄 Generate a different code</button>
            <Btn onClick={handleCreate} disabled={groupName.trim().length < 2 || loading} style={{ width: "100%" }}>{loading ? "Creating..." : "Create & enter group"}</Btn>
          </div>
        )}

        {view === "join" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <Btn variant="ghost" onClick={() => setView("list")} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
              <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text }}>Join a group</div>
            </div>
            <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>ENTER THE 4-DIGIT CODE</label>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 12 }}>Ask the person who created the group</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              {[0,1,2,3].map(i => (
                <input key={i} id={`join-${i}`} type="number" inputMode="numeric" maxLength={1} value={joinCode[i] || ""}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g,"").slice(-1);
                    const arr = joinCode.split(""); arr[i] = val;
                    const next = arr.join("").slice(0,4);
                    setJoinCode(next); setJoinError("");
                    if (val && i < 3) document.getElementById(`join-${i+1}`)?.focus();
                  }}
                  onKeyDown={e => { if (e.key === "Backspace" && !joinCode[i] && i > 0) document.getElementById(`join-${i-1}`)?.focus(); }}
                  style={{ width: 48, height: 48, textAlign: "center", fontSize: 20, fontWeight: 800, fontFamily: FONTS.display, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }}
                />
              ))}
            </div>
            {joinError && <div style={{ fontSize: 13, color: COLORS.red, marginBottom: 4 }}>{joinError}</div>}
            <div style={{ marginBottom: 24 }} />
            <Btn onClick={handleJoin} disabled={joinCode.length !== 4 || loading} style={{ width: "100%" }}>{loading ? "Joining..." : "Join group"}</Btn>
          </div>
        )}
      </div>
    </div>
    );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ user, users, events, messages, group, joinedGroups, onCreateEvent, onViewEvent, onSelectGroup, onOpenGroupPicker, onRsvp, onLogout, onSendMessage, onRequestNotifications, notificationPermission, subscriptionStatus }) {
  const [showPendingInvite, setShowPendingInvite] = useState(true);
  const [chatText, setChatText] = useState("");
  const pendingEvent = events.find(ev => ev.hostId !== user.id && ev.rsvps && ev.rsvps[user.id] === null);
  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select value={group.id} onChange={e => onSelectGroup(joinedGroups.find(g => g.id === e.target.value))} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", color: COLORS.text, fontFamily: FONTS.body, fontSize: 14, minWidth: 180 }}>
              {joinedGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <Btn variant="secondary" onClick={onOpenGroupPicker} style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Join with code</Btn>
          </div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 8 }}>
            {group.members.length} members · code: <span style={{ color: COLORS.accentLight, fontWeight: 600 }}>{group.code}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar user={user} size={38} />
          <button onClick={onLogout} style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 12px", color: COLORS.red, fontSize: 14, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 500, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.redDim; e.currentTarget.style.borderColor = COLORS.red; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLORS.subtle; e.currentTarget.style.borderColor = COLORS.border; }}>Logout</button>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${COLORS.accentDim} 0%, #1A0A2E 100%)`, borderRadius: 20, padding: "20px", marginBottom: 24, border: `1px solid ${COLORS.accent}33` }}>
        <div style={{ fontSize: 12, color: COLORS.accentLight, letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>HOST AN EVENT</div>
        <div style={{ fontSize: 16, color: COLORS.text, fontWeight: 600, marginBottom: 12 }}>Plan something for the crew</div>
        <Btn onClick={onCreateEvent} style={{ width: "100%" }}>+ Create Tonight's Event</Btn>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: COLORS.accentLight, letterSpacing: 1, fontWeight: 600 }}>NOTIFICATIONS</div>
          <span style={{ fontSize: 12, color: notificationPermission === "granted" ? COLORS.green : notificationPermission === "denied" ? COLORS.red : COLORS.muted }}>
            {notificationPermission === "unsupported" ? "Unsupported" : notificationPermission === "granted" ? (subscriptionStatus === "subscribed" ? "Subscribed" : "Ready to subscribe") : notificationPermission === "denied" ? "Blocked" : "Not requested"}
          </span>
        </div>
        <div style={{ fontSize: 15, color: COLORS.text, fontWeight: 600, marginBottom: 10 }}>Stay informed about event invites and RSVP updates.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={onRequestNotifications} variant="secondary" style={{ flex: 1, minWidth: 160 }}>Enable notifications</Btn>
          {notificationPermission === "denied" && <div style={{ fontSize: 12, color: COLORS.muted }}>Notifications are blocked in your browser. Change site permissions to re-enable.</div>}
        </div>
      </div>

      {pendingEvent && showPendingInvite && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 200, background: COLORS.card, border: `1px solid ${COLORS.accent}55`, borderRadius: 20, padding: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>New event invite</div>
              <button onClick={() => setShowPendingInvite(false)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 14, cursor: "pointer", padding: 0 }}>Remind me later</button>
            </div>
            <div style={{ fontSize: 14, color: COLORS.muted }}>{pendingEvent.title} • {pendingEvent.time} at {pendingEvent.location}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{pendingEvent.description || "Can you join this event?"}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="success" onClick={() => { onRsvp(pendingEvent.id, "yes"); setShowPendingInvite(false); }} style={{ flex: 1, minWidth: 120 }}>YES, I can go</Btn>
              <Btn variant="danger" onClick={() => { onRsvp(pendingEvent.id, "no"); setShowPendingInvite(false); }} style={{ flex: 1, minWidth: 120 }}>NO, can't make it</Btn>
            </div>
          </div>
        </div>
      )}

      {events.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: COLORS.muted, fontSize: 14 }}>No events yet — be the first to create one!</div>}

      {events.map(ev => {
        const host = users.find(u => u.id === ev.hostId);
        const myRsvp = ev.rsvps ? ev.rsvps[user.id] : null;
        const yesCount = ev.rsvps ? Object.values(ev.rsvps).filter(v => v === "yes").length : 0;
        if (!host) return null;
        return (
          <div key={ev.id} onClick={() => onViewEvent(ev)} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "18px", marginBottom: 14, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "66"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <Tag label={ev.type} color={COLORS.accent} />
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 6, fontFamily: FONTS.display }}>{ev.title}</div>
              </div>
              {myRsvp === "yes" && <Tag label="Going ✓" color={COLORS.green} />}
              {myRsvp === "no" && <Tag label="Can't go" color={COLORS.red} />}
              {!myRsvp && ev.hostId !== user.id && <Tag label="Reply needed" color={COLORS.amber} />}
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 12 }}>{ev.description}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar user={host} size={24} />
                <span style={{ fontSize: 12, color: COLORS.muted }}>{host.name} hosting</span>
              </div>
              <span style={{ fontSize: 12, color: COLORS.muted }}>📍 {ev.location}</span>
              <span style={{ fontSize: 12, color: COLORS.muted }}>🕗 {ev.time}</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: COLORS.muted }}>{yesCount} going</span>
              <span style={{ fontSize: 12, color: COLORS.accentLight }}>View details →</span>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Group chat</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>{messages.length} messages</div>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, marginBottom: 14 }}>
          {messages.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: 13 }}>No messages yet — start the conversation.</div>
          ) : messages.map(msg => {
            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isMine = msg.userId === user.id;
            const initials = msg.userName ? msg.userName.split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase() : "?";
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 10, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.color ? `${msg.color}33` : COLORS.subtle, border: `1px solid ${msg.color || COLORS.border}`, color: msg.color || COLORS.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONTS.body }}>{initials}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <div style={{ background: isMine ? COLORS.accentDim : COLORS.subtle, border: `1px solid ${isMine ? COLORS.accent : COLORS.border}`, borderRadius: 16, padding: "10px 14px", color: COLORS.text, fontSize: 14, lineHeight: 1.5 }}>
                    {msg.text}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: COLORS.muted }}>{msg.userName}</span>
                    <span style={{ fontSize: 11, color: COLORS.muted }}>{time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && chatText.trim()) { onSendMessage(chatText); setChatText(""); } }} placeholder="Type a message..."
            style={{ flex: 1, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", background: COLORS.bg, color: COLORS.text, fontSize: 14, fontFamily: FONTS.body, outline: "none" }} />
          <Btn onClick={() => { onSendMessage(chatText); setChatText(""); }} disabled={!chatText.trim()} style={{ padding: "12px 18px" }}>Send</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE EVENT ─────────────────────────────────────────────────────────────

function CreateEventScreen({ user, users, group, onCreate, onBack }) {
  const [form, setForm] = useState({ title: "", type: "Hangout", location: "", time: "", description: "" });
  const types = ["Hangout", "House Party", "Club Night", "Dinner", "Movie", "Beach Day", "Road Trip"];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.location || !form.time) return;
    setLoading(true);
    const rsvps = {};
    users.forEach(u => { if (u.id !== user.id) rsvps[u.id] = null; });
    const ev = {
      title: form.title, type: form.type, location: form.location,
      time: form.time, description: form.description,
      hostId: user.id, groupId: group.id,
      rsvps, status: "upcoming", createdAt: Date.now(),
      liveLocations: {},
    };
    const ref = await addDoc(collection(db, "events"), ev);
    onCreate({ id: ref.id, ...ev });
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
        <div style={{ fontSize: 20, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text }}>New Event</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>EVENT NAME</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What's happening?"
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>VIBE</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {types.map(t => <button key={t} onClick={() => set("type", t)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${form.type === t ? COLORS.accent : COLORS.border}`, background: form.type === t ? COLORS.accentDim : "transparent", color: form.type === t ? COLORS.accentLight : COLORS.muted, fontSize: 13, fontFamily: FONTS.body, cursor: "pointer" }}>{t}</button>)}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>LOCATION</label>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Where are we going?"
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>TIME</label>
          <input value={form.time} onChange={e => set("time", e.target.value)} placeholder="e.g. Tonight, 9:00 PM"
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>DESCRIPTION</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Tell the crew what's up..." rows={3}
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, resize: "none", boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ background: COLORS.subtle, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>📣 Sending to {users.length - 1} crew members</div>
          <div style={{ display: "flex", gap: -6 }}>
            {users.filter(u => u.id !== user.id).map(u => <div key={u.id} style={{ marginRight: -6 }}><Avatar user={u} size={30} /></div>)}
          </div>
        </div>
        <Btn onClick={handleCreate} disabled={!form.title || !form.location || !form.time || loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Creating..." : "🚀 Send Invites to Crew"}
        </Btn>
      </div>
    </div>
  );
}

// ─── EVENT SCREEN ─────────────────────────────────────────────────────────────

function EventScreen({ event, user, users, onRsvp, onViewLive, onEndEvent, onBack }) {
  const host = users.find(u => u.id === event.hostId);
  const isHost = user.id === event.hostId;
  const myRsvp = event.rsvps ? event.rsvps[user.id] : null;
  const yesUsers = event.rsvps ? Object.entries(event.rsvps).filter(([,v]) => v === "yes").map(([id]) => users.find(u => u.id === id)).filter(Boolean) : [];
  const noUsers = event.rsvps ? Object.entries(event.rsvps).filter(([,v]) => v === "no").map(([id]) => users.find(u => u.id === id)).filter(Boolean) : [];
  const pendingUsers = event.rsvps ? Object.entries(event.rsvps).filter(([,v]) => v === null).map(([id]) => users.find(u => u.id === id)).filter(Boolean) : [];
  if (!host) return null;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
      </div>
      <Tag label={event.type} color={COLORS.accent} />
      <div style={{ fontSize: 26, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginTop: 8, marginBottom: 4, letterSpacing: -1 }}>{event.title}</div>
      <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 20 }}>{event.description}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ icon: "👤", label: "Host", val: host.name }, { icon: "🕗", label: "Time", val: event.time }, { icon: "📍", label: "Location", val: event.location }, { icon: "✅", label: "Going", val: `${yesUsers.length} confirmed` }].map(({ icon, label, val }) => (
          <div key={label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1 }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, marginTop: 4 }}>{icon} {val}</div>
          </div>
        ))}
      </div>

      {!isHost && myRsvp === null && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.amber}44`, borderRadius: 18, padding: "18px", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>You in tonight? 🎉</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="success" onClick={() => onRsvp(event.id, "yes")} style={{ flex: 1 }}>✓ I'm in!</Btn>
            <Btn variant="danger" onClick={() => onRsvp(event.id, "no")} style={{ flex: 1 }}>✗ Can't make it</Btn>
          </div>
        </div>
      )}
      {!isHost && myRsvp === "yes" && (
        <div style={{ background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ color: COLORS.green, fontWeight: 600 }}>✓ You're going! See you there.</div>
          <button onClick={() => onRsvp(event.id, null)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 6 }}>Change mind?</button>
        </div>
      )}
      {!isHost && myRsvp === "no" && (
        <div style={{ background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ color: COLORS.red, fontWeight: 600 }}>✗ You're not going</div>
          <button onClick={() => onRsvp(event.id, null)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 6 }}>Change mind?</button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        {[{ label: "Going", users: yesUsers, color: COLORS.green }, { label: "Not going", users: noUsers, color: COLORS.red }, { label: "Pending", users: pendingUsers, color: COLORS.amber }].map(({ label, users: us, color }) => us.length > 0 && (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 8 }}>{label.toUpperCase()} · {us.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {us.map(u => <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, background: color + "11", border: `1px solid ${color}33`, borderRadius: 20, padding: "5px 12px 5px 6px" }}><Avatar user={u} size={24} /><span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{u.name}</span></div>)}
            </div>
          </div>
        ))}
      </div>

      {isHost && event.status === "upcoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="secondary" onClick={onViewLive} style={{ width: "100%" }}>📍 Live Locations ({yesUsers.length} on the way)</Btn>
          <Btn variant="danger" onClick={onEndEvent} style={{ width: "100%" }}>🏁 End Event</Btn>
        </div>
      )}
    </div>
  );
}

// ─── LIVE LOCATION ────────────────────────────────────────────────────────────

function LiveLocationScreen({ event, user, users, onBack }) {
  const [myLoc, setMyLoc] = useState(null);
  const [locs, setLocs] = useState(event.liveLocations || {});
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", event.id), snap => {
      const data = snap.data();
      if (data && data.liveLocations) setLocs(data.liveLocations);
    });
    return unsub;
  }, [event.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(async pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: Date.now() };
      setMyLoc(loc);
      await updateDoc(doc(db, "events", event.id), { [`liveLocations.${user.id}`]: loc });
    }, null, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watch);
  }, [event.id, user.id]);

  // Build OpenStreetMap URL with all markers
  const locEntries = Object.entries(locs);
  const hasLocs = locEntries.length > 0;
  const centerLat = hasLocs ? locEntries.reduce((s,[,l]) => s + l.lat, 0) / locEntries.length : 20.5937;
  const centerLng = hasLocs ? locEntries.reduce((s,[,l]) => s + l.lng, 0) / locEntries.length : 78.9629;

  // Build iframe src for OpenStreetMap with markers
  const markerParams = locEntries.map(([uid, loc]) => {
    const u = users.find(x => x.id === uid);
    return `marker=${loc.lat},${loc.lng}`;
  }).join("&");

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng-0.02},${centerLat-0.02},${centerLng+0.02},${centerLat+0.02}&layer=mapnik&${markerParams}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bg }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
        <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text }}>Live Locations</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}`, animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, color: COLORS.green }}>Live</span>
        </div>
      </div>

      {/* MAP */}
      <div style={{ margin: "0 16px", borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.border}`, flex: "0 0 300px" }}>
        {hasLocs ? (
          <iframe
            src={mapSrc}
            width="100%" height="300"
            style={{ border: "none", display: "block" }}
            title="Live locations map"
          />
        ) : (
          <div style={{ height: 300, background: COLORS.subtle, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 32 }}>🗺️</div>
            <div style={{ fontSize: 13, color: COLORS.muted }}>Waiting for location data...</div>
          </div>
        )}
      </div>

      {myLoc && <div style={{ margin: "12px 16px 0", background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: COLORS.green }}>📍 Your location is being shared live</div>}
      {!myLoc && <div style={{ margin: "12px 16px 0", background: COLORS.amberDim, border: `1px solid ${COLORS.amber}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: COLORS.amber }}>📍 Allow location access to appear on the map</div>}

      {/* PEOPLE LIST */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {locEntries.map(([uid, loc]) => {
          const u = users.find(x => x.id === uid);
          if (!u) return null;
          const isMe = uid === user.id;
          const timeAgo = loc.updatedAt ? Math.round((Date.now() - loc.updatedAt) / 1000) : null;
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px" }}>
              <Avatar user={u} size={36} />
              <div style={{ marginLeft: 12, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{u.name} {isMe && <span style={{ fontSize: 11, color: COLORS.muted }}>(you)</span>}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{timeAgo !== null ? `Updated ${timeAgo}s ago` : "Sharing location"}</div>
              </div>
              <div style={{ fontSize: 11, color: COLORS.green, background: COLORS.greenDim, padding: "4px 10px", borderRadius: 10 }}>📍 Live</div>
            </div>
          );
        })}
        {locEntries.length === 0 && <div style={{ textAlign: "center", color: COLORS.muted, padding: "20px 0", fontSize: 14 }}>No one sharing location yet</div>}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── BILL SPLIT ───────────────────────────────────────────────────────────────

function BillSplitScreen({ event, users, onDone }) {
  const [hasBill, setHasBill] = useState(null);
  const [amount, setAmount] = useState("");
  const [split, setSplit] = useState(false);
  const attendees = event.rsvps ? Object.entries(event.rsvps).filter(([,v]) => v === "yes").map(([id]) => users.find(u => u.id === id)).filter(Boolean) : [];
  const perPerson = attendees.length > 0 ? (parseFloat(amount) / attendees.length) : 0;

  if (hasBill === null) return (
    <div style={{ padding: "40px 20px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 16 }}>🎉</div>
      <div style={{ fontSize: 24, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Event's a wrap!</div>
      <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 36 }}>Hope everyone had a great time.</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Was there a bill to split?</div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Btn onClick={() => setHasBill(true)} style={{ padding: "14px 32px", fontSize: 16 }}>💰 Yes, split it</Btn>
        <Btn variant="ghost" onClick={onDone} style={{ padding: "14px 32px", fontSize: 16 }}>No bill</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text, marginBottom: 24 }}>Bill Split</div>
      {!split ? (
        <>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 8 }}>TOTAL BILL AMOUNT (₹)</div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 36, fontWeight: 700, color: COLORS.text, fontFamily: FONTS.display, boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>SPLITTING BETWEEN · {attendees.length} PEOPLE</div>
            {attendees.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                <Avatar user={u} size={32} />
                <span style={{ marginLeft: 10, fontSize: 14, color: COLORS.text, flex: 1 }}>{u.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: amount ? COLORS.accentLight : COLORS.muted }}>{amount ? `₹${perPerson.toFixed(2)}` : "—"}</span>
              </div>
            ))}
          </div>
          {amount && <div style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}><div style={{ fontSize: 13, color: COLORS.accentLight }}>Total ₹{parseFloat(amount).toFixed(2)} ÷ {attendees.length} people = <strong>₹{perPerson.toFixed(2)} each</strong></div></div>}
          <Btn onClick={() => setSplit(true)} style={{ width: "100%" }} disabled={!amount}>Calculate Split</Btn>
        </>
      ) : (
        <>
          <div style={{ background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 18, padding: "24px 20px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: COLORS.green, letterSpacing: 1, marginBottom: 8 }}>EACH PERSON PAYS</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.green, fontFamily: FONTS.display }}>₹{perPerson.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>Total bill: ₹{parseFloat(amount).toFixed(2)}</div>
          </div>
          {attendees.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <Avatar user={u} size={34} />
              <span style={{ marginLeft: 10, fontSize: 14, color: COLORS.text, flex: 1 }}>{u.name}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.green }}>₹{perPerson.toFixed(2)}</div>
            </div>
          ))}
          <div style={{ marginTop: 20 }}><Btn onClick={onDone} style={{ width: "100%" }}>✓ All done!</Btn></div>
        </>
      )}
    </div>
  );
}

// ─── RANKINGS ─────────────────────────────────────────────────────────────────

function RankingsScreen({ user, users, events }) {
  const rankings = users.map(u => {
    const userEvents = events.filter(e => e.rsvps && e.rsvps[u.id] !== undefined);
    const attended = userEvents.filter(e => e.rsvps[u.id] === "yes").length;
    return { user: u, attended, total: userEvents.length, pct: userEvents.length > 0 ? Math.round((attended / userEvents.length) * 100) : 0 };
  }).sort((a, b) => b.attended - a.attended);
  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>Leaderboard</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>Who shows up the most 👀</div>
      {rankings.map((r, i) => {
        const isMe = r.user.id === user.id;
        return (
          <div key={r.user.id} style={{ background: isMe ? COLORS.accentDim : COLORS.card, border: `1px solid ${isMe ? COLORS.accent + "66" : COLORS.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 22, width: 30, textAlign: "center" }}>{i < 3 ? medals[i] : <span style={{ fontSize: 14, color: COLORS.muted, fontWeight: 600 }}>{i+1}</span>}</div>
            <Avatar user={r.user} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{r.user.name}</span>
                {isMe && <Tag label="you" color={COLORS.accent} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, background: COLORS.subtle, borderRadius: 4 }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : COLORS.accent, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{r.attended}/{r.total}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FONTS.display, color: i === 0 ? "#FFD700" : COLORS.text }}>{r.pct}%</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>attendance</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NAV BAR ──────────────────────────────────────────────────────────────────

function NavBar({ tab, setTab }) {
  const tabs = [{ id: "home", icon: "🏠", label: "Home" }, { id: "rankings", icon: "🏆", label: "Ranks" }];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 16px", zIndex: 100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 24px" }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontFamily: FONTS.body, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? COLORS.accentLight : COLORS.muted }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(getLocalGroup);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [groupData, setGroupData] = useState(currentGroup);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [subscriptionStatus, setSubscriptionStatus] = useState("unknown");

  const savePushSubscription = async (subscription) => {
    if (!currentUser) return;
    try {
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: currentUser.id,
          email: currentUser.email || null,
          name: currentUser.name,
          group_id: currentGroup?.id || null,
          subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (error) {
      console.warn("Failed to save push subscription", error);
    }
  };

  const loadJoinedGroups = async (userId) => {
    if (!userId) return [];
    const snap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", userId)));
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setJoinedGroups(groups);
    return groups;
  };

  const addGroupToUser = async (groupId) => {
    if (!currentUser?.id) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        joinedGroups: arrayUnion(groupId),
      });
      setCurrentUser(prev => ({ ...(prev || {}), joinedGroups: [...new Set([...(prev?.joinedGroups || []), groupId])] }));
    } catch (error) {
      console.warn("Failed to update user joined groups", error);
    }
  };

  const selectGroup = (group) => {
    setCurrentGroup(group);
    setGroupData(group);
    saveLocalGroup(group);
  };

  const openGroupPicker = () => {
    setCurrentGroup(null);
    setGroupData(null);
    saveLocalGroup(null);
    setScreen("home");
    setTab("home");
  };

  const handleCreatedGroup = async (group) => {
    selectGroup(group);
    await addGroupToUser(group.id);
    await loadJoinedGroups(currentUser?.id);
  };

  const handleJoinedGroup = async (group) => {
    selectGroup(group);
    await addGroupToUser(group.id);
    await loadJoinedGroups(currentUser?.id);
  };

  const updateNotificationStatus = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      setSubscriptionStatus("unsupported");
      return;
    }

    const permission = Notification.permission;
    let subscribed = false;

    if (permission === "granted" && "serviceWorker" in navigator && "PushManager" in window) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        subscribed = Boolean(subscription);
      }
    }

    setNotificationPermission(permission);
    setSubscriptionStatus(subscribed ? "subscribed" : "not_subscribed");
  };

  const registerServiceWorkerSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await savePushSubscription(subscription.toJSON());
      await updateNotificationStatus();
    } catch (error) {
      console.warn("Push registration failed", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      await registerServiceWorkerSubscription();
      await updateNotificationStatus();
      return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerServiceWorkerSubscription();
      }
      await updateNotificationStatus();
    }
  };

  const sendPushNotification = async (payload) => {
    try {
      await supabase.functions.invoke("send_push_notification", { body: JSON.stringify(payload) });
    } catch (error) {
      console.warn("Push notification dispatch failed", error);
    }
  };

  const notifyNewEvent = async (event) => {
    await sendPushNotification({
      type: "new_event",
      groupId: event.groupId,
      title: "New Squad event",
      body: `${currentUser?.name || "Someone"} created ${event.title}`,
      eventId: event.id,
      url: "/",
    });
  };

  const notifyRsvpUpdate = async (event, response) => {
    if (!event || event.hostId === currentUser?.id) return;
    await sendPushNotification({
      type: "rsvp_update",
      groupId: event.groupId,
      recipientId: event.hostId,
      title: "RSVP update",
      body: `${currentUser?.name || "Someone"} ${response === "yes" ? "is going" : "can't make it"} to ${event.title}`,
      eventId: event.id,
      url: "/",
    });
  };

  const handleEventCreated = async (event) => {
    setScreen("home");
    notifyNewEvent(event);
  };

  const handleRsvp = async (eventId, val) => {
    if (!eventId) return;
    try {
      const rsvpValue = val === null ? null : val;
      await updateDoc(doc(db, "events", eventId), { [`rsvps.${currentUser.id}`]: rsvpValue });
      const event = events.find(e => e.id === eventId) || selectedEvent;
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(ev => ({ ...ev, rsvps: { ...ev.rsvps, [currentUser.id]: rsvpValue } }));
      }
      if (rsvpValue !== null) {
        await notifyRsvpUpdate(event, rsvpValue);
      }
    } catch (error) {
      console.error("RSVP error:", error);
    }
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const gUser = session.user;
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", gUser.email)));
        if (!snap.empty) {
          const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setCurrentUser(u);
          requestNotificationPermission();
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const gUser = session.user;
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", gUser.email)));
        if (!snap.empty) {
          const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setCurrentUser(u);
          requestNotificationPermission();
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const initializeUserGroups = async () => {
      if (!currentUser) {
        setJoinedGroups([]);
        return;
      }
      const groups = await loadJoinedGroups(currentUser.id);
      if ((!currentGroup?.id || !groups.find(g => g.id === currentGroup.id)) && groups.length > 0) {
        selectGroup(groups[0]);
      }
      await updateNotificationStatus();
    };
    initializeUserGroups();
  }, [currentUser]);

  useEffect(() => {
    if (!currentGroup) return;
    const unsub = onSnapshot(doc(db, "groups", currentGroup.id), snap => {
      if (snap.exists()) setGroupData({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [currentGroup?.id]);

  useEffect(() => {
    if (!currentGroup) return;
    const unsub = onSnapshot(
      query(collection(db, "events"), where("groupId", "==", currentGroup.id)),
      snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt))
    );
    return unsub;
  }, [currentGroup?.id]);

  useEffect(() => {
    if (!currentGroup?.id) return;
    const messagesCollection = collection(db, "groups", currentGroup.id, "messages");
    const msgQuery = query(messagesCollection, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(msgQuery, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentGroup?.id]);

  useEffect(() => {
    if (!selectedEvent?.id) return;
    const unsub = onSnapshot(doc(db, "events", selectedEvent.id), snap => {
      if (snap.exists()) {
        const updatedEvent = { id: snap.id, ...snap.data() };
        setSelectedEvent(updatedEvent);
      }
    });
    return unsub;
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!groupData?.members?.length) return;
    const unsub = onSnapshot(collection(db, "users"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(all.filter(u => groupData.members.includes(u.id)));
    });
    return unsub;
  }, [groupData?.members]);

  const sendMessage = async (text) => {
    if (!currentGroup?.id || !text?.trim()) return;
    await addDoc(collection(db, "groups", currentGroup.id, "messages"), {
      groupId: currentGroup.id,
      text: text.trim(),
      userId: currentUser.id,
      userName: currentUser.name,
      color: currentUser.color,
      createdAt: Date.now(),
    });
  };

  const handleEndEvent = () => setScreen("billsplit");

  const handleDone = async () => {
    if (selectedEvent) await updateDoc(doc(db, "events", selectedEvent.id), { status: "ended" });
    setSelectedEvent(null);
    setScreen("home");
  };

  if (showWelcome && !currentUser) return <WelcomeScreen onGetStarted={() => setShowWelcome(false)} />;
  if (!currentUser) return <LoginScreen onLogin={u => { setCurrentUser(u); saveLocalUser(u); requestNotificationPermission(); }} />;
  if (!currentGroup) return (
    <GroupSelectScreen
      user={currentUser}
      onSelectGroup={g => selectGroup(g)}
      onCreateGroup={g => handleCreatedGroup(g)}
      onJoinGroup={g => handleJoinedGroup(g)}
    />
  );

  const handleSwitchGroup = () => { openGroupPicker(); };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentGroup(null); setGroupData(null); setJoinedGroups([]); saveLocalUser(null); saveLocalGroup(null); };

  const renderScreen = () => {
    if (tab === "rankings") return <RankingsScreen user={currentUser} users={users} events={events} />;
    switch (screen) {
      case "create":
        return <CreateEventScreen user={currentUser} users={users} group={groupData || currentGroup} onCreate={ev => { setScreen("home"); }} onBack={() => setScreen("home")} />;
      case "event":
        return selectedEvent ? <EventScreen event={selectedEvent} user={currentUser} users={users} onRsvp={handleRsvp} onViewLive={() => setScreen("live")} onEndEvent={handleEndEvent} onBack={() => setScreen("home")} /> : null;
      case "live":
        return selectedEvent ? <LiveLocationScreen event={selectedEvent} user={currentUser} users={users} onBack={() => setScreen("event")} /> : null;
      case "billsplit":
        return selectedEvent ? <BillSplitScreen event={selectedEvent} users={users} onDone={handleDone} /> : null;
      default:
        return <HomeScreen user={currentUser} users={users} events={events} messages={messages} joinedGroups={joinedGroups} group={groupData || currentGroup} onCreateEvent={() => setScreen("create")} onViewEvent={ev => { setSelectedEvent(ev); setScreen("event"); }} onSelectGroup={selectGroup} onOpenGroupPicker={openGroupPicker} onRsvp={handleRsvp} onLogout={handleLogout} onSendMessage={sendMessage} onRequestNotifications={requestNotificationPermission} notificationPermission={notificationPermission} subscriptionStatus={subscriptionStatus} />;
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: FONTS.body }}>
      <div style={{ paddingBottom: 80 }}>{renderScreen()}</div>
      {(screen === "home" || tab === "rankings") && <NavBar tab={tab} setTab={t => { setTab(t); setScreen("home"); }} />}
    </div>
  );
}
