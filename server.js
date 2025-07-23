const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { db, bucket } = require('./firebase');
const { loadModels, getFaceDescriptor } = require('./utils/faceUtils');
const faceapi = require('face-api.js');

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

(async () => {
  await loadModels();
  console.log("Modelos cargados");
})();

app.post('/match-face', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // Obtener descriptor del rostro de la imagen enviada
    const input = await getFaceDescriptor(imagePath);
    if (!input) {
      fs.unlinkSync(imagePath);
      return res.json({ FacesDetected: 0, matches: [] });
    }

    // Obtener imágenes desde Firebase Storage y comparar
    const snapshot = await db.collection('tbl_face').get();
    const matches = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      const filePath = path.join('uploads', data.nombreImagen);
      const tempFile = fs.createWriteStream(filePath);

      // Descargar imagen del Storage
      await bucket.file(`img/${data.nombreImagen}`).download({ destination: filePath });

      const storedFace = await getFaceDescriptor(filePath);
      fs.unlinkSync(filePath);

      if (storedFace) {
        const distance = faceapi.euclideanDistance(input.descriptor, storedFace.descriptor);
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
    console.error(err);
    res.status(500).send("Error procesando la imagen.");
  }
});

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});
