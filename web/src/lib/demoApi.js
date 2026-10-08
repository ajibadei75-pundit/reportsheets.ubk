// DEMO MODE ONLY. Used by the single-file preview build (VITE_DEMO=1) so the
// whole portal can be clicked through with sample data and no real backend.
// Nothing here is bundled into the production build.
const now = () => new Date().toISOString();
const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const byName = (a, b) => a.name.localeCompare(b.name);

const DB = {
  settings: { id: 1, school_name: "UMAR BN L KHATTOB CENTER", term: "First Term", session: "2025/2026", next_term_begins: "2026-01-12", time_school_opened: "62" },
  grading: [
    { id: "g1", min_score: 75, max_score: 100, grade: "A", remark: "Excellent" },
    { id: "g2", min_score: 60, max_score: 74.99, grade: "B", remark: "Very Good" },
    { id: "g3", min_score: 50, max_score: 59.99, grade: "C", remark: "Good" },
    { id: "g4", min_score: 40, max_score: 49.99, grade: "D", remark: "Fair" },
    { id: "g5", min_score: 0, max_score: 39.99, grade: "F", remark: "Fail" },
  ],
  classes: [
    { id: "c1", name: "Primary 3", section: "basic" },
    { id: "c2", name: "JSS 1", section: "secondary" },
  ],
  subjects: [
    { id: "b1", name: "Mathematics", section: "basic" },
    { id: "b2", name: "English Studies", section: "basic" },
    { id: "b3", name: "Phonics", section: "basic" },
    { id: "s1", name: "English Language", section: "secondary" },
    { id: "s2", name: "Mathematics", section: "secondary" },
    { id: "s3", name: "Basic Science", section: "secondary" },
  ],
  class_subjects: [
    { class_id: "c1", subject_id: "b1" }, { class_id: "c1", subject_id: "b2" }, { class_id: "c1", subject_id: "b3" },
    { class_id: "c2", subject_id: "s1" }, { class_id: "c2", subject_id: "s2" }, { class_id: "c2", subject_id: "s3" },
  ],
  profiles: [
    { id: "p-admin", username: "admin", full_name: "School Administrator", role: "admin", signature_url: null },
    { id: "p-ct1", username: "mrsadeola", full_name: "Mrs Adeola (Primary 3)", role: "class_teacher", signature_url: null },
    { id: "p-ct2", username: "mrbello", full_name: "Mr Bello (JSS 1)", role: "class_teacher", signature_url: null },
    { id: "p-st1", username: "mrokafor", full_name: "Mr Okafor (English)", role: "subject_teacher", signature_url: null },
  ],
  class_teachers: [{ profile_id: "p-ct1", class_id: "c1" }, { profile_id: "p-ct2", class_id: "c2" }],
  subject_teachers: [{ profile_id: "p-st1", class_id: "c2", subject_id: "s1" }],
  students: [
    { id: "st1", class_id: "c1", name: "Aisha Bello", sex: "F", student_code: "UBK-AB3K7M", behaviour: {}, skills: {}, class_teacher_remark: "", max_attendance: "", time_present: "", weight: "", height: "" },
    { id: "st2", class_id: "c1", name: "Musa Ibrahim", sex: "M", student_code: "UBK-MI9P2X", behaviour: {}, skills: {}, class_teacher_remark: "", max_attendance: "", time_present: "", weight: "", height: "" },
    { id: "st3", class_id: "c2", name: "Ibrahim Yusuf", sex: "M", student_code: "UBK-IY4T8N", behaviour: {}, skills: {}, class_teacher_remark: "Good performance. Keep it up.", max_attendance: "", time_present: "60", weight: "", height: "" },
    { id: "st4", class_id: "c2", name: "Zainab Ali", sex: "F", student_code: "UBK-ZA6R5Q", behaviour: {}, skills: {}, class_teacher_remark: "A diligent student.", max_attendance: "", time_present: "58", weight: "", height: "" },
  ],
  scores: [],
  approvals: [{ class_id: "c2", status: "approved", submitted_at: now(), approved_at: now(), admin_note: null }],
};
const sc = (student_id, subject_id, first_ca, second_ca, exam) => DB.scores.push({ id: student_id + subject_id, student_id, subject_id, first_ca, second_ca, exam, remark: null, updated_at: now() });
sc("st1", "b1", 28, null, 52); sc("st2", "b1", 22, null, 41);
[["st3", "s1", 15, 14, 52], ["st3", "s2", 17, 12, 44], ["st3", "s3", 12, 16, 49], ["st4", "s1", 18, 17, 55], ["st4", "s2", 14, 15, 47], ["st4", "s3", 16, 13, 51]].forEach((r) => sc(...r));
DB.students.find((s) => s.id === "st3").skills = { "Hand Writing": "A", Fluency: "B", Games: "A" };
DB.students.find((s) => s.id === "st3").behaviour = { Punctuality: "A", Neatness: "B", Politeness: "A" };

