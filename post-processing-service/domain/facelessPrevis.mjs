import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { loadPostProcessingPolicy } from '../config/serviceConfig.mjs';

const defaultPolicy = loadPostProcessingPolicy();

export async function createFacelessPrevis(bytes, { detector, expectedFaces, policy = defaultPolicy }) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > policy.maxInputBytes) {
    throw failure('faceless_input_size_invalid', 'Image exceeds the supported size.', 413);
  }
  if (!Number.isInteger(expectedFaces) || expectedFaces < 1 || expectedFaces > policy.maxFaces) {
    throw failure('faceless_expected_faces_invalid', 'Expected visible face count must be 1 to ' + policy.maxFaces + '.', 400);
  }
  let metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: policy.maxPixels }).metadata();
  } catch {
    throw failure('faceless_image_invalid', 'Image could not be decoded.', 400);
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)
    || !metadata.width || !metadata.height
    || metadata.width * metadata.height > policy.maxPixels) {
    throw failure('faceless_image_unsupported', 'Use a JPEG, PNG or WebP image within the configured pixel limit.', 400);
  }
  const normalized = await sharp(bytes, { limitInputPixels: policy.maxPixels }).rotate().png().toBuffer();
  const { width, height } = await sharp(normalized).metadata();
  let faces;
  try {
    faces = await detector.detect(normalized);
  } catch (error) {
    if (error?.code) throw error;
    throw failure('faceless_detection_failed', 'Face detection failed. The source image was not changed.', 422);
  }
  if (!Array.isArray(faces) || faces.length !== expectedFaces || faces.some(face => !validFace(face))) {
    throw failure('faceless_face_count_mismatch', 'Not all expected faces were detected. Use another image or the existing Generate options.', 422);
  }
  const shapes = faces.map(face => faceShape(face, width, height, policy.mask));
  if (shapes.some(shape => shape.rx < policy.minFaceRadiusX || shape.ry < policy.minFaceRadiusY)) {
    throw failure('faceless_face_too_small', 'A visible face is too small to mask reliably.', 422);
  }
  const marks = shapes.map(shape => (
    '<ellipse cx="' + shape.cx + '" cy="' + shape.cy + '" rx="' + shape.rx
      + '" ry="' + shape.ry + '" fill="' + policy.mask.fill + '"/>'
      + '<path d="M ' + shape.guideX + ' ' + round(shape.cy - shape.ry * policy.mask.guideHeightScale)
      + ' L ' + shape.guideX + ' ' + round(shape.cy + shape.ry * policy.mask.guideHeightScale)
      + '" stroke="' + policy.mask.guideStroke + '" stroke-width="' + policy.mask.guideWidth
      + '" opacity="' + policy.mask.guideOpacity + '"/>'
  )).join('');
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + width
    + '" height="' + height + '">' + marks + '</svg>');
  const output = await sharp(normalized).composite([{ input: svg }]).png().toBuffer();
  return {
    bytes: output,
    width,
    height,
    faceCount: faces.length,
    inputHash: createHash('sha256').update(bytes).digest('hex'),
    outputHash: createHash('sha256').update(output).digest('hex'),
    policyVersion: policy.policyVersion
  };
}

function validFace(face) {
  return Array.isArray(face) && face.length >= 100
    && face.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)
      && point.x >= -0.05 && point.x <= 1.05 && point.y >= -0.05 && point.y <= 1.05);
}

function faceShape(face, width, height, mask) {
  const xs = face.map(point => point.x * width);
  const ys = face.map(point => point.y * height);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const cx = round((left + right) / 2);
  const cy = round((top + bottom) / 2);
  return {
    cx, cy,
    rx: round((right - left) * mask.radiusXScale),
    ry: round((bottom - top) * mask.radiusYScale),
    guideX: round(Math.min(right, Math.max(left, (face[1]?.x || cx / width) * width)))
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function failure(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}
