import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { loadPostProcessingPolicy } from '../config/serviceConfig.mjs';

const defaultPolicy = loadPostProcessingPolicy();

export async function detectFaceLandmarks(bytes, { detector, expectedFaces, policy = defaultPolicy }) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > policy.maxInputBytes) {
    throw failure('faceless_input_size_invalid', 'Image exceeds the supported size.', 413);
  }
  if (expectedFaces !== undefined && expectedFaces !== null && !isNaN(expectedFaces)
    && (!Number.isInteger(expectedFaces) || expectedFaces < 1 || expectedFaces > policy.maxFaces)) {
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
    throw failure('faceless_detection_failed', 'Face detection failed.', 422);
  }
  if (expectedFaces && (!Array.isArray(faces) || faces.length !== expectedFaces)) {
    throw failure('faceless_face_count_mismatch', 'Not all expected faces were detected.', 422);
  }
  return {
    width,
    height,
    faceCount: faces.length,
    inputHash: createHash('sha256').update(bytes).digest('hex'),
    modelHash: policy.model.sha256,
    policyVersion: policy.policyVersion,
    faces
  };
}

function failure(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}
