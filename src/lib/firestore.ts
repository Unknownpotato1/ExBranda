// Firestore data layer — mimics the Prisma client interface we use.
// This lets us keep API route code mostly unchanged while switching
// the storage backend from SQLite/Prisma to Firestore.
//
// All collections are named the same as the Prisma models:
// users, wallets, transactions, submissions, withdrawals, referrals,
// settings, admins, notifications, downloads, auditLogs

import { getDb } from "./firebase-admin";
import type { FirebaseFirestore } from "firebase-admin/firestore";

// Helpers
type DocData = Record<string, any>;

function normalizeSnap(snap: any): any {
  if (!snap || !snap.exists) return null;
  return { id: snap.id, _ref: snap.ref, ...snap.data() };
}

function normalizeSnapshot(snap: any): any[] {
  const out: any[] = [];
  snap.forEach((d: any) => out.push({ id: d.id, _ref: d.ref, ...d.data() }));
  return out;
}

// Convert Firestore timestamps to JS Date for compatibility with existing code
function reviver(data: any): any {
  if (!data) return data;
  const out: any = { ...data };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v && typeof v === "object" && typeof v.toDate === "function") {
      out[k] = v.toDate();
    } else if (v && typeof v === "object" && v._seconds !== undefined && v._nanoseconds !== undefined) {
      out[k] = new Date(v._seconds * 1000 + v._nanoseconds / 1e6);
    }
  }
  return out;
}

// === USERS ===
const users = {
  async findUnique({ where, include }: { where: { id?: string; email?: string; referralCode?: string }; include?: DocData }): Promise<any | null> {
    const db = getDb();
    let user: any = null;
    if (where.id) {
      const snap = await db.collection("users").doc(where.id).get();
      if (!snap.exists) return null;
      user = reviver({ id: snap.id, ...snap.data() });
    } else if (where.email) {
      const snap = await db.collection("users").where("email", "==", where.email).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      user = reviver({ id: d.id, ...d.data() });
    } else if (where.referralCode) {
      const snap = await db.collection("users").where("referralCode", "==", where.referralCode).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      user = reviver({ id: d.id, ...d.data() });
    }
    if (!user) return null;
    if (include?.wallet) {
      const w = await db.collection("wallets").doc(user.id).get();
      user.wallet = w.exists ? reviver({ id: w.id, ...w.data() }) : null;
    }
    return user;
  },

  async findFirst({ where }: { where: DocData }): Promise<any | null> {
    const db = getDb();
    let q: any = db.collection("users");
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, "==", v);
    }
    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return reviver({ id: d.id, ...d.data() });
  },

  async findMany({ where, include, orderBy, take }: { where?: DocData; include?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("users");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object") {
          // Handle nested where like { role: "user" }
          if (v.equals !== undefined) q = q.where(k, "==", v.equals);
          else continue;
        } else {
          q = q.where(k, "==", v);
        }
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    if (take) q = q.limit(take);
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    if (include?.wallet) {
      for (const u of docs) {
        const w = await db.collection("wallets").doc(u.id).get();
        (u as any).wallet = w.exists ? reviver({ id: w.id, ...w.data() }) : null;
      }
    }
    return docs;
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const ref = await db.collection("users").add(payload);
    return { id: ref.id, ...payload };
  },

  async update({ where, data }: { where: { id?: string; email?: string }; data: DocData }): Promise<any> {
    const db = getDb();
    let ref;
    if (where.id) {
      ref = db.collection("users").doc(where.id);
    } else if (where.email) {
      const snap = await db.collection("users").where("email", "==", where.email).limit(1).get();
      if (snap.empty) throw new Error("User not found");
      ref = snap.docs[0].ref;
    } else {
      throw new Error("update: no where clause");
    }
    const payload = { ...data, updatedAt: new Date() };
    await ref.update(payload);
    const updated = await ref.get();
    return reviver({ id: ref.id, ...updated.data() });
  },

  async count({ where }: { where?: DocData } = {}): Promise<number> {
    const db = getDb();
    let q: any = db.collection("users");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v instanceof Date) q = q.where(k, "==", v);
        else if (v && typeof v === "object" && "gte" in v) q = q.where(k, ">=", v.gte);
        else q = q.where(k, "==", v);
      }
    }
    const snap = await q.count().get();
    return snap.data().count;
  },

  async delete({ where }: { where: { id: string } }): Promise<void> {
    const db = getDb();
    await db.collection("users").doc(where.id).delete();
    // Cascade: also delete wallet, submissions, etc.
    try {
      await db.collection("wallets").doc(where.id).delete();
    } catch {}
    const subs = await db.collection("submissions").where("userId", "==", where.id).get();
    const batch = db.batch();
    subs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

// === WALLETS === (keyed by userId for convenience)
const wallets = {
  async findUnique({ where }: { where: { userId?: string; id?: string } }): Promise<any | null> {
    const db = getDb();
    if (where.userId) {
      const snap = await db.collection("wallets").where("userId", "==", where.userId).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return reviver({ id: d.id, ...d.data() });
    }
    if (where.id) {
      const snap = await db.collection("wallets").doc(where.id).get();
      return snap.exists ? reviver({ id: snap.id, ...snap.data() }) : null;
    }
    return null;
  },

  async findMany({ where, include, orderBy }: { where?: DocData; include?: DocData; orderBy?: any } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("wallets");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object" && v.role !== undefined) {
          // where: { user: { role: "user", banned: false } } — we need to join
          // This is a limitation of NoSQL. We do it in two steps.
          const userSnap = await db.collection("users").where("role", "==", v.role).get();
          const userIds = userSnap.docs.map((d) => d.id);
          if (userIds.length === 0) return [];
          q = q.where("userId", "in", userIds.slice(0, 30)); // Firestore "in" supports up to 30
        } else {
          q = q.where(k, "==", v);
        }
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    if (include?.user) {
      for (const w of docs) {
        const u = await db.collection("users").doc(w.userId).get();
        (w as any).user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
      }
    }
    return docs;
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    // Use userId as document ID for easy lookup
    const ref = db.collection("wallets").doc(data.userId);
    await ref.set(payload);
    return { id: ref.id, ...payload };
  },

  async update({ where, data }: { where: { userId: string }; data: DocData }): Promise<any> {
    const db = getDb();
    const ref = db.collection("wallets").doc(where.userId);
    const payload = { ...data, updatedAt: new Date() };
    await ref.update(payload);
    const updated = await ref.get();
    return reviver({ id: ref.id, ...updated.data() });
  },
};

