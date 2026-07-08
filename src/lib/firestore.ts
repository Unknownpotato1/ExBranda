// Firestore data layer — mimics the Prisma client interface we use.
// This lets us keep API route code mostly unchanged while switching
// the storage backend from SQLite/Prisma to Firestore.
//
// All collections are named the same as the Prisma models:
// users, wallets, transactions, submissions, withdrawals, referrals,
// settings, admins, notifications, downloads, auditLogs

import { getDb, FieldValue } from "./firebase-admin";
import type { FirebaseFirestore } from "firebase-admin";

// Helpers
type DocData = Record<string, any>;

function normalizeSnap(snap: any): any {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  // Strip internal Firestore refs (we expose id separately)
  const { _ref, ...rest } = data as any;
  return { id: snap.id, ...rest };
}

function normalizeSnapshot(snap: any): any[] {
  const out: any[] = [];
  snap.forEach((d: any) => {
    const data = d.data();
    const { _ref, ...rest } = data as any;
    out.push({ id: d.id, ...rest });
  });
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

// Helper: count docs in a collection, using only the first where condition
// for the Firestore query (to avoid composite index requirements) and
// filtering the rest in JS.
async function countWithJsFilter(collection: any, where?: DocData): Promise<number> {
  if (!where || Object.keys(where).length === 0) {
    const snap = await collection.count().get();
    return snap.data().count;
  }
  const entries = Object.entries(where);
  // Build a query with just the first condition
  const [k0, v0] = entries[0];
  let op = "==";
  let val: any = v0;
  if (v0 && typeof v0 === "object" && !(v0 instanceof Date)) {
    if ("gte" in v0) { op = ">="; val = v0.gte; }
    else if ("lt" in v0) { op = "<"; val = v0.lt; }
    else if ("in" in v0) { op = "in"; val = v0.in; }
  }
  let q: any = collection.where(k0, op, val);
  if (entries.length === 1) {
    const snap = await q.count().get();
    return snap.data().count;
  }
  // Multiple conditions — fetch all matching the first, filter the rest in JS
  const snap = await q.get();
  let count = 0;
  snap.forEach((d: any) => {
    const data = d.data();
    let match = true;
    for (let i = 1; i < entries.length; i++) {
      const [k, v] = entries[i];
      if (v instanceof Date) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() === v.getTime();
      } else if (v && typeof v === "object" && "gte" in v) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() >= v.gte.getTime();
      } else if (v && typeof v === "object" && "lt" in v) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() < v.lt.getTime();
      } else if (v && typeof v === "object" && "in" in v) {
        match = match && v.in.includes(data[k]);
      } else {
        match = match && data[k] === v;
      }
    }
    if (match) count++;
  });
  return count;
}

// Helper: aggregate SUM of a field, using only the first where condition for the
// Firestore query (to avoid composite index requirements) and filtering in JS.
async function aggregateWithJsFilter(collection: any, where: DocData | undefined, sumFields: string[]): Promise<{ _sum: any }> {
  const result: any = {};
  for (const f of sumFields) result[f] = 0;
  if (!where || Object.keys(where).length === 0) {
    const snap = await collection.get();
    snap.forEach((d: any) => {
      const data = d.data();
      for (const f of sumFields) {
        if (typeof data[f] === "number") result[f] += data[f];
      }
    });
    return { _sum: result };
  }
  const entries = Object.entries(where);
  const [k0, v0] = entries[0];
  let op = "==";
  let val: any = v0;
  if (v0 && typeof v0 === "object" && !(v0 instanceof Date)) {
    if ("gte" in v0) { op = ">="; val = v0.gte; }
    else if ("lt" in v0) { op = "<"; val = v0.lt; }
  }
  let q: any = collection.where(k0, op, val);
  const snap = await q.get();
  snap.forEach((d: any) => {
    const data = d.data();
    let match = true;
    for (let i = 1; i < entries.length; i++) {
      const [k, v] = entries[i];
      if (v instanceof Date) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() === v.getTime();
      } else if (v && typeof v === "object" && "gte" in v) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() >= v.gte.getTime();
      } else if (v && typeof v === "object" && "lt" in v) {
        const dv = data[k];
        const dvDate = dv && dv.toDate ? dv.toDate() : dv ? new Date(dv) : null;
        match = match && dvDate && dvDate.getTime() < v.lt.getTime();
      } else {
        match = match && data[k] === v;
      }
    }
    if (match) {
      for (const f of sumFields) {
        if (typeof data[f] === "number") result[f] += data[f];
      }
    }
  });
  return { _sum: result };
}