let seq = 100;
const err = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status }, extra);
const profileOf = (token) => DB.profiles.find((p) => "demo:" + p.id === token);
const need = (token, roles) => {
  const p = profileOf(token);
  if (!p) throw err("Not signed in.", 401);
  if (!roles.includes(p.role)) throw err("Not allowed.", 403);
  return p;
};
const approvalOf = (classId) => DB.approvals.find((a) => a.class_id === classId);
const classSection = (classId) => DB.classes.find((c) => c.id === classId)?.section;
const ownsClass = (p, classId) => DB.class_teachers.some((x) => x.profile_id === p.id && x.class_id === classId);
const gradeOf = (t) => {
  if (t == null) return { grade: "", remark: "" };
  const r = DB.grading.find((g) => t >= g.min_score && t <= g.max_score);
  return r ? { grade: r.grade, remark: r.remark } : { grade: "", remark: "" };
};

function rankOf(list) {
  const sorted = [...list].sort((a, b) => b.total - a.total);
  const map = {}; let rank = 0, prev = null, seen = 0;
  for (const r of sorted) { seen++; if (r.total !== prev) { rank = seen; prev = r.total; } map[r.id] = rank; }
  return map;
}

function computeClassReports(classId) {
  const cls = DB.classes.find((c) => c.id === classId);
  if (!cls) throw err("Class not found.", 404);
  const students = DB.students.filter((s) => s.class_id === classId).sort(byName);
  const subjIds = DB.class_subjects.filter((x) => x.class_id === classId).map((x) => x.subject_id);
  const subjects = DB.subjects.filter((s) => subjIds.includes(s.id)).sort(byName);
  const scores = DB.scores.filter((x) => students.some((s) => s.id === x.student_id));
  const totalOf = (x) => (x.first_ca == null && x.second_ca == null && x.exam == null) ? null : (Number(x.first_ca) || 0) + (Number(x.second_ca) || 0) + (Number(x.exam) || 0);
  const ranks = {}, stats = {};
  for (const sub of subjects) {
    const list = scores.filter((x) => x.subject_id === sub.id && totalOf(x) !== null).map((x) => ({ id: x.student_id, total: totalOf(x) }));
    ranks[sub.id] = rankOf(list);
    stats[sub.id] = list.length ? { max: Math.max(...list.map((l) => l.total)), min: Math.min(...list.map((l) => l.total)) } : { max: null, min: null };
  }
  const reports = students.map((student) => {
    const rows = subjects.map((sub) => {
      const s = scores.find((x) => x.student_id === student.id && x.subject_id === sub.id);
      const total = s ? totalOf(s) : null;
      const { grade, remark } = gradeOf(total);
      const pos = total !== null ? ranks[sub.id][student.id] : null;
      return {
        subject_id: sub.id, subject_name: sub.name, first_ca: s?.first_ca ?? null, second_ca: s?.second_ca ?? null, exam: s?.exam ?? null,
        total, grade, remark: s?.remark || remark, position: pos ? ord(pos) : "", class_max: stats[sub.id].max, class_min: stats[sub.id].min,
        tutor_sign: "", updated_at: s?.updated_at || null,
      };
    });
    const totalObtained = rows.reduce((a, r) => a + (r.total || 0), 0);
    const totalObtainable = subjects.length * 100;
    return {
      student: { ...student }, rows, totalObtained, totalObtainable,
      overallGrade: rows.some((r) => r.total !== null) && totalObtainable ? gradeOf((totalObtained / totalObtainable) * 100).grade : "",
      percentage: totalObtainable ? ((totalObtained / totalObtainable) * 100).toFixed(1) : "0.0",
    };
  });
  const overall = rankOf(reports.map((r) => ({ id: r.student.id, total: r.totalObtained })));
  reports.forEach((r) => { r.overallPosition = ord(overall[r.student.id]); r.noInClass = students.length; });
  const ct = DB.class_teachers.find((x) => x.class_id === classId);
  const tp = ct ? DB.profiles.find((p) => p.id === ct.profile_id) : null;
  return {
    class: cls, settings: DB.settings, subjects, reports,
    classTeacherProfile: tp ? { full_name: tp.full_name, signature_url: tp.signature_url } : null,
    approval: approvalOf(classId) || null,
  };
}

