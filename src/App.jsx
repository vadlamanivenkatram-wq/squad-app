import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0A0A0F",
  card: "#13131A",
  border: "#1E1E2E",
  accent: "#6C63FF",
  accentDim: "#2D2A5E",
  accentLight: "#9D97FF",
  green: "#22C55E",
  greenDim: "#14532D",
  red: "#EF4444",
  redDim: "#450A0A",
  amber: "#F59E0B",
  amberDim: "#451A03",
  text: "#F4F4F8",
  muted: "#6B6B80",
  subtle: "#2A2A3A",
};

const FONTS = {
  display: "'Syne', sans-serif",
  body: "'DM Sans', sans-serif",
};

const PALETTE = [
  "#6C63FF","#EC4899","#22C55E","#F59E0B",
  "#06B6D4","#EF4444","#F97316","#A855F7",
  "#14B8A6","#84CC16",
];

const initUsers = () => {
  try {
    const saved = localStorage.getItem("squad_users");
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
};

const saveUsers = (users) => {
  try { localStorage.setItem("squad_users", JSON.stringify(users)); } catch {}
};

const initGroups = () => {
  try {
    const saved = localStorage.getItem("squad_groups");
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
};

const saveGroups = (groups) => {
  try { localStorage.setItem("squad_groups", JSON.stringify(groups)); } catch {}
};

const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const getInitials = (name) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const mockEvents = [
  {
    id: 1,
    title: "Rooftop Session",
    type: "Hangout",
    host: 1,
    date: "Tonight, 8:00 PM",
    location: "Kabir's Place",
    description: "Chilling on the terrace. Bring snacks!",
    rsvps: { 2: "yes", 3: "yes", 4: "no", 5: "yes", 6: null },
    attendees: [2, 3, 5],
    bill: null,
    status: "upcoming",
    liveLocations: {
      2: { lat: 12.99, lng: 80.21, eta: "5 min" },
      3: { lat: 12.98, lng: 80.22, eta: "arrived" },
      5: { lat: 12.97, lng: 80.20, eta: "12 min" },
    },
  },
];

const buildRankings = (users) =>
  users.map((u, i) => ({
    user: u.id,
    attended: u.attended ?? 0,
    total: u.total ?? 0,
    streak: u.streak ?? 0,
  })).sort((a, b) => b.attended - a.attended);

const Avatar = ({ user, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: user.color + "33", border: `2px solid ${user.color}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.3, fontWeight: 600, color: user.color,
    fontFamily: FONTS.body, flexShrink: 0,
  }}>
    {user.avatar}
  </div>
);

const Tag = ({ label, color }) => (
  <span style={{
    background: color + "22", color: color,
    padding: "3px 10px", borderRadius: 20, fontSize: 11,
    fontWeight: 600, letterSpacing: 0.5, fontFamily: FONTS.body,
    border: `1px solid ${color}44`,
  }}>{label}</span>
);

const Btn = ({ children, onClick, variant = "primary", style = {}, disabled }) => {
  const base = {
    padding: variant === "sm" ? "7px 16px" : "12px 24px",
    borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: FONTS.body, fontWeight: 600,
    fontSize: variant === "sm" ? 13 : 15, transition: "all 0.15s",
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff" },
    secondary: { background: COLORS.subtle, color: COLORS.text, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.red, color: "#fff" },
    success: { background: COLORS.green, color: "#fff" },
    ghost: { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` },
    sm: { background: COLORS.subtle, color: COLORS.text, border: `1px solid ${COLORS.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
};

function LoginScreen({ users, onLogin, onUpdateUsers }) {
  const [view, setView] = useState(users.length === 0 ? "welcome" : "pick");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [setupStep, setSetupStep] = useState("name");

  const handlePick = (u) => onLogin(u);

  const finishSetup = () => {
    const newUser = {
      id: Date.now(),
      name: newName.trim(),
      avatar: getInitials(newName),
      color: newColor,
      attended: 0, total: 0, streak: 0,
    };
    const updated = [...users, newUser];
    onUpdateUsers(updated);
    saveUsers(updated);
    onLogin(newUser);
  };

  const Logo = () => (
    <div style={{ textAlign: "center", marginBottom: 40 }}>
      <div style={{ fontSize: 44, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -2 }}>
        squad<span style={{ color: COLORS.accent }}>.</span>
      </div>
      <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>your crew, organized</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, padding: "0 20px" }}>
      <Logo />

      {view === "welcome" && (
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 16, color: COLORS.text, fontWeight: 600, marginBottom: 8 }}>Welcome to squad.</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 32 }}>Set up your crew — up to 15 people can join.</div>
          <Btn onClick={() => { setView("setup"); setSetupStep("name"); }} style={{ width: "100%" }}>
            Create my profile
          </Btn>
        </div>
      )}

      {view === "pick" && (
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", marginBottom: 20, letterSpacing: 1 }}>WHO ARE YOU?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {users.map(u => (
              <div key={u.id} onClick={() => handlePick(u)} style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 16, padding: "16px 8px", textAlign: "center",
                cursor: "pointer", transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + "11"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.card; }}
              >
                <Avatar user={u} size={44} />
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{u.name}</div>
              </div>
            ))}
            {users.length < 15 && (
              <div onClick={() => { setView("setup"); setSetupStep("name"); setNewName(""); setNewColor(PALETTE[users.length % PALETTE.length]); }} style={{
                background: "transparent", border: `1px dashed ${COLORS.border}`,
                borderRadius: 16, padding: "16px 8px", textAlign: "center",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s", minHeight: 90,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${COLORS.muted}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: COLORS.muted }}>+</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Add member</div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "setup" && (
        <div style={{ width: "100%", maxWidth: 340 }}>
          {setupStep === "name" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, textAlign: "center", marginBottom: 6 }}>What's your name?</div>
              <div style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginBottom: 24 }}>This is how your crew will see you</div>
              <input
                autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Your name"
                onKeyDown={e => { if (e.key === "Enter" && newName.trim().length >= 2) setSetupStep("color"); }}
                style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px", color: COLORS.text, fontSize: 18, fontFamily: FONTS.body, boxSizing: "border-box", textAlign: "center", outline: "none", marginBottom: 20 }}
              />
              {newName.trim().length >= 2 && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <Avatar user={{ avatar: getInitials(newName), color: newColor }} size={56} />
                </div>
              )}
              <Btn onClick={() => setSetupStep("color")} disabled={newName.trim().length < 2} style={{ width: "100%" }}>Continue →</Btn>
              {users.length > 0 && (
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Btn variant="ghost" onClick={() => setView("pick")} style={{ fontSize: 13 }}>← Back</Btn>
                </div>
              )}
            </>
          )}

          {setupStep === "color" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, textAlign: "center", marginBottom: 6 }}>Pick your colour</div>
              <div style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginBottom: 24 }}>This is your vibe in the squad</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <Avatar user={{ avatar: getInitials(newName), color: newColor }} size={64} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 28 }}>
                {PALETTE.map(c => (
                  <div key={c} onClick={() => setNewColor(c)} style={{
                    width: 38, height: 38, borderRadius: "50%", background: c,
                    cursor: "pointer", border: newColor === c ? `3px solid #fff` : `3px solid transparent`,
                    boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
                    transition: "all 0.15s",
                  }} />
                ))}
              </div>
              <Btn onClick={finishSetup} style={{ width: "100%" }}>Let's go 🚀</Btn>
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <Btn variant="ghost" onClick={() => setSetupStep("name")} style={{ fontSize: 13 }}>← Back</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GroupSelectScreen({ user, groups, onSelectGroup, onCreateGroup, onJoinGroup }) {
  const [view, setView] = useState("list");
  const [groupName, setGroupName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const myGroups = groups.filter(g => g.members.includes(user.id));

  const genUniqueCode = () => {
    let code;
    do { code = String(Math.floor(1000 + Math.random() * 9000)); }
    while (groups.find(g => g.code === code));
    return code;
  };

  const startCreate = () => {
    setGroupName("");
    setGeneratedCode(genUniqueCode());
    setView("create");
  };

  const handleCreate = () => {
    if (groupName.trim().length < 2) return;
    onCreateGroup({ id: Date.now(), name: groupName.trim(), code: generatedCode, members: [user.id], createdBy: user.id, events: [] });
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    const found = groups.find(g => g.code === code);
    if (!found) { setJoinError("No group found with that code."); return; }
    if (found.members.includes(user.id)) { setJoinError("You're already in this group!"); return; }
    if (found.members.length >= 15) { setJoinError("This group is full (15 max)."); return; }
    onJoinGroup(found.id);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: FONTS.body }}>
      <div style={{ padding: "28px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -1 }}>
              squad<span style={{ color: COLORS.accent }}>.</span>
            </div>
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
                <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 32 }}>Create one — you'll get a random 4-digit code to share with your friends.</div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 14 }}>YOUR GROUPS</div>
                {myGroups.map(g => (
                  <div key={g.id} onClick={() => onSelectGroup(g)} style={{
                    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18,
                    padding: "16px 18px", marginBottom: 12, cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "88"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, fontFamily: FONTS.display }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                        {g.members.length} member{g.members.length !== 1 ? "s" : ""} · code: <span style={{ color: COLORS.accentLight, fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>{g.code}</span>
                      </div>
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
            <input
              autoFocus value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. The Boys, Beach Gang..."
              onKeyDown={e => { if (e.key === "Enter" && groupName.trim().length >= 2) handleCreate(); }}
              style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px", color: COLORS.text, fontSize: 16, fontFamily: FONTS.body, boxSizing: "border-box", outline: "none", marginTop: 8, marginBottom: 24 }}
            />
            <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>YOUR GROUP'S JOIN CODE</label>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 12 }}>Share this 4-digit code with your friends so they can join</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              {generatedCode.split("").map((d, i) => (
                <div key={i} style={{
                  flex: 1, height: 64, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: 800, fontFamily: FONTS.display, color: COLORS.accentLight,
                  background: COLORS.accentDim, border: `1px solid ${COLORS.accent}55`, borderRadius: 14,
                }}>{d}</div>
              ))}
            </div>
            <button onClick={() => setGeneratedCode(genUniqueCode())} style={{
              background: "none", border: "none", color: COLORS.muted, fontSize: 12,
              cursor: "pointer", fontFamily: FONTS.body, marginBottom: 24, padding: 0,
            }}>🔄 Generate a different code</button>
            <Btn onClick={handleCreate} disabled={groupName.trim().length < 2} style={{ width: "100%" }}>
              Create & enter group
            </Btn>
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
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              {[0,1,2,3].map(i => (
                <input
                  key={i} id={`join-${i}`} type="number" inputMode="numeric" maxLength={1}
                  value={joinCode[i] || ""}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "").slice(-1);
                    const arr = joinCode.split("");
                    arr[i] = val;
                    const next = arr.join("").slice(0, 4);
                    setJoinCode(next);
                    setJoinError("");
                    if (val && i < 3) document.getElementById(`join-${i+1}`)?.focus();
                  }}
                  onKeyDown={e => { if (e.key === "Backspace" && !joinCode[i] && i > 0) document.getElementById(`join-${i-1}`)?.focus(); }}
                  style={{
                    flex: 1, height: 64, textAlign: "center", fontSize: 32, fontWeight: 800,
                    fontFamily: FONTS.display, background: COLORS.card,
                    border: `1px solid ${joinError ? COLORS.red : joinCode[i] ? COLORS.accent : COLORS.border}`,
                    borderRadius: 14, color: COLORS.text, outline: "none", MozAppearance: "textfield",
                  }}
                />
              ))}
            </div>
            {joinError && <div style={{ fontSize: 13, color: COLORS.red, marginBottom: 4 }}>{joinError}</div>}
            <div style={{ marginBottom: 24 }} />
            <Btn onClick={handleJoin} disabled={joinCode.length !== 4} style={{ width: "100%" }}>Join group</Btn>
          </div>
        )}
      </div>
    </div>
  );
}


