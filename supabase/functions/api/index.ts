// Umar Bn L Khattob Center - Result Portal API
// Single-router edge function. Every request: POST { action, token?, ...payload }
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

// ---------- session / auth helpers ----------
async function getProfile(token: string | undefined) {
  if (!token) return null;
  const { data: session } = await sb
    .from("sessions")
    .select("profile_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.profile_id)
    .maybeSingle();
  return profile ?? null;
}

async function requireRole(token: string | undefined, roles: string[]) {
  const profile = await getProfile(token);
  if (!profile) throw { status: 401, message: "Not signed in." };
  if (!roles.includes(profile.role)) throw { status: 403, message: "Not allowed." };
  return profile;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------- report computation ----------
async function computeClassReports(class_id: string) {
  const { data: cls } = await sb.from("classes").select("*").eq("id", class_id).maybeSingle();
  if (!cls) throw { status: 404, message: "Class not found." };
  const { data: settings } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  const { data: students } = await sb
    .from("students")
    .select("*")
    .eq("class_id", class_id)
    .order("name");
  const { data: classSubjectRows } = await sb
    .from("class_subjects")
    .select("subject_id, subjects(id, name)")
    .eq("class_id", class_id);
  const subjects = (classSubjectRows || [])
    .map((r: any) => r.subjects)
    .filter(Boolean)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const studentIds = (students || []).map((s: any) => s.id);
  let scores: any[] = [];
  if (studentIds.length) {
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from("scores").select("*").in("student_id", studentIds).order("id").range(from, from + 999);
      scores = scores.concat(data || []);
      if (!data || data.length < 1000) break;
    }
  }
  const grading = (await sb.from("grading_scale").select("*")).data || [];
  const gradeOf = (total: number | null) => {
    if (total === null || total === undefined) return { grade: "", remark: "" };
    const row = grading.find((g: any) => total >= g.min_score && total <= g.max_score);
    return row ? { grade: row.grade, remark: row.remark } : { grade: "", remark: "" };
  };

  // build per-subject totals across the class for ranking
  const bySubject: Record<string, { student_id: string; total: number }[]> = {};
  for (const sub of subjects) bySubject[sub.id] = [];
  for (const sc of scores) {
    const fc = Number(sc.first_ca) || 0;
    const sc2 = Number(sc.second_ca) || 0;
    const ex = Number(sc.exam) || 0;
    const hasAny = sc.first_ca !== null || sc.second_ca !== null || sc.exam !== null;
    if (!hasAny) continue;
    const total = fc + sc2 + ex;
    if (!bySubject[sc.subject_id]) bySubject[sc.subject_id] = [];
    bySubject[sc.subject_id].push({ student_id: sc.student_id, total });
  }
  const rankMaps: Record<string, Record<string, number>> = {};
  for (const subId of Object.keys(bySubject)) {
    const sorted = [...bySubject[subId]].sort((a, b) => b.total - a.total);
    const map: Record<string, number> = {};
    let rank = 0, prevTotal: number | null = null, seen = 0;
    for (const row of sorted) {
      seen++;
      if (row.total !== prevTotal) { rank = seen; prevTotal = row.total; }
      map[row.student_id] = rank;
    }
    rankMaps[subId] = map;
  }

  const classStats: Record<string, { max: number | null; min: number | null }> = {};
  for (const subId of Object.keys(bySubject)) {
    const t = bySubject[subId].map((x) => x.total);
    classStats[subId] = t.length ? { max: Math.max(...t), min: Math.min(...t) } : { max: null, min: null };
  }

  // overall class-wide ranking by total obtained (for class summary / class teacher view)
  const overallTotals: { student_id: string; total: number }[] = [];

  const reports = (students || []).map((student: any) => {
    const rows = subjects.map((sub: any) => {
      const sc = scores.find((x: any) => x.student_id === student.id && x.subject_id === sub.id);
      const first_ca = sc?.first_ca ?? null;
      const second_ca = sc?.second_ca ?? null;
      const exam = sc?.exam ?? null;
      const hasAny = first_ca !== null || second_ca !== null || exam !== null;
      const total = hasAny ? (Number(first_ca) || 0) + (Number(second_ca) || 0) + (Number(exam) || 0) : null;
      const { grade, remark } = gradeOf(total);
      const position = total !== null ? rankMaps[sub.id]?.[student.id] : null;
      return {
        subject_id: sub.id,
        subject_name: sub.name,
        first_ca, second_ca, exam, total,
        grade, remark: sc?.remark || remark,
        position: position ? ordinal(position) : "",
        class_max: classStats[sub.id]?.max ?? null,
        class_min: classStats[sub.id]?.min ?? null,
        tutor_sign: sc?.tutor_sign || "",
        updated_at: sc?.updated_at || null,
      };
    });
    const totalObtained = rows.reduce((s: number, r: any) => s + (r.total || 0), 0);
    const totalObtainable = subjects.length * 100;
    overallTotals.push({ student_id: student.id, total: totalObtained });
    return {
      student, rows, totalObtained, totalObtainable,
      overallGrade: rows.some((r: any) => r.total !== null) && totalObtainable ? gradeOf((totalObtained / totalObtainable) * 100).grade : "",
      percentage: totalObtainable ? ((totalObtained / totalObtainable) * 100).toFixed(1) : "0.0",
    };
  });

  // overall position among class
  const sortedOverall = [...overallTotals].sort((a, b) => b.total - a.total);
  const overallRank: Record<string, number> = {};
  { let rank = 0, prevTotal: number | null = null, seen = 0;
    for (const row of sortedOverall) {
      seen++;
      if (row.total !== prevTotal) { rank = seen; prevTotal = row.total; }
      overallRank[row.student_id] = rank;
    }
  }
  for (const r of reports) {
    (r as any).overallPosition = ordinal(overallRank[r.student.id]);
    (r as any).noInClass = (students || []).length;
  }

  let classTeacherProfile = null;
  const { data: ct } = await sb
    .from("class_teachers")
    .select("profile_id, profiles(full_name, signature_url)")
    .eq("class_id", class_id)
    .maybeSingle();
  if (ct) classTeacherProfile = ct.profiles;

  const { data: approval } = await sb.from("print_approvals").select("*").eq("class_id", class_id).maybeSingle();
  return { class: cls, settings, subjects, reports, classTeacherProfile, approval };
}

// A subject teacher's class+subject pairs must each be in the SAME section
// as each other, and each pair's class/subject must match one another.
async function findSectionMismatch(assignments: { class_id: string; subject_id: string }[]) {
  for (const a of assignments) {
    const { data: cls } = await sb.from("classes").select("section,name").eq("id", a.class_id).maybeSingle();
    const { data: sub } = await sb.from("subjects").select("section,name").eq("id", a.subject_id).maybeSingle();
    if (!cls || !sub) return "Class or subject not found.";
    if (cls.section !== sub.section) return `${sub.name} (${sub.section}) cannot be taught in ${cls.name} (${cls.section}).`;
  }
  return null;
}

// ---------- main handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);

  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON body"); }
  const { action, token } = body;

  try {
    switch (action) {
      // ---------------- AUTH ----------------
      case "login": {
        const { username, password } = body;
        const { data: profile } = await sb
          .from("profiles")
          .select("*")
          .eq("username", (username || "").trim().toLowerCase())
          .maybeSingle();
        if (!profile || !profile.password_hash) return fail("Invalid username or password.", 401);
        const ok = await bcrypt.compare(password || "", profile.password_hash);
        if (!ok) return fail("Invalid username or password.", 401);
        const { data: session } = await sb
          .from("sessions")
          .insert({ profile_id: profile.id })
          .select()
          .single();
        delete profile.password_hash;
        return json({ token: session.token, profile });
      }
      case "me": {
        const profile = await getProfile(token);
        if (!profile) return fail("Not signed in.", 401);
        delete profile.password_hash;
        let extra: any = {};
        if (profile.role === "class_teacher") {
          const { data } = await sb.from("class_teachers").select("class_id, classes(id,name,section)").eq("profile_id", profile.id);
          extra.classes = (data || []).map((d: any) => d.classes);
        } else if (profile.role === "subject_teacher") {
          const { data } = await sb.from("subject_teachers").select("class_id, subject_id, classes(id,name,section), subjects(id,name)").eq("profile_id", profile.id);
          extra.assignments = (data || []).map((d: any) => ({ class: d.classes, subject: d.subjects }));
        }
        return json({ profile, ...extra });
      }
      case "logout": {
        if (token) await sb.from("sessions").delete().eq("token", token);
        return json({ ok: true });
      }
      case "change_password": {
        const profile = await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { old_password, new_password } = body;
        const { data: full } = await sb.from("profiles").select("password_hash").eq("id", profile.id).single();
        const ok = await bcrypt.compare(old_password || "", full.password_hash || "");
        if (!ok) return fail("Current password is incorrect.");
        const hash = await bcrypt.hash(new_password, 10);
        await sb.from("profiles").update({ password_hash: hash, must_change_password: false }).eq("id", profile.id);
        return json({ ok: true });
      }

      // ---------------- ADMIN: OVERVIEW ----------------
      case "admin_overview": {
        await requireRole(token, ["admin"]);
        const { data: classes } = await sb.from("classes").select("*").order("section").order("name");
        const { data: settings } = await sb.from("settings").select("*").eq("id", 1).single();
        const { count: subjectCount } = await sb.from("subjects").select("id", { count: "exact", head: true });
        const { count: teacherCount } = await sb.from("profiles").select("id", { count: "exact", head: true }).neq("role", "admin");
        const { data: ctRows } = await sb.from("class_teachers").select("class_id, profiles(full_name, signature_url)");
        const { data: approvals } = await sb.from("print_approvals").select("*");
        const rows: any[] = [];
        for (const c of classes || []) {
          const { data: studs } = await sb.from("students").select("id").eq("class_id", c.id);
          const ids = (studs || []).map((x: any) => x.id);
          const { count: subjects } = await sb.from("class_subjects").select("subject_id", { count: "exact", head: true }).eq("class_id", c.id);
          let filled = 0;
          if (ids.length) {
            const { count } = await sb.from("scores").select("id", { count: "exact", head: true }).in("student_id", ids).not("exam", "is", null);
            filled = count || 0;
          }
          const ct = (ctRows || []).find((x: any) => x.class_id === c.id);
          const ap = (approvals || []).find((x: any) => x.class_id === c.id);
          rows.push({
            ...c, students: ids.length, subjects: subjects || 0, expected: ids.length * (subjects || 0), filled,
            class_teacher: ct?.profiles?.full_name || null, has_signature: !!ct?.profiles?.signature_url,
            status: ap?.status || "draft", admin_note: ap?.admin_note || null,
          });
        }
        return json({ settings, subject_count: subjectCount || 0, teacher_count: teacherCount || 0, classes: rows });
      }

      // ---------------- ADMIN: CLASSES ----------------
      case "list_classes": {
        await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { data } = await sb.from("classes").select("*").order("section").order("name");
        return json({ classes: data });
      }
      case "create_class": {
        await requireRole(token, ["admin"]);
        const { data, error } = await sb.from("classes").insert({ name: body.name, section: body.section }).select().single();
        if (error) return fail(error.message);
        return json({ class: data });
      }
      case "update_class": {
        await requireRole(token, ["admin"]);
        const { data: current } = await sb.from("classes").select("section").eq("id", body.id).single();
        if (current && body.section && body.section !== current.section) {
          const { count: studCount } = await sb.from("students").select("id", { count: "exact", head: true }).eq("class_id", body.id);
          const { count: subjCount } = await sb.from("class_subjects").select("subject_id", { count: "exact", head: true }).eq("class_id", body.id);
          if ((studCount || 0) > 0 || (subjCount || 0) > 0) {
            return fail("This class already has students or subjects, so its section can't be changed. Move or remove them first, or create a new class instead.");
          }
        }
        const { data, error } = await sb.from("classes").update({ name: body.name, section: body.section }).eq("id", body.id).select().single();
        if (error) return fail(error.message);
        return json({ class: data });
      }
      case "delete_class": {
        await requireRole(token, ["admin"]);
        await sb.from("classes").delete().eq("id", body.id);
        return json({ ok: true });
      }

      // ---------------- ADMIN: SUBJECTS ----------------
      case "list_subjects": {
        await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { data } = await sb.from("subjects").select("*").order("name");
        return json({ subjects: data });
      }
      case "create_subject": {
        await requireRole(token, ["admin"]);
        if (!["basic", "secondary"].includes(body.section)) return fail("Choose which section this subject belongs to.");
        const { data, error } = await sb.from("subjects").insert({ name: body.name, section: body.section }).select().single();
        if (error) return fail(error.message);
        return json({ subject: data });
      }
      case "delete_subject": {
        await requireRole(token, ["admin"]);
        await sb.from("subjects").delete().eq("id", body.id);
        return json({ ok: true });
      }
      case "get_class_subjects": {
        await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { data } = await sb.from("class_subjects").select("subject_id").eq("class_id", body.class_id);
        return json({ subject_ids: (data || []).map((d: any) => d.subject_id) });
      }
      case "set_class_subjects": {
        await requireRole(token, ["admin"]);
        const { data: cls } = await sb.from("classes").select("section").eq("id", body.class_id).single();
        const { data: subs } = await sb.from("subjects").select("id,section").in("id", body.subject_ids || []);
        const mismatch = (subs || []).find((s: any) => s.section !== cls?.section);
        if (mismatch) return fail(`Cannot add a ${mismatch.section} subject to a ${cls?.section} class.`);
        await sb.from("class_subjects").delete().eq("class_id", body.class_id);
        const rows = (body.subject_ids || []).map((id: string) => ({ class_id: body.class_id, subject_id: id }));
        if (rows.length) { const { error } = await sb.from("class_subjects").insert(rows); if (error) return fail(error.message); }
        return json({ ok: true });
      }

      // ---------------- ADMIN: TEACHERS ----------------
      case "list_teachers": {
        await requireRole(token, ["admin"]);
        const { data: profiles } = await sb.from("profiles").select("id, username, full_name, role, created_at").neq("role", "admin").order("full_name");
        const { data: ctRows } = await sb.from("class_teachers").select("profile_id, classes(id,name,section)");
        const { data: stRows } = await sb.from("subject_teachers").select("profile_id, classes(id,name), subjects(id,name)");
        const teachers = (profiles || []).map((p: any) => ({
          ...p,
          classes: (ctRows || []).filter((c: any) => c.profile_id === p.id).map((c: any) => c.classes),
          assignments: (stRows || []).filter((s: any) => s.profile_id === p.id).map((s: any) => ({ class: s.classes, subject: s.subjects })),
        }));
        return json({ teachers });
      }
      case "create_teacher": {
        await requireRole(token, ["admin"]);
        const { username, full_name, password, role } = body;
        if (!["class_teacher", "subject_teacher"].includes(role)) return fail("Invalid role.");
        const hash = await bcrypt.hash(password || "changeme123", 10);
        const { data: profile, error } = await sb
          .from("profiles")
          .insert({ username: (username || "").trim().toLowerCase(), full_name, role, password_hash: hash })
          .select()
          .single();
        if (error) return fail(error.message);
        if (role === "class_teacher" && body.class_id) {
          await sb.from("class_teachers").insert({ profile_id: profile.id, class_id: body.class_id });
        }
        if (role === "subject_teacher" && Array.isArray(body.assignments)) {
          const bad = await findSectionMismatch(body.assignments);
          if (bad) { await sb.from("profiles").delete().eq("id", profile.id); return fail(bad); }
          const rows = body.assignments.map((a: any) => ({ profile_id: profile.id, class_id: a.class_id, subject_id: a.subject_id }));
          if (rows.length) { const { error } = await sb.from("subject_teachers").insert(rows); if (error) { await sb.from("profiles").delete().eq("id", profile.id); return fail(error.message); } }
        }
        return json({ profile });
      }
      case "update_teacher_assignments": {
        await requireRole(token, ["admin"]);
        const { profile_id, role } = body;
        if (role === "class_teacher") {
          await sb.from("class_teachers").delete().eq("profile_id", profile_id);
          if (body.class_id) await sb.from("class_teachers").insert({ profile_id, class_id: body.class_id });
        } else if (role === "subject_teacher") {
          const bad = await findSectionMismatch(body.assignments || []);
          if (bad) return fail(bad);
          await sb.from("subject_teachers").delete().eq("profile_id", profile_id);
          const rows = (body.assignments || []).map((a: any) => ({ profile_id, class_id: a.class_id, subject_id: a.subject_id }));
          if (rows.length) { const { error } = await sb.from("subject_teachers").insert(rows); if (error) return fail(error.message); }
        }
        return json({ ok: true });
      }
      case "reset_teacher_password": {
        await requireRole(token, ["admin"]);
        const hash = await bcrypt.hash(body.new_password || "changeme123", 10);
        await sb.from("profiles").update({ password_hash: hash, must_change_password: true }).eq("id", body.profile_id);
        return json({ ok: true });
      }
      case "delete_teacher": {
        await requireRole(token, ["admin"]);
        await sb.from("profiles").delete().eq("id", body.id);
        return json({ ok: true });
      }

      // ---------------- STUDENTS ----------------
      case "list_students": {
        const profile = await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        if (profile.role === "subject_teacher") {
          const { data: ok } = await sb.from("subject_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const { data } = await sb.from("students").select("*").eq("class_id", body.class_id).order("name");
        return json({ students: data });
      }
      case "create_student": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const { data, error } = await sb.from("students").insert({
          class_id: body.class_id, name: body.name, sex: body.sex || null, admission_no: body.admission_no || null,
        }).select().single();
        if (error) return fail(error.message);
        return json({ student: data });
      }
      case "bulk_create_students": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const rows = (body.students || []).map((s: any) => ({ class_id: body.class_id, name: s.name, sex: s.sex || null }));
        if (!rows.length) return fail("No students given.");
        const { data, error } = await sb.from("students").insert(rows).select();
        if (error) return fail(error.message);
        return json({ students: data });
      }
      case "update_student": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: student } = await sb.from("students").select("class_id").eq("id", body.id).maybeSingle();
          if (!student) return fail("Student not found.", 404);
          const { data: ok } = await sb.from("class_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", student.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
          const { data: approval } = await sb.from("print_approvals").select("status").eq("class_id", student.class_id).maybeSingle();
          if (approval?.status === "approved") return fail("This class has already been approved for printing, so it's locked. Ask the admin to reopen it if a correction is needed.", 423);
        }
        const fields = body.fields || {};
        const allowed = ["name","sex","admission_no","no_in_class","time_present","skills","behaviour","class_teacher_remark","weight","height","max_attendance"];
        const patch: any = {};
        for (const k of allowed) if (k in fields) patch[k] = fields[k];
        const { data, error } = await sb.from("students").update(patch).eq("id", body.id).select().single();
        if (error) return fail(error.message);
        return json({ student: data });
      }
      case "delete_student": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: student } = await sb.from("students").select("class_id").eq("id", body.id).maybeSingle();
          if (!student) return fail("Student not found.", 404);
          const { data: ok } = await sb.from("class_teachers").select("class_id").eq("profile_id", profile.id).eq("class_id", student.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        await sb.from("students").delete().eq("id", body.id);
        return json({ ok: true });
      }

      // ---------------- SCORES ----------------
      case "save_score": {
        const profile = await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { student_id, subject_id, first_ca, second_ca, exam, remark, expected_updated_at } = body;
        const { data: student } = await sb.from("students").select("class_id, classes(section)").eq("id", student_id).maybeSingle();
        if (!student) return fail("Student not found.", 404);
        const studentSection = (student as any).classes?.section;
        if (profile.role === "subject_teacher") {
          const { data: ok } = await sb.from("subject_teachers").select("*").eq("profile_id", profile.id).eq("class_id", student.class_id).eq("subject_id", subject_id).maybeSingle();
          if (!ok) return fail("Not your subject/class.", 403);
          if (studentSection !== "secondary") return fail("Subject teachers only enter scores for secondary classes.", 403);
        }
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("*").eq("profile_id", profile.id).eq("class_id", student.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
          if (studentSection !== "basic") return fail("As class teacher you can only enter scores for a Basic/Nursery/KG class. Secondary subject scores are entered by the subject teacher.", 403);
        }
        const { data: subject } = await sb.from("subjects").select("section, name").eq("id", subject_id).maybeSingle();
        if (!subject) return fail("Subject not found.", 404);
        if (subject.section !== studentSection) return fail(`${subject.name} is a ${subject.section}-section subject and cannot be scored for this student.`, 409);

        if (profile.role !== "admin") {
          const { data: approval } = await sb.from("print_approvals").select("status").eq("class_id", student.class_id).maybeSingle();
          if (approval?.status === "approved") {
            return fail("This class has already been approved for printing, so scores are locked. Ask the admin to reopen it if a correction is needed.", 423);
          }
        }

        const { data: existing } = await sb.from("scores").select("*").eq("student_id", student_id).eq("subject_id", subject_id).maybeSingle();

        // --- conflict handling: if the client's copy is stale (someone else saved
        // a newer value for this exact score since it was loaded), refuse the
        // blind overwrite and hand back the current row so the UI can show it.
        if (existing && expected_updated_at && new Date(existing.updated_at).getTime() !== new Date(expected_updated_at).getTime()) {
          return json({
            conflict: true,
            message: `This score was updated by someone else at ${new Date(existing.updated_at).toLocaleTimeString()}. Their value is shown below — save again to overwrite it.`,
            current: existing,
          }, 409);
        }

        const patch = { first_ca, second_ca, exam, remark, updated_at: new Date().toISOString(), updated_by: profile.id };
        let result;
        if (existing) {
          result = await sb.from("scores").update(patch).eq("id", existing.id).select().single();
        } else {
          result = await sb.from("scores").insert({ student_id, subject_id, ...patch }).select().single();
        }
        if (result.error) return fail(result.error.message);
        return json({ score: result.data });
      }
      case "get_subject_roster": {
        const profile = await requireRole(token, ["admin", "subject_teacher"]);
        if (profile.role === "subject_teacher") {
          const { data: ok } = await sb.from("subject_teachers").select("*").eq("profile_id", profile.id).eq("class_id", body.class_id).eq("subject_id", body.subject_id).maybeSingle();
          if (!ok) return fail("Not your subject/class.", 403);
        }
        const { data: students } = await sb.from("students").select("id,name,sex,student_code").eq("class_id", body.class_id).order("name");
        const ids = (students || []).map((s: any) => s.id);
        const { data: scores } = ids.length ? await sb.from("scores").select("*").eq("subject_id", body.subject_id).in("student_id", ids) : { data: [] };
        const { data: approval } = await sb.from("print_approvals").select("status").eq("class_id", body.class_id).maybeSingle();
        return json({ students, scores, approval });
      }

      // ---------------- CLASS TEACHER ----------------
      case "get_class_roster": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("*").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const result = await computeClassReports(body.class_id);
        return json(result);
      }
      case "upload_signature": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        const { dataUrl } = body; // data:image/png;base64,....
        const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl || "");
        if (!match) return fail("Invalid image.");
        const ext = match[1].split("/")[1];
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        const path = `${profile.id}.${ext}`;
        const { error } = await sb.storage.from("signatures").upload(path, bytes, { contentType: match[1], upsert: true });
        if (error) return fail(error.message);
        const { data: pub } = sb.storage.from("signatures").getPublicUrl(path);
        await sb.from("profiles").update({ signature_url: pub.publicUrl }).eq("id", profile.id);
        return json({ signature_url: pub.publicUrl });
      }
      case "submit_for_printing": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("*").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const { data: existing } = await sb.from("print_approvals").select("*").eq("class_id", body.class_id).maybeSingle();
        const patch = { status: "submitted", submitted_at: new Date().toISOString() };
        if (existing) await sb.from("print_approvals").update(patch).eq("class_id", body.class_id);
        else await sb.from("print_approvals").insert({ class_id: body.class_id, ...patch });
        return json({ ok: true });
      }

      // ---------------- ADMIN: SETTINGS / GRADING / APPROVALS ----------------
      case "get_settings": {
        await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { data } = await sb.from("settings").select("*").eq("id", 1).single();
        return json({ settings: data });
      }
      case "update_settings": {
        await requireRole(token, ["admin"]);
        const { data, error } = await sb.from("settings").update(body.fields).eq("id", 1).select().single();
        if (error) return fail(error.message);
        return json({ settings: data });
      }
      case "get_grading_scale": {
        await requireRole(token, ["admin", "class_teacher", "subject_teacher"]);
        const { data } = await sb.from("grading_scale").select("*").order("min_score", { ascending: false });
        return json({ grading_scale: data });
      }
      case "update_grading_scale": {
        await requireRole(token, ["admin"]);
        await sb.from("grading_scale").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const rows = (body.rows || []).map((r: any) => ({ min_score: r.min_score, max_score: r.max_score, grade: r.grade, remark: r.remark }));
        if (rows.length) await sb.from("grading_scale").insert(rows);
        return json({ ok: true });
      }
      case "list_print_approvals": {
        await requireRole(token, ["admin"]);
        const { data } = await sb.from("print_approvals").select("*, classes(id,name,section)");
        return json({ approvals: data });
      }
      case "set_approval_status": {
        await requireRole(token, ["admin"]);
        if (!["draft", "submitted", "approved", "rejected"].includes(body.status)) return fail("Invalid status.");
        const patch: any = { status: body.status, admin_note: body.admin_note || null };
        if (body.status === "approved") patch.approved_at = new Date().toISOString();
        if (body.status === "draft") { patch.approved_at = null; patch.submitted_at = null; }
        const { data: existing } = await sb.from("print_approvals").select("*").eq("class_id", body.class_id).maybeSingle();
        if (existing) await sb.from("print_approvals").update(patch).eq("class_id", body.class_id);
        else await sb.from("print_approvals").insert({ class_id: body.class_id, ...patch });
        return json({ ok: true });
      }

      // ---------------- REPORTS ----------------
      case "get_class_report_data": {
        const profile = await requireRole(token, ["admin", "class_teacher"]);
        if (profile.role === "class_teacher") {
          const { data: ok } = await sb.from("class_teachers").select("*").eq("profile_id", profile.id).eq("class_id", body.class_id).maybeSingle();
          if (!ok) return fail("Not your class.", 403);
        }
        const result = await computeClassReports(body.class_id);
        return json(result);
      }

      // ---------------- PUBLIC: PARENT PORTAL ----------------
      // No login required. A parent must know all three of the student's
      // unique ID, full name and class before anything is revealed, and a
      // class's result is only visible once the admin has approved it for
      // printing -- so nobody can browse drafts or guess their way in.
      case "parent_lookup": {
        // Rate-limit by IP: max 15 attempts per 10 minutes, so a script can't
        // brute-force ID/name/class combinations even though codes are random.
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count: attemptCount } = await sb.from("parent_lookup_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
        if ((attemptCount || 0) >= 15) {
          return fail("Too many attempts. Please wait a few minutes and try again, or contact the school.", 429);
        }
        await sb.from("parent_lookup_attempts").insert({ ip });

        const student_code = (body.student_code || "").trim().toUpperCase();
        const name = (body.name || "").trim().toLowerCase();
        const className = (body.class_name || "").trim().toLowerCase();
        if (!student_code || !name || !className) return fail("Please fill in the student's ID, full name and class.");
        const { data: student } = await sb.from("students").select("*, classes(id,name,section)").eq("student_code", student_code).maybeSingle();
        const genericFail = () => fail("No result found for those details. Please check the student ID, name and class with the school.", 404);
        if (!student) return genericFail();
        if (String(student.name || "").trim().toLowerCase() !== name) return genericFail();
        if (String((student as any).classes?.name || "").trim().toLowerCase() !== className) return genericFail();
        const classId = (student as any).classes?.id;
        const { data: approval } = await sb.from("print_approvals").select("status").eq("class_id", classId).maybeSingle();
        if (!approval || approval.status !== "approved") {
          return fail("This result has not yet been approved for release. Please check back later or contact the school.", 403);
        }
        const full = await computeClassReports(classId);
        const report = full.reports.find((r: any) => r.student.id === student.id);
        if (!report) return genericFail();
        return json({ class: full.class, settings: full.settings, report, classTeacherProfile: full.classTeacherProfile });
      }

      default:
        return fail("Unknown action: " + action, 404);
    }
  } catch (e: any) {
    console.error(e);
    const status = e?.status || 500;
    return fail(e?.message || "Server error", status);
  }
});
