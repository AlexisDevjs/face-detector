const faceapi = require('face-api.js');
const canvas = require('canvas');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Función para cargar modelos
const path = require('path');
async function loadModels() {
  const MODEL_URL = path.join(__dirname, '..', 'models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
}

// Función para obtener descriptor facial de una imagen
async function getFaceDescriptor(imagePath) {
  const img = await canvas.loadImage(imagePath);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (!detection) return null;
  return detection.descriptor;
}

module.exports = { loadModels, getFaceDescriptor };