function HomeScreen({ user, users, events, group, onCreateEvent, onViewEvent, onSwitchGroup }) {
  const myEvent = events.find(e => e.rsvps[user.id] !== undefined || e.host === user.id);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 22, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, letterSpacing: -1 }}>
              {group ? group.name : "squad."}
            </div>
            {group && (
              <button onClick={onSwitchGroup} style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "3px 9px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: FONTS.body }}>switch</button>
            )}
          </div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>
            {group ? `${group.members.length} members · code: ` : "What's happening today?"}
            {group && <span style={{ color: COLORS.accentLight, fontWeight: 600 }}>{group.code}</span>}
          </div>
        </div>
        <Avatar user={user} size={38} />
      </div>

      <div style={{ background: `linear-gradient(135deg, ${COLORS.accentDim} 0%, #1A0A2E 100%)`, borderRadius: 20, padding: "20px", marginBottom: 24, border: `1px solid ${COLORS.accent}33` }}>
        <div style={{ fontSize: 12, color: COLORS.accentLight, letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>YOU'RE THE HOST TODAY</div>
        <div style={{ fontSize: 16, color: COLORS.text, fontWeight: 600, marginBottom: 12 }}>Plan something for the crew</div>
        <Btn onClick={onCreateEvent} style={{ width: "100%" }}>+ Create Tonight's Event</Btn>
      </div>

      {events.map(ev => {
        const host = users.find(u => u.id === ev.host);
        const myRsvp = ev.rsvps[user.id];
        const yesCount = Object.values(ev.rsvps).filter(v => v === "yes").length;
        if (!host) return null;
        return (
          <div key={ev.id} onClick={() => onViewEvent(ev)} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20,
            padding: "18px", marginBottom: 14, cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "66"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <Tag label={ev.type} color={COLORS.accent} />
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 6, fontFamily: FONTS.display }}>{ev.title}</div>
              </div>
              {myRsvp === "yes" && <Tag label="Going ✓" color={COLORS.green} />}
              {myRsvp === "no" && <Tag label="Can't go" color={COLORS.red} />}
              {myRsvp === null && <Tag label="Reply needed" color={COLORS.amber} />}
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 12 }}>{ev.description}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar user={host} size={24} />
                <span style={{ fontSize: 12, color: COLORS.muted }}>{host.name} hosting</span>
              </div>
              <span style={{ fontSize: 12, color: COLORS.muted }}>📍 {ev.location}</span>
              <span style={{ fontSize: 12, color: COLORS.muted }}>🕗 {ev.date}</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: -4 }}>
                {Object.entries(ev.rsvps).filter(([, v]) => v === "yes").slice(0, 5).map(([uid]) => {
                  const u = users.find(x => x.id === parseInt(uid));
                  return u ? <div key={uid} style={{ marginRight: -8 }}><Avatar user={u} size={28} /></div> : null;
                })}
                <div style={{ marginLeft: 16, fontSize: 12, color: COLORS.muted, lineHeight: "28px" }}>{yesCount} going</div>
              </div>
              <span style={{ fontSize: 12, color: COLORS.accentLight }}>View details →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateEventScreen({ user, users, onCreate, onBack }) {
  const [form, setForm] = useState({ title: "", type: "Hangout", location: "", date: "", description: "", time: "" });
  const types = ["Hangout", "House Party", "Club Night", "Dinner", "Movie", "Beach Day", "Road Trip"];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = () => {
    if (!form.title || !form.location || !form.time) return;
    const newEvent = {
      id: Date.now(), title: form.title, type: form.type,
      host: user.id, date: form.time,
      location: form.location, description: form.description,
      rsvps: Object.fromEntries(users.filter(u2 => u2.id !== user.id).map(u2 => [u2.id, null])),
      attendees: [], bill: null, status: "upcoming",
      liveLocations: {},
    };
    onCreate(newEvent);
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
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>VIBE</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {types.map(t => (
              <button key={t} onClick={() => set("type", t)} style={{
                padding: "7px 14px", borderRadius: 20, border: `1px solid ${form.type === t ? COLORS.accent : COLORS.border}`,
                background: form.type === t ? COLORS.accentDim : "transparent",
                color: form.type === t ? COLORS.accentLight : COLORS.muted,
                fontSize: 13, fontFamily: FONTS.body, cursor: "pointer",
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>LOCATION</label>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Where are we going?"
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>TIME</label>
          <input value={form.time} onChange={e => set("time", e.target.value)} placeholder="e.g. Tonight, 9:00 PM"
            style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, fontWeight: 600 }}>DESCRIPTION</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Tell the crew what's up..."
            rows={3} style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: FONTS.body, marginTop: 6, resize: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ background: COLORS.subtle, borderRadius: 14, padding: "14px 16px", marginTop: 4 }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>📣 Notifications will be sent to {users.length - 1} crew members</div>
          <div style={{ display: "flex", gap: -6 }}>
            {users.filter(u2 => u2.id !== user.id).map(u2 => <div key={u2.id} style={{ marginRight: -6 }}><Avatar user={u2} size={30} /></div>)}
          </div>
        </div>

        <Btn onClick={handleCreate} style={{ width: "100%", marginTop: 8 }} disabled={!form.title || !form.location || !form.time}>
          🚀 Send Invites to Crew
        </Btn>
      </div>
    </div>
  );
}

function EventScreen({ event, user, users, onRsvp, onViewLive, onEndEvent, onBack }) {
  const host = users.find(u => u.id === event.host);
  const isHost = user.id === event.host;
  const myRsvp = event.rsvps[user.id];
  const yesUsers = Object.entries(event.rsvps).filter(([, v]) => v === "yes").map(([id]) => users.find(u => u.id === parseInt(id)));
  const noUsers = Object.entries(event.rsvps).filter(([, v]) => v === "no").map(([id]) => users.find(u => u.id === parseInt(id)));
  const pendingUsers = Object.entries(event.rsvps).filter(([, v]) => v === null).map(([id]) => users.find(u => u.id === parseInt(id)));

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
      </div>

      <Tag label={event.type} color={COLORS.accent} />
      <div style={{ fontSize: 26, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginTop: 8, marginBottom: 4, letterSpacing: -1 }}>{event.title}</div>
      <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 20 }}>{event.description}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "👤", label: "Host", val: host.name },
          { icon: "🕗", label: "Time", val: event.date },
          { icon: "📍", label: "Location", val: event.location },
          { icon: "✅", label: "Going", val: `${yesUsers.length} confirmed` },
        ].map(({ icon, label, val }) => (
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
            <Btn variant="success" onClick={() => onRsvp("yes")} style={{ flex: 1 }}>✓ I'm in!</Btn>
            <Btn variant="danger" onClick={() => onRsvp("no")} style={{ flex: 1 }}>✗ Can't make it</Btn>
          </div>
        </div>
      )}

      {!isHost && myRsvp === "yes" && (
        <div style={{ background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ color: COLORS.green, fontWeight: 600 }}>✓ You're going! See you there.</div>
          <button onClick={() => onRsvp(null)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 6 }}>Change mind?</button>
        </div>
      )}

      {!isHost && myRsvp === "no" && (
        <div style={{ background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ color: COLORS.red, fontWeight: 600 }}>✗ You're not going</div>
          <button onClick={() => onRsvp(null)} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 6 }}>Change mind?</button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        {[
          { label: "Going", users: yesUsers, color: COLORS.green },
          { label: "Not going", users: noUsers, color: COLORS.red },
          { label: "Pending", users: pendingUsers, color: COLORS.amber },
        ].map(({ label, users, color }) => users.length > 0 && (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 8 }}>{label.toUpperCase()} · {users.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {users.map(u => u && (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, background: color + "11", border: `1px solid ${color}33`, borderRadius: 20, padding: "5px 12px 5px 6px" }}>
                  <Avatar user={u} size={24} />
                  <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isHost && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="secondary" onClick={onViewLive} style={{ width: "100%" }}>
            📍 Live Locations ({yesUsers.length} on the way)
          </Btn>
          <Btn variant="danger" onClick={onEndEvent} style={{ width: "100%" }}>
            🏁 End Event
          </Btn>
        </div>
      )}
    </div>
  );
}