// === Helper: increment a numeric field atomically ===
async function atomicIncrement(collection: string, docId: string, fields: Record<string, number>): Promise<void> {
  const db = getDb();
  const ref = db.collection(collection).doc(docId);
  const update: DocData = {};
  for (const [k, v] of Object.entries(fields)) {
    update[k] = db.firestore.FieldValue.increment(v);
  }
  update.updatedAt = new Date();
  await ref.update(update);
}

// === SUBMISSIONS ===
const submissions = {
  async findUnique({ where, include }: { where: { id: string }; include?: DocData }): Promise<any | null> {
    const db = getDb();
    const snap = await db.collection("submissions").doc(where.id).get();
    if (!snap.exists) return null;
    const sub = reviver({ id: snap.id, ...snap.data() });
    if (include?.user) {
      const u = await db.collection("users").doc(sub.userId).get();
      sub.user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
    }
    return sub;
  },

  async findMany({ where, include, orderBy, take }: { where?: DocData; include?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("submissions");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object") {
          if (v.equals !== undefined) q = q.where(k, "==", v.equals);
          else if (v.gte !== undefined) q = q.where(k, ">=", v.gte);
          else if (v.lt !== undefined) q = q.where(k, "<", v.lt);
          else if (v.in !== undefined) q = q.where(k, "in", v.in);
          else if (v.contains !== undefined) {
            // Firestore doesn't support native LIKE — use prefix match (case-sensitive)
            q = q.where(k, ">=", v.contains).where(k, "<=", v.contains + "\uf8ff");
          }
        } else {
          q = q.where(k, "==", v);
        }
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    if (take) q = q.limit(take);
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    if (include?.user) {
      for (const s of docs) {
        const u = await db.collection("users").doc(s.userId).get();
        (s as any).user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
      }
    }
    return docs;
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const ref = await db.collection("submissions").add(payload);
    return { id: ref.id, ...payload };
  },

  async update({ where, data }: { where: { id: string }; data: DocData }): Promise<any> {
    const db = getDb();
    const ref = db.collection("submissions").doc(where.id);
    const payload = { ...data, updatedAt: new Date() };
    await ref.update(payload);
    const updated = await ref.get();
    return reviver({ id: ref.id, ...updated.data() });
  },

  async updateMany({ where, data }: { where: DocData; data: DocData }): Promise<{ count: number }> {
    const db = getDb();
    let q: any = db.collection("submissions");
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, "==", v);
    }
    const snap = await q.get();
    const batch = db.batch();
    snap.forEach((d) => batch.update(d.ref, { ...data, updatedAt: new Date() }));
    await batch.commit();
    return { count: snap.size };
  },

  async count({ where }: { where?: DocData } = {}): Promise<number> {
    const db = getDb();
    let q: any = db.collection("submissions");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v instanceof Date) q = q.where(k, "==", v);
        else if (v && typeof v === "object" && "gte" in v) q = q.where(k, ">=", v.gte);
        else if (v && typeof v === "object" && "lt" in v) q = q.where(k, "<", v.lt);
        else q = q.where(k, "==", v);
      }
    }
    const snap = await q.count().get();
    return snap.data().count;
  },

  async aggregate({ where, _sum }: { where?: DocData; _sum?: any }): Promise<{ _sum: any }> {
    // Firestore doesn't have native SUM. We read all matching docs and sum in JS.
    const db = getDb();
    let q: any = db.collection("submissions");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v instanceof Date) q = q.where(k, "==", v);
        else if (v && typeof v === "object" && "gte" in v) q = q.where(k, ">=", v.gte);
        else if (v && typeof v === "object" && "lt" in v) q = q.where(k, "<", v.lt);
        else q = q.where(k, "==", v);
      }
    }
    const snap = await q.get();
    const result: any = {};
    if (_sum) {
      for (const field of Object.keys(_sum)) {
        let total = 0;
        snap.forEach((d) => {
          const val = (d.data() as any)[field];
          if (typeof val === "number") total += val;
        });
        result[field] = total;
      }
    }
    return { _sum: result };
  },
};