// Helper: findMany with where + orderBy without requiring composite indexes.
// Strategy: query by the first where condition (single field, no index needed),
// filter the rest in JS, then sort + limit in JS.
async function findManyWithJsFilter(
  collection: any,
  opts: { where?: DocData; orderBy?: any; take?: number }
): Promise<any[]> {
  const { where, orderBy, take } = opts;
  let q: any = collection;
  if (where) {
    const entries = Object.entries(where);
    if (entries.length > 0) {
      // Use only the first WHERE condition for the Firestore query
      const [k0, v0] = entries[0];
      let op = "==";
      let val: any = v0;
      if (v0 && typeof v0 === "object" && !(v0 instanceof Date)) {
        if ("gte" in v0) { op = ">="; val = v0.gte; }
        else if ("lt" in v0) { op = "<"; val = v0.lt; }
        else if ("in" in v0) { op = "in"; val = v0.in; }
        else if ("contains" in v0) {
          // Prefix match — Firestore supports this with range query
          q = q.where(k0, ">=", v0.contains).where(k0, "<=", v0.contains + "\uf8ff");
          // skip default handling
          // Continue to JS filter for additional conditions
          if (entries.length > 1) {
            const snap = await q.get();
            let docs = normalizeSnapshot(snap).map(reviver);
            docs = docs.filter((d: any) => {
              for (let i = 1; i < entries.length; i++) {
                const [k, v] = entries[i];
                if (v && typeof v === "object" && "contains" in v) {
                  if (!String(d[k] || "").includes(v.contains)) return false;
                } else if (v && typeof v === "object" && "gte" in v) {
                  const dv = d[k] instanceof Date ? d[k] : new Date(d[k]);
                  if (!(dv && dv.getTime() >= v.gte.getTime())) return false;
                } else {
                  if (d[k] !== v) return false;
                }
              }
              return true;
            });
            return applyOrderByAndTake(docs, orderBy, take);
          }
          const snap = await q.get();
          let docs = normalizeSnapshot(snap).map(reviver);
          return applyOrderByAndTake(docs, orderBy, take);
        }
      }
      q = q.where(k0, op, val);
      // If there are more conditions, fetch all and filter in JS
      if (entries.length > 1) {
        const snap = await q.get();
        let docs = normalizeSnapshot(snap).map(reviver);
        docs = docs.filter((d: any) => {
          for (let i = 1; i < entries.length; i++) {
            const [k, v] = entries[i];
            if (v instanceof Date) {
              const dv = d[k] instanceof Date ? d[k] : new Date(d[k]);
              if (!(dv && dv.getTime() === v.getTime())) return false;
            } else if (v && typeof v === "object" && "gte" in v) {
              const dv = d[k] instanceof Date ? d[k] : new Date(d[k]);
              if (!(dv && dv.getTime() >= v.gte.getTime())) return false;
            } else if (v && typeof v === "object" && "lt" in v) {
              const dv = d[k] instanceof Date ? d[k] : new Date(d[k]);
              if (!(dv && dv.getTime() < v.lt.getTime())) return false;
            } else if (v && typeof v === "object" && "in" in v) {
              if (!v.in.includes(d[k])) return false;
            } else {
              if (d[k] !== v) return false;
            }
          }
          return true;
        });
        return applyOrderByAndTake(docs, orderBy, take);
      }
    }
  }
  // Single condition with orderBy on a DIFFERENT field still needs a composite
  // index in Firestore. To avoid this entirely, when we have BOTH where AND
  // orderBy, fetch all matching docs (using just the first where) and sort in JS.
  if (where && orderBy) {
    const snap = await q.get();
    let docs = normalizeSnapshot(snap).map(reviver);
    return applyOrderByAndTake(docs, orderBy, take);
  }
  // No where OR no orderBy — Firestore can handle single-field queries natively
  if (orderBy) {
    for (const [field, dir] of Object.entries(orderBy)) {
      q = q.orderBy(field, dir === "asc" ? "asc" : "desc");
    }
  }
  if (take) q = q.limit(take);
  const snap = await q.get();
  return normalizeSnapshot(snap).map(reviver);
}