function LiveLocationScreen({ event, users, onBack }) {
  const host = users.find(u => u.id === event.host);
  const locs = event.liveLocations;

  const ETAColor = (eta) => {
    if (eta === "arrived") return COLORS.green;
    if (parseInt(eta) <= 5) return COLORS.amber;
    return COLORS.red;
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
        <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text }}>Live Locations</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}` }} />
          <span style={{ fontSize: 12, color: COLORS.green }}>Live</span>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: COLORS.subtle, height: 220, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 30% 40%, ${COLORS.accent}11 1px, transparent 1px), radial-gradient(circle at 70% 60%, ${COLORS.green}11 1px, transparent 1px)`, backgroundSize: "30px 30px" }} />
          <div style={{ position: "relative", width: 280, height: 180 }}>
            {Object.entries(locs).map(([uid, loc]) => {
              const u = users.find(x => x.id === parseInt(uid));
              if (!u) return null;
              const x = (loc.lng - 80.19) * 5000;
              const y = (12.995 - loc.lat) * 5000;
              return (
                <div key={uid} style={{ position: "absolute", left: `${50 + x}%`, top: `${50 + y}%`, transform: "translate(-50%, -50%)" }}>
                  <div style={{ position: "relative" }}>
                    {loc.eta !== "arrived" && (
                      <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", background: ETAColor(loc.eta), borderRadius: 10, padding: "2px 7px", fontSize: 10, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {loc.eta}
                      </div>
                    )}
                    <Avatar user={u} size={32} />
                    {loc.eta === "arrived" && <div style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: COLORS.green, border: `2px solid ${COLORS.card}` }} />}
                  </div>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: COLORS.accent, border: `3px solid #fff`, boxShadow: `0 0 12px ${COLORS.accent}` }} />
              <div style={{ fontSize: 10, color: COLORS.text, textAlign: "center", marginTop: 4, whiteSpace: "nowrap" }}>📍 {event.location}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(locs).map(([uid, loc]) => {
          const u = mockUsers.find(x => x.id === parseInt(uid));
          if (!u) return null;
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px" }}>
              <Avatar user={u} size={36} />
              <div style={{ marginLeft: 12, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{u.name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  {loc.eta === "arrived" ? "✓ At the venue" : `~${loc.eta} away`}
                </div>
              </div>
              <Tag label={loc.eta === "arrived" ? "Here" : loc.eta} color={ETAColor(loc.eta)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillSplitScreen({ event, users, onDone, onBack }) {
  const [hasBill, setHasBill] = useState(null);
  const [amount, setAmount] = useState("");
  const [split, setSplit] = useState(false);

  const attendees = Object.entries(event.rsvps).filter(([, v]) => v === "yes").map(([id]) => users.find(u => u.id === parseInt(id))).filter(Boolean);
  const perPerson = attendees.length > 0 ? (parseFloat(amount) / attendees.length) : 0;

  if (hasBill === null) {
    return (
      <div style={{ padding: "40px 20px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 24, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Event's a wrap!</div>
        <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 36 }}>Hope everyone had a great time.</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Was there a bill to split?</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn onClick={() => setHasBill(true)} style={{ padding: "14px 32px", fontSize: 16 }}>💰 Yes, split it</Btn>
          <Btn variant="ghost" onClick={() => { setHasBill(false); onDone(); }} style={{ padding: "14px 32px", fontSize: 16 }}>No bill</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Btn variant="ghost" onClick={() => setHasBill(null)} style={{ padding: "8px 14px", fontSize: 13 }}>←</Btn>
        <div style={{ fontSize: 18, fontFamily: FONTS.display, fontWeight: 700, color: COLORS.text }}>Bill Split</div>
      </div>

      {!split ? (
        <>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 8 }}>TOTAL BILL AMOUNT (₹)</div>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                fontSize: 36, fontWeight: 700, color: COLORS.text, fontFamily: FONTS.display, boxSizing: "border-box",
              }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>SPLITTING BETWEEN · {attendees.length} PEOPLE</div>
            {attendees.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                <Avatar user={u} size={32} />
                <span style={{ marginLeft: 10, fontSize: 14, color: COLORS.text, flex: 1 }}>{u.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: amount ? COLORS.accentLight : COLORS.muted }}>
                  {amount ? `₹${perPerson.toFixed(2)}` : "—"}
                </span>
              </div>
            ))}
          </div>

          {amount && (
            <div style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: COLORS.accentLight }}>
                Total ₹{parseFloat(amount).toFixed(2)} ÷ {attendees.length} people = <strong>₹{perPerson.toFixed(2)} each</strong>
              </div>
            </div>
          )}

          <Btn onClick={() => setSplit(true)} style={{ width: "100%" }} disabled={!amount}>
            Calculate Split
          </Btn>
        </>
      ) : (
        <>
          <div style={{ background: COLORS.greenDim, border: `1px solid ${COLORS.green}44`, borderRadius: 18, padding: "24px 20px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: COLORS.green, letterSpacing: 1, marginBottom: 8 }}>EACH PERSON PAYS</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.green, fontFamily: FONTS.display }}>₹{perPerson.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>Total bill: ₹{parseFloat(amount).toFixed(2)}</div>
          </div>

          {attendees.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <Avatar user={u} size={34} />
              <span style={{ marginLeft: 10, fontSize: 14, color: COLORS.text, flex: 1 }}>{u.name}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.green }}>₹{perPerson.toFixed(2)}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <Btn onClick={onDone} style={{ width: "100%" }}>✓ All done!</Btn>
          </div>
        </>
      )}
    </div>
  );
}