const handlers = {
  login: ({ username }) => {
    const p = DB.profiles.find((x) => x.username === (username || "").trim().toLowerCase());
    if (!p) throw err("Invalid username or password.", 401);
    return { token: "demo:" + p.id, profile: { ...p, must_change_password: false } };
  },
  me: ({ token }) => {
    const p = profileOf(token);
    if (!p) throw err("Not signed in.", 401);
    const out = { profile: { ...p, must_change_password: false } };
    if (p.role === "class_teacher") out.classes = DB.class_teachers.filter((x) => x.profile_id === p.id).map((x) => DB.classes.find((c) => c.id === x.class_id));
    if (p.role === "subject_teacher") out.assignments = DB.subject_teachers.filter((x) => x.profile_id === p.id).map((x) => ({ class: DB.classes.find((c) => c.id === x.class_id), subject: DB.subjects.find((s) => s.id === x.subject_id) }));
    return out;
  },
  logout: () => ({ ok: true }),
  change_password: () => ({ ok: true }),

  admin_overview: ({ token }) => {
    need(token, ["admin"]);
    const classes = DB.classes.map((c) => {
      const studs = DB.students.filter((s) => s.class_id === c.id);
      const subjects = DB.class_subjects.filter((x) => x.class_id === c.id).length;
      const filled = DB.scores.filter((x) => studs.some((s) => s.id === x.student_id) && x.exam != null).length;
      const ct = DB.class_teachers.find((x) => x.class_id === c.id);
      const tp = ct && DB.profiles.find((p) => p.id === ct.profile_id);
      const ap = approvalOf(c.id);
      return { ...c, students: studs.length, subjects, expected: studs.length * subjects, filled, class_teacher: tp?.full_name || null, has_signature: !!tp?.signature_url, status: ap?.status || "draft", admin_note: ap?.admin_note || null };
    });
    return { settings: DB.settings, subject_count: DB.subjects.length, teacher_count: DB.profiles.filter((p) => p.role !== "admin").length, classes };
  },
  list_classes: ({ token }) => { need(token, ["admin", "class_teacher", "subject_teacher"]); return { classes: [...DB.classes] }; },
  create_class: ({ token, name, section }) => { need(token, ["admin"]); const c = { id: "c" + ++seq, name, section }; DB.classes.push(c); return { class: c }; },
  update_class: ({ token, id, name, section }) => { need(token, ["admin"]); const c = DB.classes.find((x) => x.id === id); Object.assign(c, { name, section }); return { class: c }; },
  delete_class: ({ token, id }) => { need(token, ["admin"]); DB.classes = DB.classes.filter((c) => c.id !== id); return { ok: true }; },

  list_subjects: ({ token }) => { need(token, ["admin", "class_teacher", "subject_teacher"]); return { subjects: [...DB.subjects] }; },
  create_subject: ({ token, name, section }) => {
    need(token, ["admin"]);
    if (!["basic", "secondary"].includes(section)) throw err("Choose which section this subject belongs to.");
    const s = { id: "x" + ++seq, name, section }; DB.subjects.push(s); return { subject: s };
  },
  delete_subject: ({ token, id }) => { need(token, ["admin"]); DB.subjects = DB.subjects.filter((s) => s.id !== id); return { ok: true }; },
  get_class_subjects: ({ token, class_id }) => { need(token, ["admin", "class_teacher", "subject_teacher"]); return { subject_ids: DB.class_subjects.filter((x) => x.class_id === class_id).map((x) => x.subject_id) }; },
  set_class_subjects: ({ token, class_id, subject_ids }) => {
    need(token, ["admin"]);
    const section = classSection(class_id);
    const bad = DB.subjects.find((s) => subject_ids.includes(s.id) && s.section !== section);
    if (bad) throw err(`Cannot add a ${bad.section} subject to a ${section} class.`);
    DB.class_subjects = DB.class_subjects.filter((x) => x.class_id !== class_id).concat(subject_ids.map((id) => ({ class_id, subject_id: id })));
    return { ok: true };
  },

  list_teachers: ({ token }) => {
    need(token, ["admin"]);
    return { teachers: DB.profiles.filter((p) => p.role !== "admin").map((p) => ({
      ...p,
      classes: DB.class_teachers.filter((x) => x.profile_id === p.id).map((x) => DB.classes.find((c) => c.id === x.class_id)),
      assignments: DB.subject_teachers.filter((x) => x.profile_id === p.id).map((x) => ({ class: DB.classes.find((c) => c.id === x.class_id), subject: DB.subjects.find((s) => s.id === x.subject_id) })),
    })) };
  },
  create_teacher: ({ token, username, full_name, role, class_id, assignments }) => {
    need(token, ["admin"]);
    const uname = (username || "").trim().toLowerCase();
    if (DB.profiles.some((p) => p.username === uname)) throw err("That username is already taken.");
    for (const a of assignments || []) {
      const c = DB.classes.find((x) => x.id === a.class_id), s = DB.subjects.find((x) => x.id === a.subject_id);
      if (c && s && c.section !== s.section) throw err(`${s.name} (${s.section}) cannot be taught in ${c.name} (${c.section}).`);
    }
    const p = { id: "p" + ++seq, username: uname, full_name, role, signature_url: null };
    DB.profiles.push(p);
    if (role === "class_teacher" && class_id) DB.class_teachers.push({ profile_id: p.id, class_id });
    if (role === "subject_teacher") (assignments || []).forEach((a) => DB.subject_teachers.push({ profile_id: p.id, ...a }));
    return { profile: p };
  },
  reset_teacher_password: () => ({ ok: true }),
  delete_teacher: ({ token, id }) => { need(token, ["admin"]); DB.profiles = DB.profiles.filter((p) => p.id !== id); return { ok: true }; },

  list_students: ({ token, class_id }) => {
    const p = need(token, ["admin", "class_teacher", "subject_teacher"]);
    if (p.role === "class_teacher" && !ownsClass(p, class_id)) throw err("Not your class.", 403);
    return { students: DB.students.filter((s) => s.class_id === class_id).sort(byName) };
  },
  create_student: ({ token, class_id, name, sex }) => {
    const p = need(token, ["admin", "class_teacher"]);
    if (p.role === "class_teacher" && !ownsClass(p, class_id)) throw err("Not your class.", 403);
    const code = "UBK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const s = { id: "st" + ++seq, class_id, name, sex: sex || null, student_code: code, behaviour: {}, skills: {}, class_teacher_remark: "", max_attendance: "", time_present: "", weight: "", height: "" };
    DB.students.push(s); return { student: s };
  },
  bulk_create_students: (a) => { const out = (a.students || []).map((s) => handlers.create_student({ ...a, ...s }).student); return { students: out }; },
  update_student: ({ token, id, fields }) => {
    const p = need(token, ["admin", "class_teacher"]);
    const s = DB.students.find((x) => x.id === id);
    if (!s) throw err("Student not found.", 404);
    if (p.role === "class_teacher") {
      if (!ownsClass(p, s.class_id)) throw err("Not your class.", 403);
      if (approvalOf(s.class_id)?.status === "approved") throw err("This class has already been approved for printing, so it's locked. Ask the admin to reopen it if a correction is needed.", 423);
    }
    ["name", "sex", "admission_no", "time_present", "skills", "behaviour", "class_teacher_remark", "weight", "height", "max_attendance"].forEach((k) => { if (k in (fields || {})) s[k] = fields[k]; });
    return { student: s };
  },
  delete_student: ({ token, id }) => { need(token, ["admin", "class_teacher"]); DB.students = DB.students.filter((s) => s.id !== id); return { ok: true }; },

  save_score: ({ token, student_id, subject_id, first_ca, second_ca, exam, remark, expected_updated_at }) => {
    const p = need(token, ["admin", "class_teacher", "subject_teacher"]);
    const st = DB.students.find((x) => x.id === student_id);
    if (!st) throw err("Student not found.", 404);
    const section = classSection(st.class_id);
    if (p.role === "subject_teacher") {
      if (!DB.subject_teachers.some((x) => x.profile_id === p.id && x.class_id === st.class_id && x.subject_id === subject_id)) throw err("Not your subject/class.", 403);
      if (section !== "secondary") throw err("Subject teachers only enter scores for secondary classes.", 403);
    }
    if (p.role === "class_teacher") {
      if (!ownsClass(p, st.class_id)) throw err("Not your class.", 403);
      if (section !== "basic") throw err("As class teacher you can only enter scores for a Basic/Nursery/KG class. Secondary subject scores are entered by the subject teacher.", 403);
    }
    const sub = DB.subjects.find((x) => x.id === subject_id);
    if (!sub) throw err("Subject not found.", 404);
    if (sub.section !== section) throw err(`${sub.name} is a ${sub.section}-section subject and cannot be scored for this student.`, 409);
    if (p.role !== "admin" && approvalOf(st.class_id)?.status === "approved") throw err("This class has already been approved for printing, so scores are locked. Ask the admin to reopen it if a correction is needed.", 423);
    let row = DB.scores.find((x) => x.student_id === student_id && x.subject_id === subject_id);
    if (row && expected_updated_at && new Date(row.updated_at).getTime() !== new Date(expected_updated_at).getTime()) {
      throw err("This score was updated by someone else. Their value is shown.", 409, { conflict: true, current: { ...row } });
    }
    if (!row) { row = { id: student_id + subject_id, student_id, subject_id }; DB.scores.push(row); }
    Object.assign(row, { first_ca, second_ca, exam, remark, updated_at: new Date(Date.now() + DB.scores.length).toISOString() });
    return { score: { ...row } };
  },
  get_subject_roster: ({ token, class_id, subject_id }) => {
    const p = need(token, ["admin", "subject_teacher"]);
    if (p.role === "subject_teacher" && !DB.subject_teachers.some((x) => x.profile_id === p.id && x.class_id === class_id && x.subject_id === subject_id)) throw err("Not your subject/class.", 403);
    const students = DB.students.filter((s) => s.class_id === class_id).sort(byName);
    return { students, scores: DB.scores.filter((x) => x.subject_id === subject_id && students.some((s) => s.id === x.student_id)), approval: approvalOf(class_id) || null };
  },
  get_class_roster: ({ token, class_id }) => {
    const p = need(token, ["admin", "class_teacher"]);
    if (p.role === "class_teacher" && !ownsClass(p, class_id)) throw err("Not your class.", 403);
    return computeClassReports(class_id);
  },
  get_class_report_data: (a) => handlers.get_class_roster(a),
  upload_signature: ({ token, dataUrl }) => {
    const p = need(token, ["admin", "class_teacher"]);
    if (!/^data:image\//.test(dataUrl || "")) throw err("Invalid image.");
    p.signature_url = dataUrl; return { signature_url: dataUrl };
  },
  submit_for_printing: ({ token, class_id }) => {
    const p = need(token, ["admin", "class_teacher"]);
    if (p.role === "class_teacher" && !ownsClass(p, class_id)) throw err("Not your class.", 403);
    const ap = approvalOf(class_id);
    if (ap) Object.assign(ap, { status: "submitted", submitted_at: now() }); else DB.approvals.push({ class_id, status: "submitted", submitted_at: now(), admin_note: null });
    return { ok: true };
  },

  get_settings: ({ token }) => { need(token, ["admin", "class_teacher", "subject_teacher"]); return { settings: DB.settings }; },
  update_settings: ({ token, fields }) => { need(token, ["admin"]); Object.assign(DB.settings, fields); return { settings: DB.settings }; },
  get_grading_scale: ({ token }) => { need(token, ["admin", "class_teacher", "subject_teacher"]); return { grading_scale: [...DB.grading].sort((a, b) => b.min_score - a.min_score) }; },
  update_grading_scale: ({ token, rows }) => { need(token, ["admin"]); DB.grading = rows.map((r, i) => ({ id: "g" + i + seq++, ...r })); return { ok: true }; },
  list_print_approvals: ({ token }) => { need(token, ["admin"]); return { approvals: DB.approvals.map((a) => ({ ...a, classes: DB.classes.find((c) => c.id === a.class_id) })) }; },
  set_approval_status: ({ token, class_id, status, admin_note }) => {
    need(token, ["admin"]);
    if (!["draft", "submitted", "approved", "rejected"].includes(status)) throw err("Invalid status.");
    const patch = { status, admin_note: admin_note || null };
    if (status === "approved") patch.approved_at = now();
    if (status === "draft") { patch.approved_at = null; patch.submitted_at = null; }
    const ap = approvalOf(class_id);
    if (ap) Object.assign(ap, patch); else DB.approvals.push({ class_id, ...patch });
    return { ok: true };
  },

  parent_lookup: ({ student_code, name, class_name }) => {
    const code = (student_code || "").trim().toUpperCase(), nm = (name || "").trim().toLowerCase(), cn = (class_name || "").trim().toLowerCase();
    if (!code || !nm || !cn) throw err("Please fill in the student's ID, full name and class.");
    const generic = () => err("No result found for those details. Please check the student ID, name and class with the school.", 404);
    const st = DB.students.find((s) => s.student_code === code);
    if (!st || st.name.trim().toLowerCase() !== nm) throw generic();
    const cls = DB.classes.find((c) => c.id === st.class_id);
    if (cls.name.trim().toLowerCase() !== cn) throw generic();
    if (approvalOf(cls.id)?.status !== "approved") throw err("This result has not yet been approved for release. Please check back later or contact the school.", 403);
    const full = computeClassReports(cls.id);
    return { class: full.class, settings: full.settings, report: full.reports.find((r) => r.student.id === st.id), classTeacherProfile: full.classTeacherProfile };
  },
};

export async function demoCall(action, payload) {
  await new Promise((r) => setTimeout(r, 60));
  const fn = handlers[action];
  if (!fn) throw err("Unknown action: " + action, 404);
  return JSON.parse(JSON.stringify(fn(payload)));
}
