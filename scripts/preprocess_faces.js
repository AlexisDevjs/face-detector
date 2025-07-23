require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { db, bucket } = require("../firebase");
const { loadModels, getFaceDescriptor } = require("../utils/faceUtils");

// Asegura carpeta temporal
const TMP_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

async function main() {
  await loadModels();

  const snapshot = await db.collection("tbl_face").get();
  const docs = snapshot.docs;

  for (const doc of docs) {
    const data = doc.data();

    if (data.embedding) {
      console.log(`🟡 ${data.nombreImagen} ya tiene embedding. Omitiendo...`);
      continue;
    }

    console.log(`📥 Procesando imagen: ${data.nombreImagen}`);

    const tempLocalPath = path.join(TMP_DIR, data.nombreImagen);
    const remotePath = `img/${data.nombreImagen}`;

    try {
      await bucket.file(remotePath).download({ destination: tempLocalPath });
    } catch (err) {
      console.warn(`❌ No se pudo descargar ${remotePath}:`, err.message);
      continue;
    }

    const detection = await getFaceDescriptor(tempLocalPath);
    fs.unlinkSync(tempLocalPath);

    if (!detection) {
      console.warn(`⚠️ No se detectó rostro en ${data.nombreImagen}`);
      continue;
    }

    await doc.ref.update({
      embedding: Array.from(detection.descriptor),
      embeddingCreatedAt: new Date().toISOString(),
    });

    console.log(`✅ Embedding guardado para ${data.nombreImagen}`);
  }

  console.log("🏁 Proceso completado.");
}

main().catch(console.error);