function RankingsScreen({ user, users }) {
  const rankings = buildRankings(users);
  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>Leaderboard</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>Who shows up the most 👀</div>

      {[
        { icon: "🥇", color: "#FFD700", rank: 1 },
        { icon: "🥈", color: "#C0C0C0", rank: 2 },
        { icon: "🥉", color: "#CD7F32", rank: 3 },
      ].slice(0, 1).map(() => null)}

      {rankings.map((r, i) => {
        const u = users.find(x => x.id === r.user);
        if (!u) return null;
        const pct = Math.round((r.attended / r.total) * 100);
        const medals = ["🥇", "🥈", "🥉"];
        const isMe = u.id === user.id;

        return (
          <div key={r.user} style={{
            background: isMe ? COLORS.accentDim : COLORS.card,
            border: `1px solid ${isMe ? COLORS.accent + "66" : COLORS.border}`,
            borderRadius: 16, padding: "14px 16px", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ fontSize: 22, width: 30, textAlign: "center" }}>
              {i < 3 ? medals[i] : <span style={{ fontSize: 14, color: COLORS.muted, fontWeight: 600 }}>{i + 1}</span>}
            </div>
            <Avatar user={u} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{u.name}</span>
                {isMe && <Tag label="you" color={COLORS.accent} />}
                {r.streak > 0 && <Tag label={`🔥 ${r.streak}`} color={COLORS.amber} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, background: COLORS.subtle, borderRadius: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : COLORS.accent, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{r.attended}/{r.total}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FONTS.display, color: i === 0 ? "#FFD700" : COLORS.text }}>{pct}%</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>attendance</div>
            </div>
          </div>
        );
      })}

      <div style={{ background: COLORS.subtle, borderRadius: 14, padding: "14px 16px", marginTop: 20 }}>
        <div style={{ fontSize: 12, color: COLORS.muted, textAlign: "center" }}>Based on last 15 events</div>
      </div>
    </div>
  );
}