function applyOrderByAndTake(docs: any[], orderBy?: any, take?: number): any[] {
  if (orderBy) {
    for (const [field, dir] of Object.entries(orderBy)) {
      docs.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        const aTime = av instanceof Date ? av.getTime() : av && av.toDate ? av.toDate().getTime() : av ? new Date(av).getTime() : 0;
        const bTime = bv instanceof Date ? bv.getTime() : bv && bv.toDate ? bv.toDate().getTime() : bv ? new Date(bv).getTime() : 0;
        if (typeof av === "number" && typeof bv === "number") {
          return dir === "asc" ? av - bv : bv - av;
        }
        return dir === "asc" ? aTime - bTime : bTime - aTime;
      });
    }
  }
  if (take) docs = docs.slice(0, take);
  return docs;
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
    // Strip out Prisma-style operators that our helper doesn't understand
    const cleanWhere: DocData = {};
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object" && "equals" in v) cleanWhere[k] = v.equals;
        else if (v && typeof v === "object" && "gte" in v) cleanWhere[k] = v;
        else cleanWhere[k] = v;
      }
    }
    let docs = await findManyWithJsFilter(db.collection("users"), { where: cleanWhere, orderBy, take });
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
    return countWithJsFilter(db.collection("users"), where);
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

  async findMany({ where, include, orderBy, take }: { where?: DocData; include?: DocData; orderBy?: any; take?: number } = {}): Promise<any> {
    const db = getDb();
    // Special handling for `where: { user: { role, banned } }` (used by admin stats & leaderboard)
    if (where?.user && typeof where.user === "object") {
      // Fetch all users matching the role/banned filter
      const userFilter = where.user as DocData;
      const userSnap = await db.collection("users").get();
      const userIds: string[] = [];
      userSnap.forEach((d: any) => {
        const u = reviver({ id: d.id, ...d.data() });
        let match = true;
        for (const [k, v] of Object.entries(userFilter)) {
          if (u[k] !== v) { match = false; break; }
        }
        if (match) userIds.push(d.id);
      });
      if (userIds.length === 0) return [];
      // Fetch all wallets for these users
      const walletSnaps = await Promise.all(
        userIds.map((uid) => db.collection("wallets").doc(uid).get())
      );
      let docs = walletSnaps
        .filter((s: any) => s.exists)
        .map((s: any) => reviver({ id: s.id, ...s.data() }));
      if (include?.user) {
        for (const w of docs) {
          const u = await db.collection("users").doc(w.userId).get();
          (w as any).user = u.exists ? reviver({ id: u.id, ...u.data() }) : null;
        }
      }
      // Apply orderBy + take via JS
      return applyOrderByAndTake(docs, orderBy, take);
    }
    // Default path
    let docs = await findManyWithJsFilter(db.collection("wallets"), { where, orderBy, take });
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
    // Translate Prisma-style { increment: N } to Firestore FieldValue.increment(N)
    const payload: DocData = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object" && "increment" in v && typeof v.increment === "number") {
        payload[k] = FieldValue.increment(v.increment);
      } else if (v && typeof v === "object" && "decrement" in v && typeof v.decrement === "number") {
        payload[k] = FieldValue.increment(-v.decrement);
      } else {
        payload[k] = v;
      }
    }
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
    update[k] = FieldValue.increment(v);
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
    // Strip out Prisma-style operators that our helper doesn't understand
    const cleanWhere: DocData = {};
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === "object" && "equals" in v) cleanWhere[k] = v.equals;
        else cleanWhere[k] = v;
      }
    }
    let docs = await findManyWithJsFilter(db.collection("submissions"), { where: cleanWhere, orderBy, take });
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
    return countWithJsFilter(db.collection("submissions"), where);
  },

  async aggregate({ where, _sum }: { where?: DocData; _sum?: any }): Promise<{ _sum: any }> {
    const db = getDb();
    return aggregateWithJsFilter(db.collection("submissions"), where, _sum ? Object.keys(_sum) : []);
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
    let docs = await findManyWithJsFilter(db.collection("withdrawals"), { where, orderBy, take });
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
    return countWithJsFilter(db.collection("withdrawals"), where);
  },

  async aggregate({ where, _sum }: { where?: DocData; _sum?: any }): Promise<{ _sum: any }> {
    const db = getDb();
    return aggregateWithJsFilter(db.collection("withdrawals"), where, _sum ? Object.keys(_sum) : []);
  },
};

// === TRANSACTIONS ===
const transactions = {
  async findMany({ where, orderBy, take }: { where?: DocData; orderBy?: any; take?: number } = {}): Promise<any[]> {
    const db = getDb();
    return findManyWithJsFilter(db.collection("transactions"), { where, orderBy, take });
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
    let docs = await findManyWithJsFilter(db.collection("referrals"), { where, orderBy });
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
    return findManyWithJsFilter(db.collection("notifications"), { where, orderBy, take });
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
