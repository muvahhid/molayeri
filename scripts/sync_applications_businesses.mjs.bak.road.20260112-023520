import admin from "firebase-admin";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const CREATE_MISSING = args.has("--create-missing");
const LIMIT_ARG = process.argv.find((x) => x.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1] || "0") : 0;

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS ayarlı değil.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const normStatus = (s) => {
  const v = (s ?? "").toString().toLowerCase().trim();
  if (v === "approved") return "approved";
  if (v === "passive") return "passive";
  if (v === "pending") return "pending";
  return "pending";
};

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

const getOwnerUid = (a) =>
  a?.ownerUid ||
  a?.user?.uid ||
  a?.userUid ||
  a?.uid ||
  a?._uid ||
  "";

const getOwnerEmail = (a) =>
  a?.ownerEmail ||
  a?.user?.email ||
  a?.email ||
  "";

const main = async () => {
  let q = db.collection("applications").orderBy("createdAt", "desc");
  if (LIMIT && Number.isFinite(LIMIT) && LIMIT > 0) q = q.limit(LIMIT);

  const snap = await q.get();
  console.log(`applications: ${snap.size}`);

  let updated = 0;
  let created = 0;
  let skipped = 0;

  const batchMax = 450;
  let batch = db.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    if (!APPLY) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of snap.docs) {
    const appId = doc.id;
    const a = doc.data() || {};
    const targetStatus = normStatus(a.status);

    const bizRef = db.collection("businesses").doc(appId);
    const bizSnap = await bizRef.get();

    if (!bizSnap.exists) {
      if (!CREATE_MISSING) {
        console.log(`MISSING business: ${appId} (app.status=${targetStatus})`);
        skipped++;
        continue;
      }

      const payload = {
        applicationId: appId,
        status: targetStatus,
        ownerUid: getOwnerUid(a),
        ownerEmail: getOwnerEmail(a),
        updatedAt: now,
        createdAt: now,
        ...pick(a, [
          "name",
          "addressText",
          "lat",
          "lng",
          "selectedCategoryIds",
          "featureValues",
          "photos",
          "description",
        ]),
      };

      console.log(`CREATE business: ${appId} status=${targetStatus}`);
      if (APPLY) batch.set(bizRef, payload, { merge: true });
      created++;
      ops++;
      if (ops >= batchMax) await flush();
      continue;
    }

    const b = bizSnap.data() || {};
    const current = normStatus(b.status);
    const needsStatus = current !== targetStatus;
    const needsLink = (b.applicationId || "") !== appId;

    if (!needsStatus && !needsLink) continue;

    const patch = {
      ...(needsStatus ? { status: targetStatus } : {}),
      ...(needsLink ? { applicationId: appId } : {}),
      updatedAt: now,
    };

    console.log(
      `UPDATE business: ${appId} ${current} -> ${targetStatus} link=${needsLink ? "fix" : "ok"}`
    );

    if (APPLY) batch.set(bizRef, patch, { merge: true });
    updated++;
    ops++;
    if (ops >= batchMax) await flush();
  }

  await flush();

  console.log("DONE");
  console.log({ APPLY, CREATE_MISSING, LIMIT, updated, created, skipped });
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