function NavBar({ tab, setTab }) {
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "rankings", icon: "🏆", label: "Ranks" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: COLORS.card, borderTop: `1px solid ${COLORS.border}`,
      display: "flex", justifyContent: "space-around", padding: "10px 0 16px",
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: "4px 24px",
        }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontFamily: FONTS.body, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? COLORS.accentLight : COLORS.muted }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(initUsers);
  const [groups, setGroups] = useState(initGroups);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("home");
  const [events, setEvents] = useState(mockEvents);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setLoggedIn(true);
  };

  const handleUpdateUsers = (updated) => { setUsers(updated); };

  const handleCreateGroup = (newGroup) => {
    const updated = [...groups, newGroup];
    setGroups(updated);
    saveGroups(updated);
    setCurrentGroup(newGroup);
    setEvents([]);
  };

  const handleJoinGroup = (groupId) => {
    const updated = groups.map(g =>
      g.id === groupId ? { ...g, members: [...g.members, currentUser.id] } : g
    );
    setGroups(updated);
    saveGroups(updated);
    const joined = updated.find(g => g.id === groupId);
    setCurrentGroup(joined);
    setEvents([]);
  };

  const handleSelectGroup = (group) => {
    setCurrentGroup(group);
    setEvents([]);
    setScreen("home");
    setTab("home");
  };

  const handleSwitchGroup = () => {
    setCurrentGroup(null);
    setScreen("home");
    setTab("home");
  };

  const handleCreateEvent = (ev) => {
    setEvents(e => [ev, ...e]);
    setScreen("home");
  };

  const handleRsvp = (val) => {
    setEvents(evs => evs.map(ev =>
      ev.id === selectedEvent.id
        ? { ...ev, rsvps: { ...ev.rsvps, [currentUser.id]: val } }
        : ev
    ));
    setSelectedEvent(ev => ({ ...ev, rsvps: { ...ev.rsvps, [currentUser.id]: val } }));
  };

  const handleEndEvent = () => {
    setScreen("billsplit");
  };

  const handleDone = () => {
    setEvents(evs => evs.map(ev =>
      ev.id === selectedEvent.id ? { ...ev, status: "ended" } : ev
    ));
    setSelectedEvent(null);
    setScreen("home");
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  if (!loggedIn) return <LoginScreen users={users} onLogin={handleLogin} onUpdateUsers={handleUpdateUsers} />;

  if (!currentGroup) return (
    <GroupSelectScreen
      user={currentUser}
      groups={groups}
      onSelectGroup={handleSelectGroup}
      onCreateGroup={handleCreateGroup}
      onJoinGroup={handleJoinGroup}
    />
  );

  const groupUsers = users.filter(u => currentGroup.members.includes(u.id));

  const renderScreen = () => {
    if (tab === "rankings") return <RankingsScreen user={currentUser} users={groupUsers} />;

    switch (screen) {
      case "create":
        return <CreateEventScreen user={currentUser} users={groupUsers} onCreate={handleCreateEvent} onBack={() => setScreen("home")} />;
      case "event":
        return selectedEvent ? (
          <EventScreen
            event={selectedEvent} user={currentUser} users={groupUsers}
            onRsvp={handleRsvp}
            onViewLive={() => setScreen("live")}
            onEndEvent={handleEndEvent}
            onBack={() => setScreen("home")}
          />
        ) : null;
      case "live":
        return selectedEvent ? <LiveLocationScreen event={selectedEvent} users={groupUsers} onBack={() => setScreen("event")} /> : null;
      case "billsplit":
        return selectedEvent ? <BillSplitScreen event={selectedEvent} users={groupUsers} onDone={handleDone} onBack={() => setScreen("event")} /> : null;
      default:
        return (
          <HomeScreen
            user={currentUser} users={groupUsers} events={events} group={currentGroup}
            onCreateEvent={() => setScreen("create")}
            onViewEvent={(ev) => { setSelectedEvent(ev); setScreen("event"); }}
            onSwitchGroup={handleSwitchGroup}
          />
        );
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: FONTS.body }}>
      <div style={{ paddingBottom: 80 }}>
        {renderScreen()}
      </div>
      {screen === "home" || tab === "rankings" ? <NavBar tab={tab} setTab={(t) => { setTab(t); setScreen("home"); }} /> : null}
    </div>
  );
}