// === WITHDRAWALS === (similar pattern)
const withdrawals = {
  async findUnique({ where, include }: { where: { id: string }; include?: DocData }): Promise<any | null> {
    const db = getDb();
    const snap = await db.collection("withdrawals").doc(where.id).get();
    if (!snap.exists) return null;
    const w = reviver({ id: snap.id, ...snap.data() });
    if (include?.user) {
      const u = await db.collection("users").doc(w.userId).get();
      w.user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
    }
    return w;
  },

  async findMany({ where, include, orderBy, take }: { where?: DocData; include?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("withdrawals");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object") {
          if (v.gte !== undefined) q = q.where(k, ">=", v.gte);
          else if (v.in !== undefined) q = q.where(k, "in", v.in);
          else if (v.contains !== undefined) {
            q = q.where(k, ">=", v.contains).where(k, "<=", v.contains + "\uf8ff");
          }
        } else {
          q = q.where(k, "==", v);
        }
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    if (take) q = q.limit(take);
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    if (include?.user) {
      for (const w of docs) {
        const u = await db.collection("users").doc(w.userId).get();
        (w as any).user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
      }
    }
    return docs;
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const now = new Date();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const ref = await db.collection("withdrawals").add(payload);
    return { id: ref.id, ...payload };
  },

  async update({ where, data }: { where: { id: string }; data: DocData }): Promise<any> {
    const db = getDb();
    const ref = db.collection("withdrawals").doc(where.id);
    const payload = { ...data, updatedAt: new Date() };
    await ref.update(payload);
    const updated = await ref.get();
    return reviver({ id: ref.id, ...updated.data() });
  },

  async updateMany({ where, data }: { where: DocData; data: DocData }): Promise<{ count: number }> {
    const db = getDb();
    let q: any = db.collection("withdrawals");
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, "==", v);
    }
    const snap = await q.get();
    const batch = db.batch();
    snap.forEach((d) => batch.update(d.ref, { ...data, updatedAt: new Date() }));
    await batch.commit();
    return { count: snap.size };
  },

  async count({ where }: { where?: DocData } = {}): Promise<number> {
    const db = getDb();
    let q: any = db.collection("withdrawals");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v instanceof Date) q = q.where(k, "==", v);
        else if (v && typeof v === "object" && "gte" in v) q = q.where(k, ">=", v.gte);
        else if (v && typeof v === "object" && "lt" in v) q = q.where(k, "<", v.lt);
        else q = q.where(k, "==", v);
      }
    }
    const snap = await q.count().get();
    return snap.data().count;
  },

  async aggregate({ where, _sum }: { where?: DocData; _sum?: any }): Promise<{ _sum: any }> {
    const db = getDb();
    let q: any = db.collection("withdrawals");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v instanceof Date) q = q.where(k, "==", v);
        else if (v && typeof v === "object" && "gte" in v) q = q.where(k, ">=", v.gte);
        else if (v && typeof v === "object" && "lt" in v) q = q.where(k, "<", v.lt);
        else q = q.where(k, "==", v);
      }
    }
    const snap = await q.get();
    const result: any = {};
    if (_sum) {
      for (const field of Object.keys(_sum)) {
        let total = 0;
        snap.forEach((d) => {
          const val = (d.data() as any)[field];
          if (typeof val === "number") total += val;
        });
        result[field] = total;
      }
    }
    return { _sum: result };
  },
};

