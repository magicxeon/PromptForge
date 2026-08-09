function findReferenceIndex(references, role) {
  return references.findIndex(reference => reference.roles.includes(role));
}

function imageLabel(index) {
  return index >= 0 ? `IMAGE_${index}` : null;
}

function sectionWithSource(config, sourceImage) {
  return {
    source_image: sourceImage,
    ...(config.instruction ? { instruction: config.instruction } : {}),
    authority: [...config.authority],
    preserve: [...config.preserve],
    ignore: [...config.ignore]
  };
}

export function buildStructuredReferenceBrief({
  orderedReferences,
  config,
  context
}) {
  if (!config) return null;
  if (!config.generationSurfaces.includes(context.generationSurface)) return null;

  const availableRoles = new Set(
    orderedReferences.flatMap(reference => reference.roles)
  );
  if (!config.requiredRoles.every(role => availableRoles.has(role))) return null;

  const templateIndex = findReferenceIndex(orderedReferences, 'template_baseline');
  const characterIndex = findReferenceIndex(orderedReferences, 'character_reference');
  const faceIndex = findReferenceIndex(orderedReferences, 'face_reference');
  const outfitFrontIndex = findReferenceIndex(orderedReferences, 'outfit_front');
  const outfitBackIndex = findReferenceIndex(orderedReferences, 'outfit_back');

  const templateImage = imageLabel(templateIndex);
  const characterImage = imageLabel(characterIndex);
  const faceImage = imageLabel(faceIndex);
  const outfitFrontImage = imageLabel(outfitFrontIndex);
  const outfitBackImage = imageLabel(outfitBackIndex);

  return {
    contract_id: config.id,
    task: config.task,
    template_direction: sectionWithSource(
      config.templateDirection,
      templateImage
    ),
    character_identity: {
      ...sectionWithSource(config.characterIdentity, faceImage || characterImage),
      body_source_image: characterImage,
      ...(faceImage ? { face_source_image: faceImage } : {})
    },
    outfit_transfer: {
      ...sectionWithSource(config.outfitTransfer, outfitFrontImage),
      ...(outfitBackImage ? { back_source_image: outfitBackImage } : {})
    },
    output: {
      aspect_ratio: context.aspectRatio || '1:1',
      subject_count: config.output.subjectCount,
      single_full_frame_photo: config.output.singleFullFramePhoto,
      full_body_visible: config.output.fullBodyVisible,
      identity_source: faceImage
        ? `${faceImage} for detailed face identity and ${characterImage} for body identity only`
        : `${characterImage} only`,
      composition_source: `${templateImage} only`,
      garment_source: outfitBackImage
        ? `${outfitFrontImage} and ${outfitBackImage} only`
        : `${outfitFrontImage} only`,
      prohibit: [...config.output.prohibit]
    }
  };
}
