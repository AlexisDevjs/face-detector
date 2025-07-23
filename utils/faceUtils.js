const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// 📦 Cargar modelos desde carpeta /models
async function loadModels() {
  const MODEL_URL = path.join(__dirname, '..', 'models');
  console.log('📥 Cargando modelos desde:', MODEL_URL);

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);

  console.log('✅ Modelos cargados correctamente.');
}

// 🎯 Obtener descriptor facial de una imagen
async function getFaceDescriptor(imagePath) {
  console.log('🖼️ Cargando imagen desde:', imagePath);
  try {
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      console.log('❌ No se detectó ningún rostro en la imagen.');
      return null;
    }

    console.log('✅ Rostro detectado.');
    return detection;
  } catch (err) {
    console.error('❌ Error al cargar o procesar la imagen:', err);
    return null;
  }
}

module.exports = {
  loadModels,
  getFaceDescriptor
};