// === TRANSACTIONS ===
const transactions = {
  async findMany({ where, orderBy, take }: { where?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("transactions");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        q = q.where(k, "==", v);
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    if (take) q = q.limit(take);
    const snap = await q.get();
    return normalizeSnapshot(snap).map(reviver);
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    const ref = await db.collection("transactions").add(payload);
    return { id: ref.id, ...payload };
  },

  async createMany({ data }: { data: DocData[] }): Promise<{ count: number }> {
    const db = getDb();
    const batch = db.batch();
    for (const d of data) {
      const ref = db.collection("transactions").doc();
      batch.set(ref, { ...d, createdAt: new Date() });
    }
    await batch.commit();
    return { count: data.length };
  },

  async updateMany({ where, data }: { where: DocData; data: DocData }): Promise<{ count: number }> {
    const db = getDb();
    let q: any = db.collection("transactions");
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, "==", v);
    }
    const snap = await q.get();
    const batch = db.batch();
    snap.forEach((d) => batch.update(d.ref, data));
    await batch.commit();
    return { count: snap.size };
  },
};

// === REFERRALS ===
const referrals = {
  async findUnique({ where }: { where: { referredId?: string; id?: string } }): Promise<any | null> {
    const db = getDb();
    if (where.referredId) {
      const snap = await db.collection("referrals").where("referredId", "==", where.referredId).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return reviver({ id: d.id, ...d.data() });
    }
    if (where.id) {
      const snap = await db.collection("referrals").doc(where.id).get();
      return snap.exists ? reviver({ id: snap.id, ...snap.data() }) : null;
    }
    return null;
  },

  async findMany({ where, include, orderBy }: { where?: DocData; include?: DocData; orderBy?: any } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("referrals");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        q = q.where(k, "==", v);
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    if (include?.referred) {
      for (const r of docs) {
        const u = await db.collection("users").doc(r.referredId).get();
        (r as any).referred = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
      }
    }
    if (include?.referrer) {
      for (const r of docs) {
        const u = await db.collection("users").doc(r.referrerId).get();
        (r as any).referrer = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
      }
    }
    return docs;
  },

  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    const ref = await db.collection("referrals").add(payload);
    return { id: ref.id, ...payload };
  },

  async update({ where, data }: { where: { id: string }; data: DocData }): Promise<any> {
    const db = getDb();
    const ref = db.collection("referrals").doc(where.id);
    await ref.update(data);
    const updated = await ref.get();
    return reviver({ id: ref.id, ...updated.data() });
  },

  async count({ where }: { where?: DocData } = {}): Promise<number> {
    const db = getDb();
    let q: any = db.collection("referrals");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        q = q.where(k, "==", v);
      }
    }
    const snap = await q.count().get();
    return snap.data().count;
  },
};

