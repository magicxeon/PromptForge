(function () {
  const VISUAL_CONTROL_FIELDS = [
    {
      key: "Face::Face Shape",
      group: "Face",
      field: "Face Shape",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/face-structure/face-shape/manifest.json",
      optionMap: {
        "face.shape.oval": "face.002",
        "face.shape.square": "face.005",
        "face.shape.round": "face.003",
        "face.shape.diamond": "face.006",
        "face.shape.rectangular": "face.018",
        "face.shape.heart": "face.004",
        "face.shape.inverted_triangular": "face.019",
        "face.shape.long": "face.020"
      }
    },
    {
      key: "Face::Eyes",
      group: "Face",
      field: "Eyes",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/eyes/manifest.json",
      optionMap: {
        "eyes.shape.almond": "eyes.001",
        "eyes.shape.monolid": "eyes.002",
        "eyes.shape.double_eyelids": "eyes.003",
        "eyes.shape.round": "eyes.004",
        "eyes.shape.phoenix": "eyes.005",
        "eyes.shape.doe": "eyes.006",
        "eyes.shape.puppy": "eyes.007",
        "eyes.shape.hooded": "eyes.008"
      }
    },
    {
      key: "Face::Eyebrows",
      group: "Face",
      field: "Eyebrows",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/eyebrows/manifest.json",
      optionMap: {
        "eyebrows.shape.straight": "eyebrows.001",
        "eyebrows.shape.soft_arched": "eyebrows.002",
        "eyebrows.shape.natural_thick": "eyebrows.003",
        "eyebrows.shape.thin": "eyebrows.004",
        "eyebrows.shape.defined": "eyebrows.005",
        "eyebrows.shape.well_groomed": "eyebrows.006",
        "eyebrows.shape.natural": "eyebrows.007"
      }
    },
    {
      key: "Face::Nose",
      group: "Face",
      field: "Nose",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/nose/manifest.json",
      optionMap: {
        "nose.shape.small_button": "nose.001",
        "nose.shape.high_bridge": "nose.002",
        "nose.shape.delicate_narrow": "nose.003",
        "nose.shape.soft_rounded_tip": "nose.004",
        "nose.shape.straight": "nose.005",
        "nose.shape.natural": "nose.006"
      }
    },
    {
      key: "Face::Lips",
      group: "Face",
      field: "Lips",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/lips/manifest.json",
      optionMap: {
        "lips.shape.natural": "lips.001",
        "lips.shape.cherry": "lips.002",
        "lips.shape.cupids_bow": "lips.003",
        "lips.shape.plump": "lips.004",
        "lips.shape.thin": "lips.005",
        "lips.shape.heart_shaped": "lips.010",
        "lips.shape.heavy_upper": "lips.011",
        "lips.shape.wide": "lips.012"
      }
    },
    {
      key: "Face::Expression",
      group: "Face",
      field: "Expression",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/expression/face-expression/manifest.json",
      optionMap: {
        "expression.face.subtle_micro": "expression.001",
        "expression.face.thoughtful": "expression.002",
        "expression.face.friendly_smile": "expression.004",
        "expression.face.gentle_laugh": "expression.003",
        "expression.face.playful_smirk": "expression.008",
        "expression.face.reflective_mood": "expression.010"
      }
    },
    {
      key: "Hair::Length",
      group: "Hair",
      field: "Length",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/length/manifest.json",
      optionMap: {
        "hair.length.buzz_cut": "hair_001",
        "hair.length.short": "hair_002",
        "hair.length.long": "hair_003",
        "hair.length.extra_long": "hair_004"
      }
    },
    {
      key: "Hair::Cut / Style",
      group: "Hair",
      field: "Cut / Style",
      controlType: "visual-card-picker",
      hideMissingAttributes: true,
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/cut-style/manifest.json",
      optionMap: {
        "hair.cut_style.ponytail": "hair_008",
        "hair.cut_style.messy_bun": "hair_009",
        "hair.cut_style.french_braid": "hair_010",
        "hair.cut_style.layered_hush_cut": "hair_022",
        "hair.cut_style.long_loose_waves": "hair_023",
        "hair.cut_style.side_swept": "hair_024",
        "hair.cut_style.wet_look": "hair_025",
        "hair.cut_style.wolf_cut": "hair_026",
        "hair.cut_style.crew_cut": "hair_029",
        "hair.cut_style.side_part": "hair_030",
        "hair.cut_style.undercut": "hair_031",
        "hair.cut_style.pompadour": "hair_032",
        "hair.cut_style.quiff": "hair_033",
        "hair.cut_style.textured_crop": "hair_034",
        "hair.cut_style.caesar_cut": "hair_035",
        "hair.cut_style.short_curly_crop": "hair_036"
      }
    },
    {
      key: "Hair::Texture",
      group: "Hair",
      field: "Texture",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/texture/manifest.json",
      optionMap: {
        "hair.texture.silky_smooth": "hair.text_01",
        "hair.texture.coarse_thick": "hair.text_02",
        "hair.texture.soft_glossy_waves": "hair.text_03",
        "hair.texture.frizzy_voluminous": "hair.text_04"
      }
    },
    {
      key: "Hair::Parting / Fringe",
      group: "Hair",
      field: "Parting / Fringe",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/parting-fringe/manifest.json",
      optionMap: {
        "hair.parting_fringe.center_part": "hair_037",
        "hair.parting_fringe.side_parting": "hair_038",
        "hair.parting_fringe.swept_back": "hair_039",
        "hair.parting_fringe.curtain_bangs": "hair_011",
        "hair.parting_fringe.blunt_bangs": "hair_012",
        "hair.parting_fringe.see_through_bangs": "hair_027"
      }
    },
    {
      key: "Hair::Color",
      group: "Hair",
      field: "Color",
      controlType: "swatch-picker",
      optionMap: {
        "hair.color.jet_black": "hair_013",
        "hair.color.dark_brown": "hair_014",
        "hair.color.platinum_blonde": "hair_015",
        "hair.color.copper": "hair_016",
        "hair.color.reddish_orange": "hair_021",
        "hair.color.reddish_brown": "hair_040",
        "hair.color.dark_blond": "hair_041",
        "hair.color.reddish_mahogany": "hair_042",
        "hair.color.burgundy": "hair_043",
        "hair.color.red_wine": "hair_044",
        "hair.color.golden_blond": "hair_045",
        "hair.color.golden_brown": "hair_046",
        "hair.color.chocolate_brown": "hair_047",
        "hair.color.ash_blond": "hair_048",
        "hair.color.grey": "hair_049",
        "hair.color.ash_green_blond": "hair_050",
        "hair.color.intense_blue": "hair_051"
      },
      items: [
        {
          optionId: "hair.color.jet_black",
          slug: "jet-black",
          swatch: { colors: ["#050505", "#242424"] },
          alt: { en: "Jet black hair color swatch", th: "Jet black hair color swatch" }
        },
        {
          optionId: "hair.color.dark_brown",
          slug: "dark-brown",
          swatch: { colors: ["#2a1710", "#5a3323"] },
          alt: { en: "Dark brown hair color swatch", th: "Dark brown hair color swatch" }
        },
        {
          optionId: "hair.color.platinum_blonde",
          slug: "platinum-blonde",
          swatch: { colors: ["#f5efd8", "#d8c99c"] },
          alt: { en: "Platinum blonde hair color swatch", th: "Platinum blonde hair color swatch" }
        },
        {
          optionId: "hair.color.copper",
          slug: "copper",
          swatch: { colors: ["#a94718", "#d87a2c"] },
          alt: { en: "Copper hair color swatch", th: "Copper hair color swatch" }
        },
        {
          optionId: "hair.color.reddish_orange",
          slug: "reddish-orange",
          swatch: { colors: ["#b72d1a", "#f26a2e"] },
          alt: { en: "Reddish-orange hair color swatch", th: "Reddish-orange hair color swatch" }
        },
        {
          optionId: "hair.color.reddish_brown",
          slug: "reddish-brown",
          swatch: { colors: ["#6b2d20", "#b75a3a"] },
          alt: { en: "Reddish brown hair color swatch", th: "Reddish brown hair color swatch" }
        },
        {
          optionId: "hair.color.dark_blond",
          slug: "dark-blond",
          swatch: { colors: ["#5b4327", "#9b7442"] },
          alt: { en: "Dark blond hair color swatch", th: "Dark blond hair color swatch" }
        },
        {
          optionId: "hair.color.reddish_mahogany",
          slug: "reddish-mahogany",
          swatch: { colors: ["#4b1820", "#8c3c45"] },
          alt: { en: "Reddish mahogany hair color swatch", th: "Reddish mahogany hair color swatch" }
        },
        {
          optionId: "hair.color.burgundy",
          slug: "burgundy",
          swatch: { colors: ["#321021", "#6f2147"] },
          alt: { en: "Burgundy hair color swatch", th: "Burgundy hair color swatch" }
        },
        {
          optionId: "hair.color.red_wine",
          slug: "red-wine",
          swatch: { colors: ["#5e0710", "#b31325"] },
          alt: { en: "Red wine hair color swatch", th: "Red wine hair color swatch" }
        },
        {
          optionId: "hair.color.golden_blond",
          slug: "golden-blond",
          swatch: { colors: ["#e8b95e", "#ffe2a0"] },
          alt: { en: "Golden blond hair color swatch", th: "Golden blond hair color swatch" }
        },
        {
          optionId: "hair.color.golden_brown",
          slug: "golden-brown",
          swatch: { colors: ["#8a4f22", "#d89a4f"] },
          alt: { en: "Golden brown hair color swatch", th: "Golden brown hair color swatch" }
        },
        {
          optionId: "hair.color.chocolate_brown",
          slug: "chocolate-brown",
          swatch: { colors: ["#21120f", "#58352d"] },
          alt: { en: "Chocolate brown hair color swatch", th: "Chocolate brown hair color swatch" }
        },
        {
          optionId: "hair.color.ash_blond",
          slug: "ash-blond",
          swatch: { colors: ["#817866", "#c2b899"] },
          alt: { en: "Ash blond hair color swatch", th: "Ash blond hair color swatch" }
        },
        {
          optionId: "hair.color.grey",
          slug: "grey",
          swatch: { colors: ["#8c9298", "#d7dce0"] },
          alt: { en: "Grey hair color swatch", th: "Grey hair color swatch" }
        },
        {
          optionId: "hair.color.ash_green_blond",
          slug: "ash-green-blond",
          swatch: { colors: ["#56604a", "#a9ad77"] },
          alt: { en: "Ash green blond hair color swatch", th: "Ash green blond hair color swatch" }
        },
        {
          optionId: "hair.color.intense_blue",
          slug: "intense-blue",
          swatch: { colors: ["#07153f", "#284b9d"] },
          alt: { en: "Intense blue hair color swatch", th: "Intense blue hair color swatch" }
        }
      ]
    },
    {
      key: "Skin::Tone",
      group: "Skin",
      field: "Tone",
      controlType: "swatch-picker",
      optionMap: {
        "skin.tone.fair": "skin.tone_01",
        "skin.tone.porcelain": "skin.tone_02",
        "skin.tone.honey": "skin.tone_03",
        "skin.tone.warm_olive": "skin.tone_04",
        "skin.tone.rosy_fair": "skin.tone_05",
        "skin.tone.translucent_glass": "skin.tone_06",
        "skin.tone.milky_white": "skin.tone_07",
        "skin.tone.ivory_white": "skin.tone_08",
        "skin.tone.aura_glowing_white": "skin.tone_09"
      },
      items: [
        {
          optionId: "skin.tone.fair",
          slug: "fair",
          swatch: { colors: ["#f0c7ad", "#f8dcc9"] },
          alt: { en: "Fair skin tone swatch", th: "Fair skin tone swatch" }
        },
        {
          optionId: "skin.tone.porcelain",
          slug: "porcelain",
          swatch: { colors: ["#f7d8c8", "#fff0e7"] },
          alt: { en: "Porcelain skin tone swatch", th: "Porcelain skin tone swatch" }
        },
        {
          optionId: "skin.tone.honey",
          slug: "honey",
          swatch: { colors: ["#b97945", "#dca66e"] },
          alt: { en: "Honey skin tone swatch", th: "Honey skin tone swatch" }
        },
        {
          optionId: "skin.tone.warm_olive",
          slug: "warm-olive",
          swatch: { colors: ["#9b6d4c", "#c1956b"] },
          alt: { en: "Warm olive skin tone swatch", th: "Warm olive skin tone swatch" }
        },
        {
          optionId: "skin.tone.rosy_fair",
          slug: "rosy-fair",
          swatch: { colors: ["#edbba9", "#ffd5cc"] },
          alt: { en: "Rosy fair skin tone swatch", th: "Rosy fair skin tone swatch" }
        },
        {
          optionId: "skin.tone.translucent_glass",
          slug: "translucent-glass",
          swatch: { colors: ["#f5cbbb", "#fff6ee"] },
          alt: { en: "Translucent glass skin tone swatch", th: "Translucent glass skin tone swatch" }
        },
        {
          optionId: "skin.tone.milky_white",
          slug: "milky-white",
          swatch: { colors: ["#f1d1bd", "#fff0df"] },
          alt: { en: "Milky white skin tone swatch", th: "Milky white skin tone swatch" }
        },
        {
          optionId: "skin.tone.ivory_white",
          slug: "ivory-white",
          swatch: { colors: ["#e7c5a9", "#f8e6d1"] },
          alt: { en: "Ivory white skin tone swatch", th: "Ivory white skin tone swatch" }
        },
        {
          optionId: "skin.tone.aura_glowing_white",
          slug: "aura-glowing-white",
          swatch: { colors: ["#f3c9b8", "#fff8f1"] },
          alt: { en: "Aura glowing white skin tone swatch", th: "Aura glowing white skin tone swatch" }
        }
      ]
    },
    {
      key: "Skin::Skin Texture",
      group: "Skin",
      field: "Skin Texture",
      controlType: "swatch-picker",
      optionMap: {
        "skin.texture.natural": "skin.text_01",
        "skin.texture.dewy": "skin.text_02",
        "skin.texture.healthy": "skin.text_03",
        "skin.texture.even": "skin.text_04",
        "skin.texture.soft": "skin.text_05",
        "skin.texture.radiant_flash": "skin.text_06"
      },
      items: [
        {
          optionId: "skin.texture.natural",
          slug: "natural",
          swatch: { colors: ["#dca383", "#f1c7ad"], pattern: "pores" },
          alt: { en: "Natural skin texture swatch", th: "Natural skin texture swatch" }
        },
        {
          optionId: "skin.texture.dewy",
          slug: "dewy",
          swatch: { colors: ["#e4aa8f", "#ffe0cf"], pattern: "dewy" },
          alt: { en: "Dewy complexion texture swatch", th: "Dewy complexion texture swatch" }
        },
        {
          optionId: "skin.texture.healthy",
          slug: "healthy",
          swatch: { colors: ["#d59072", "#f3bca2"], pattern: "healthy" },
          alt: { en: "Healthy complexion texture swatch", th: "Healthy complexion texture swatch" }
        },
        {
          optionId: "skin.texture.even",
          slug: "even",
          swatch: { colors: ["#d9a184", "#f0c7ad"], pattern: "even" },
          alt: { en: "Even skin tone texture swatch", th: "Even skin tone texture swatch" }
        },
        {
          optionId: "skin.texture.soft",
          slug: "soft",
          swatch: { colors: ["#e2ad96", "#fad7c8"], pattern: "soft" },
          alt: { en: "Soft smooth skin texture swatch", th: "Soft smooth skin texture swatch" }
        },
        {
          optionId: "skin.texture.radiant_flash",
          slug: "radiant-flash",
          swatch: { colors: ["#ebb59d", "#fff1e7"], pattern: "radiant" },
          alt: { en: "Radiant smooth flash skin texture swatch", th: "Radiant smooth flash skin texture swatch" }
        }
      ]
    },
    {
      key: "Skin::Makeup",
      group: "Skin",
      field: "Makeup",
      controlType: "swatch-picker",
      optionMap: {
        "skin.makeup.natural": "skin.makeup_01",
        "skin.makeup.soft_k_beauty": "skin.makeup_02",
        "skin.makeup.red_lips": "skin.makeup_03",
        "skin.makeup.gold_shimmer": "skin.makeup_04"
      },
      items: [
        {
          optionId: "skin.makeup.natural",
          slug: "natural",
          swatch: { colors: ["#d7a088", "#f3c8b8"], pattern: "makeup-natural" },
          alt: { en: "Natural no-makeup look swatch", th: "Natural no-makeup look swatch" }
        },
        {
          optionId: "skin.makeup.soft_k_beauty",
          slug: "soft-k-beauty",
          swatch: { colors: ["#e7a28f", "#ffd2c8"], pattern: "makeup-peach" },
          alt: { en: "Soft K-beauty makeup swatch", th: "Soft K-beauty makeup swatch" }
        },
        {
          optionId: "skin.makeup.red_lips",
          slug: "red-lips",
          swatch: { colors: ["#c93b35", "#f0b7a5"], pattern: "makeup-red-lips" },
          alt: { en: "Editorial red lips makeup swatch", th: "Editorial red lips makeup swatch" }
        },
        {
          optionId: "skin.makeup.gold_shimmer",
          slug: "gold-shimmer",
          swatch: { colors: ["#b9822f", "#ffe0a3"], pattern: "makeup-gold" },
          alt: { en: "Gold shimmer eyeshadow makeup swatch", th: "Gold shimmer eyeshadow makeup swatch" }
        }
      ]
    },
    {
      key: "Skin::Freckles",
      group: "Skin",
      field: "Freckles",
      controlType: "swatch-picker",
      optionMap: {
        "skin.freckles.none": "skin.freckles_01",
        "skin.freckles.subtle": "skin.freckles_02",
        "skin.freckles.prominent": "skin.freckles_03"
      },
      items: [
        {
          optionId: "skin.freckles.none",
          slug: "no-freckles",
          swatch: { colors: ["#dea58b", "#f5cab4"], pattern: "freckles-none" },
          alt: { en: "No freckles swatch", th: "No freckles swatch" }
        },
        {
          optionId: "skin.freckles.subtle",
          slug: "subtle-freckles",
          swatch: { colors: ["#dda185", "#f4c5ad"], pattern: "freckles-subtle" },
          alt: { en: "Subtle light freckles swatch", th: "Subtle light freckles swatch" }
        },
        {
          optionId: "skin.freckles.prominent",
          slug: "prominent-freckles",
          swatch: { colors: ["#d89a7d", "#efb99e"], pattern: "freckles-prominent" },
          alt: { en: "Prominent natural freckles swatch", th: "Prominent natural freckles swatch" }
        }
      ]
    },
    {
      key: "Body::Body Silhouette",
      group: "Body",
      field: "Body Silhouette",
      controlType: "visual-card-picker",
      layoutClass: "visual-option-picker-large-carousel",
      cardClass: "visual-option-card-large-carousel",
      showScrollControls: true,
      manifestUrl: "/assets/visual-character-builder/character-sheet-v1/body/body-silhouette/manifest.json",
      manifestVariants: {
        female: "/assets/visual-character-builder/character-sheet-v1/body/body-silhouette-female/manifest.json",
        male: "/assets/visual-character-builder/character-sheet-v1/body/body-silhouette-male/manifest.json"
      }
    }
  ];

  async function loadManifests({ fetchImpl = window.fetch } = {}) {
    const fieldsByKey = Object.fromEntries(VISUAL_CONTROL_FIELDS.map(config => [config.key, config]));
    const manifestRequests = VISUAL_CONTROL_FIELDS.flatMap(config => {
      if (config.items?.length) {
        return [[config.key, config, null]];
      }
      const requests = [[config.key, config, config.manifestUrl]];
      Object.entries(config.manifestVariants || {}).forEach(([variantKey, manifestUrl]) => {
        requests.push([getVariantManifestKey(config.key, variantKey), config, manifestUrl]);
      });
      return requests;
    });
    const manifestEntries = await Promise.all(manifestRequests.map(async ([manifestKey, config, manifestUrl]) => {
      if (config.items?.length && !manifestUrl) {
        return [manifestKey, { items: config.items }];
      }
      try {
        const response = await fetchImpl(manifestUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return [manifestKey, await response.json()];
      } catch (error) {
        console.warn(`Visual option manifest unavailable for ${manifestKey}:`, error.message);
        return [manifestKey, null];
      }
    }));
    return {
      fieldsByKey,
      manifestsByKey: Object.fromEntries(manifestEntries.filter(([, manifest]) => manifest))
    };
  }

  function createVisualOptionPicker({
    groupName,
    fieldName,
    select,
    filteredOptions,
    manifestsByKey,
    fieldsByKey,
    language,
    getLocalizedLabel
  }) {
    const key = getVisualManifestKey(groupName, fieldName);
    const config = fieldsByKey[key];
    const manifest = manifestsByKey[getActiveManifestKey(key, config, manifestsByKey)] || manifestsByKey[key];
    if (!manifest?.items?.length) return null;

    const optionById = new Map(filteredOptions.map(option => [option.id, option]));
    const picker = document.createElement("div");
    picker.className = "visual-option-picker";
    picker.dataset.controlType = config?.controlType || "visual-card-picker";
    if (config?.layoutClass) picker.classList.add(...config.layoutClass.split(/\s+/).filter(Boolean));
    picker.setAttribute("role", "radiogroup");
    picker.setAttribute("aria-label", fieldName);
    picker.dataset.field = fieldName;
    picker.dataset.group = groupName;

    manifest.items.forEach(item => {
      const attributeId = config?.optionMap?.[item.optionId] || item.attributeId || item.optionId;
      const attribute = optionById.get(attributeId);
      if (config?.hideMissingAttributes && !attribute) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-option-card";
      if (config?.cardClass) button.classList.add(...config.cardClass.split(/\s+/).filter(Boolean));
      if (!attribute) button.classList.add("missing-attribute");
      button.dataset.value = attributeId || "";
      button.dataset.optionId = item.optionId;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");
      button.title = item.alt?.[language] || item.alt?.en || getLocalizedLabel(attribute?.label) || item.slug;

      const icon = document.createElement("span");
      icon.className = "visual-option-icon";
      const iconUrl = config?.assetProfile
        ? (item.assets?.[config.assetProfile] || item.assets?.preview || item.assets?.thumb)
        : (item.assets?.thumb || item.assets?.preview);
      if (item.swatch?.colors?.length) {
        button.classList.add("swatch-option");
        const [firstColor, secondColor = firstColor] = item.swatch.colors;
        icon.classList.add("visual-option-swatch");
        if (item.swatch.pattern) {
          icon.classList.add(`visual-option-swatch-${item.swatch.pattern}`);
        }
        icon.style.setProperty("--swatch-primary", firstColor);
        icon.style.setProperty("--swatch-secondary", secondColor);
      } else if (iconUrl) {
        icon.style.setProperty("--visual-option-url", `url("${iconUrl}")`);
      } else {
        button.classList.add("missing-asset");
      }
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "visual-option-label";
      label.textContent = getLocalizedLabel(attribute?.label) || item.slug || item.optionId;

      button.appendChild(icon);
      button.appendChild(label);
      button.addEventListener("click", () => {
        selectVisualOption(select, attributeId);
      });
      picker.appendChild(button);
    });

    picker.addEventListener("keydown", event => handleVisualPickerKeydown(event, picker, select));
    if (picker.children.length === 0) return null;
    if (!config?.showScrollControls) return picker;
    return createVisualCarouselShell(picker, fieldName);
  }

  function createVisualCarouselShell(picker, fieldName) {
    const shell = document.createElement("div");
    shell.className = "visual-option-carousel-shell";
    shell.dataset.field = fieldName;

    const previousButton = createVisualCarouselButton("previous", "‹", `Scroll ${fieldName} options left`);
    const nextButton = createVisualCarouselButton("next", "›", `Scroll ${fieldName} options right`);

    previousButton.addEventListener("click", () => scrollVisualCarousel(picker, -1));
    nextButton.addEventListener("click", () => scrollVisualCarousel(picker, 1));

    shell.appendChild(previousButton);
    shell.appendChild(picker);
    shell.appendChild(nextButton);
    refreshVisualCarouselButtons(picker, previousButton, nextButton);
    picker.addEventListener("scroll", () => refreshVisualCarouselButtons(picker, previousButton, nextButton), { passive: true });
    window.addEventListener("resize", () => refreshVisualCarouselButtons(picker, previousButton, nextButton), { passive: true });
    return shell;
  }

  function createVisualCarouselButton(direction, label, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `visual-option-carousel-button visual-option-carousel-button-${direction}`;
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    return button;
  }

  function scrollVisualCarousel(picker, direction) {
    const distance = Math.max(180, Math.floor(picker.clientWidth * 0.78));
    picker.scrollBy({ left: distance * direction, behavior: "smooth" });
  }

  function refreshVisualCarouselButtons(picker, previousButton, nextButton) {
    const maxScroll = Math.max(0, picker.scrollWidth - picker.clientWidth);
    previousButton.disabled = picker.scrollLeft <= 2;
    nextButton.disabled = picker.scrollLeft >= maxScroll - 2;
  }

  function syncVisualPickers(root = document) {
    root.querySelectorAll(".visual-option-picker").forEach(picker => {
      const select = getSelectForVisualPicker(picker, root);
      const activeValue = select?.value || "";
      const disabled = Boolean(select?.disabled);
      const selectableButtons = Array.from(picker.querySelectorAll(".visual-option-card")).filter(button => button.dataset.value);
      const selectedIndex = selectableButtons.findIndex(button => button.dataset.value === activeValue);
      picker.querySelectorAll(".visual-option-card").forEach(button => {
        const isActive = button.dataset.value === activeValue;
        const fallbackFocus = selectedIndex === -1 && button === selectableButtons[0];
        button.classList.toggle("active", isActive);
        button.disabled = disabled || !button.dataset.value;
        button.tabIndex = isActive || fallbackFocus ? 0 : -1;
        button.setAttribute("aria-checked", String(isActive));
        button.setAttribute("aria-disabled", String(button.disabled));
      });
    });
  }

  function selectVisualOption(select, value) {
    if (!select || select.disabled || !value) return;
    const option = Array.from(select.options).find(item => item.value === value);
    if (!option || option.disabled) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus({ preventScroll: true });
  }

  function handleVisualPickerKeydown(event, picker, select) {
    const navigationKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Enter", " "];
    if (!navigationKeys.includes(event.key)) return;
    const buttons = Array.from(picker.querySelectorAll(".visual-option-card:not(:disabled)"))
      .filter(button => button.dataset.value);
    if (buttons.length === 0) return;
    const activeIndex = Math.max(0, buttons.findIndex(button => button.classList.contains("active") || button === document.activeElement));
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = Math.min(buttons.length - 1, activeIndex + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = Math.max(0, activeIndex - 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    if (event.key === "Enter" || event.key === " ") {
      selectVisualOption(select, document.activeElement?.dataset?.value || buttons[activeIndex]?.dataset.value);
      event.preventDefault();
      return;
    }

    buttons[nextIndex]?.focus({ preventScroll: true });
    event.preventDefault();
  }

  function getSelectForVisualPicker(picker, root = document) {
    return Array.from(root.querySelectorAll("#form-container .custom-select")).find(select =>
      select.getAttribute("data-field") === picker.dataset.field &&
      select.getAttribute("data-group") === picker.dataset.group
    );
  }

  function getVisualManifestKey(groupName, fieldName) {
    return `${groupName}::${fieldName}`;
  }

  function getVariantManifestKey(fieldKey, variantKey) {
    return `${fieldKey}::${variantKey}`;
  }

  function getActiveManifestKey(fieldKey, config, manifestsByKey) {
    const variantKey = getGenderVisualVariantKey();
    if (!variantKey || !config?.manifestVariants?.[variantKey]) return fieldKey;
    const manifestKey = getVariantManifestKey(fieldKey, variantKey);
    return manifestsByKey[manifestKey] ? manifestKey : fieldKey;
  }

  function getGenderVisualVariantKey() {
    const selection = window.state?.selections?.Gender;
    const value = `${selection?.id || ""} ${selection?.value || ""}`.toLowerCase();
    if (value.includes("female") || value.includes("woman")) return "female";
    if (value.includes("male") || value.includes("man")) return "male";
    return null;
  }

  function registerFields(newFields) {
    VISUAL_CONTROL_FIELDS.push(...newFields);
  }

  window.ModelPromptForgeVisualOptionControls = {
    loadManifests,
    createVisualOptionPicker,
    syncVisualPickers,
    registerFields
  };
})();
