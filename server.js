const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { db, bucket } = require('./firebase');
const { loadModels, getFaceDescriptor } = require('./utils/faceUtils');
const faceapi = require('face-api.js');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

(async () => {
  await loadModels(); // ✅ Cargar modelos antes de levantar el servidor
  console.log("✅ Modelos cargados, arrancando servidor...");
  
  app.listen(port, () => {
    console.log(`🚀 Servidor activo en http://localhost:${port}`);
  });
})();

app.get('/api/say-hello', (req, res) => {
  res.send("Hello World!");
});

// 👇 Aquí va el endpoint
app.post('/api/match-face', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    console.log('📥 Imagen recibida:', req.file.originalname);

    const imagePath = req.file.path;
    const inputDetection = await getFaceDescriptor(imagePath);

    if (!inputDetection) {
      fs.unlinkSync(imagePath);
      return res.json({ FacesDetected: 0, matches: [] });
    }

    const inputDescriptor = inputDetection.descriptor;

    const snapshot = await db.collection('tbl_face').get();
    const matches = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const tempImgPath = path.join('uploads', data.nombreImagen);
      await bucket.file(`img/${data.nombreImagen}`).download({ destination: tempImgPath });

      const storedDetection = await getFaceDescriptor(tempImgPath);
      fs.unlinkSync(tempImgPath);

      if (storedDetection) {
        const distance = faceapi.euclideanDistance(inputDescriptor, storedDetection.descriptor);
        if (distance < 0.6) {
          matches.push({
            label: data.label,
            cedula: data.cedula,
            fechaNacimiento: data.fechaNacimiento,
            tlfEmergencia: data.tlfEmergencia,
            distance: parseFloat(distance.toFixed(3))
          });
        }
      }
    }

    fs.unlinkSync(imagePath);

    return res.json({
      FacesDetected: 1,
      matches: matches.sort((a, b) => a.distance - b.distance)
    });

  } catch (err) {
    console.error('❌ ERROR DETALLADO:', err);
    res.status(500).send("Error procesando la imagen.");
  }
});