// === SETTINGS ===
const settings = {
  async findMany(): Promise<any[]> {
    const db = getDb();
    const snap = await db.collection("settings").get();
    return normalizeSnapshot(snap).map(reviver);
  },
  async count(): Promise<number> {
    const db = getDb();
    const snap = await db.collection("settings").count().get();
    return snap.data().count;
  },
  async createMany({ data }: { data: DocData[] }): Promise<{ count: number }> {
    const db = getDb();
    const batch = db.batch();
    for (const d of data) {
      const ref = db.collection("settings").doc(d.key);
      batch.set(ref, { ...d, updatedAt: new Date() });
    }
    await batch.commit();
    return { count: data.length };
  },
};

// === ADMINS === (we use Firestore collection to mark admin emails)
const admins = {
  async findUnique({ where }: { where: { userId?: string } }): Promise<any | null> {
    const db = getDb();
    if (where.userId) {
      const snap = await db.collection("admins").doc(where.userId).get();
      return snap.exists ? reviver({ id: snap.id, ...snap.data() }) : null;
    }
    return null;
  },
  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    // Use userId as doc id
    const ref = db.collection("admins").doc(data.userId);
    await ref.set(payload);
    return { id: ref.id, ...payload };
  },
};

// === NOTIFICATIONS ===
const notifications = {
  async findMany({ where, orderBy, take }: { where?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    let q: any = db.collection("notifications");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        q = q.where(k, "==", v);
      }
    }
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
      }
    }
    if (take) q = q.limit(take);
    const snap = await q.get();
    return normalizeSnapshot(snap).map(reviver);
  },
  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    const ref = await db.collection("notifications").add(payload);
    return { id: ref.id, ...payload };
  },
  async updateMany({ where, data }: { where: DocData; data: DocData }): Promise<{ count: number }> {
    const db = getDb();
    let q: any = db.collection("notifications");
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, "==", v);
    }
    const snap = await q.get();
    const batch = db.batch();
    snap.forEach((d) => batch.update(d.ref, data));
    await batch.commit();
    return { count: snap.size };
  },
};

// === DOWNLOADS ===
const downloads = {
  async count({ where }: { where?: DocData } = {}): Promise<number> {
    const db = getDb();
    let q: any = db.collection("downloads");
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        q = q.where(k, "==", v);
      }
    }
    const snap = await q.count().get();
    return snap.data().count;
  },
  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    const ref = await db.collection("downloads").add(payload);
    return { id: ref.id, ...payload };
  },
};

// === AUDIT LOGS ===
const auditLogs = {
  async create({ data }: { data: DocData }): Promise<any> {
    const db = getDb();
    const payload = { ...data, createdAt: new Date() };
    const ref = await db.collection("auditLogs").add(payload);
    return { id: ref.id, ...payload };
  },
};

// === Transaction support — Firestore has batched writes ===
// We expose a simple `tx()` wrapper that runs a callback with a batch
async function tx(fn: (batch: any) => Promise<void>): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  await fn(batch);
  await batch.commit();
}

// Helper for atomic increments on wallet
async function incrementWallet(userId: string, fields: Record<string, number>): Promise<void> {
  await atomicIncrement("wallets", userId, fields);
}

export const db = {
  user: users,
  wallet: wallets,
  submission: submissions,
  withdrawal: withdrawals,
  transaction: transactions,
  referral: referrals,
  setting: settings,
  admin: admins,
  notification: notifications,
  download: downloads,
  auditLog: auditLogs,
  $transaction: tx,
  incrementWallet,
};

// For backward compat with existing imports
export { getDb };
