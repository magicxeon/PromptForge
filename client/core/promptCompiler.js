/**
 * ModelPromptForge - Prompt Compiler Module
 */
(() => {
  const state = window.state;
  const getLocalizedLabel = window.getLocalizedLabel;

  function getPromptValueForSelection(selection, fieldName) {
    if (!selection) return "";
    let baseVal = "";
    if (selection.isCustom) {
      baseVal = selection.value;
    } else {
      const item = state.library.find(libItem => libItem.id === selection.id);
      if (!item || !item.prompt) {
        baseVal = selection.value;
      } else {
        const toggleGptSafe = document.getElementById("toggle-gpt-safe");
        const isGptSafe = toggleGptSafe ? toggleGptSafe.checked : false;

        if (isGptSafe) {
          baseVal = item.prompt["gpt-image-safe"] || item.prompt["gpt-image"] || item.prompt.default;
        } else {
          baseVal = item.prompt["gpt-image"] || item.prompt.default;
        }
      }
    }

    // Inject custom color picker info (Step 11)
    if (fieldName && state.customColors && state.customColors[fieldName]) {
      const cfg = state.customColors[fieldName];
      if (fieldName === "Color") {
        if (cfg.enabled || cfg.highlightEnabled) {
          let parts = [];
          if (baseVal && baseVal.trim() !== "") {
            parts.push(baseVal);
          } else {
            parts.push("hair");
          }
          if (cfg.enabled) {
            parts.push(`colored in ${cfg.base}`);
          }
          if (cfg.highlightEnabled) {
            parts.push(`accented with custom highlights in ${cfg.highlight}`);
          }
          return parts.join(", ");
        }
      } else {
        if (cfg.enabled && baseVal && baseVal.trim() !== "") {
          return `${baseVal} colored in ${cfg.color}`;
        }
      }
    }

    return baseVal;
  }

  function splitPromptPhrases(value) {
    return String(value || "")
      .split(",")
      .map(part => part.trim())
      .filter(Boolean);
  }

  function uniquePromptParts(parts) {
    const seen = new Set();
    return parts.filter(part => {
      const key = part.toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeIdentityPhrase(value, fieldName) {
    let normalized = String(value || "").trim();
    if (fieldName === "Gender") {
      normalized = normalized
        .replace(/\bfemale woman\b/gi, "female")
        .replace(/\bmale man\b/gi, "male");
    }
    if (fieldName === "Age") {
      normalized = normalized.replace(/,\s*\d{1,3}\s*years?\s*old\b/gi, "");
    }
    return normalized;
  }

  function normalizeHairPhrase(value) {
    return String(value || "")
      .replace(/long loose waves,\s*beach waves hair,\s*flowing naturally/gi, "long loose wavy hair")
      .replace(/perfectly groomed strands with soft healthy highlights and natural flow/gi, "polished natural hair flow")
      .replace(/soft glossy hair waves,\s*displaying brilliant specular light reflections off healthy luminous waves/gi, "soft glossy waves")
      .replace(/soft glossy texture waves,\s*displaying brilliant specular light reflections off healthy luminous waves/gi, "soft glossy waves")
      .replace(/coarse and thick hair texture,\s*highly detailed individual strands with strong volume and organic feel/gi, "coarse thick texture")
      .replace(/frizzy and voluminous hair texture,\s*with soft flyaways and highly detailed organic curl structures/gi, "frizzy voluminous texture")
      .replace(/\bsilky smooth hair\b/gi, "silky smooth texture")
      .replace(/\bglossy healthy hair\b/gi, "glossy healthy finish")
      .trim();
  }

  function getHairAdjective(value) {
    return String(value || "").replace(/\s*hair\b/i, "").trim();
  }

  function compactHairSegment(valuesByField) {
    const length = normalizeHairPhrase(valuesByField["Length"]);
    const legacyStyle = normalizeHairPhrase(valuesByField["Style"]);
    const cutStyle = normalizeHairPhrase(valuesByField["Cut / Style"]);
    const parting = normalizeHairPhrase(valuesByField["Parting / Fringe"]);
    const color = normalizeHairPhrase(valuesByField["Color"]);
    const texture = normalizeHairPhrase(valuesByField["Texture"]);
    const finish = normalizeHairPhrase(valuesByField["Finish"]);
    const lengthAdjective = getHairAdjective(length);
    const colorAdjective = getHairAdjective(color);

    let base = cutStyle || legacyStyle || length || "";
    if (length && base && lengthAdjective && !base.toLowerCase().includes(lengthAdjective.toLowerCase())) {
      base = `${length}, ${base}`;
    }
    if (color && base) {
      if (colorAdjective && !base.toLowerCase().includes(colorAdjective.toLowerCase())) {
        if (/\bcrew cut hairstyle\b/i.test(base)) {
          base = base.replace(/\bcrew cut hairstyle\b/i, `${colorAdjective} crew cut hairstyle`);
        } else if (/\bhairstyle\b/i.test(base)) {
          base = base.replace(/\bhairstyle\b/i, `${colorAdjective} hairstyle`);
        } else if (/\bhair\b/i.test(base)) {
          base = base.replace(/\bhair\b/i, `${colorAdjective} hair`);
        } else {
          base = `${base}, ${color}`;
        }
      }
    } else if (color && !base) {
      base = color;
    }

    const textureDetail = texture
      ? texture.replace(/\s*hair\b/i, " texture").replace(/\s*texture\s*texture\b/i, " texture")
      : "";
    const finishDetail = finish
      ? finish.replace(/\s*hair\b/i, " finish").replace(/\s*finish\s*finish\b/i, " finish")
      : "";

    return uniquePromptParts([base, parting, textureDetail, finishDetail].filter(Boolean)).join(", ");
  }

  function sanitizeHeadshotExpression(value) {
    return String(value || "")
      .replace(/soft daydreaming look,\s*eyes looking slightly away from the camera,\s*/gi, "soft daydreaming look with ")
      .replace(/eyes intently focused on something off-camera with relaxed features/gi, "focused eyes with relaxed facial features")
      .replace(/eyes looking slightly away from the camera/gi, "soft relaxed eyes")
      .replace(/head tilted slightly,\s*/gi, "")
      .replace(/\bsomething off-camera\b/gi, "the camera")
      .replace(/\boff-camera\b/gi, "direct-camera")
      .replace(/\blooking away\b/gi, "looking directly")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim();
  }

  function compactExpressionSegment(valuesByField) {
    const smile = valuesByField["Smile"] || "";
    const expression = sanitizeHeadshotExpression(valuesByField["Expression"] || "");
    const smileLower = smile.toLowerCase();
    const expressionLower = expression.toLowerCase();

    if (expressionLower.includes("subtle warm friendly smile")) {
      return smile && !smileLower.includes("neutral expression")
        ? "subtle friendly expression with soft smile"
        : "subtle friendly expression with relaxed lips";
    }
    if (expression) return expression;
    return sanitizeHeadshotExpression(smile);
  }

  function compactSkinSegment(valuesByField) {
    const tone = valuesByField["Tone"] || "";
    const texture = valuesByField["Skin Texture"] || "";
    const makeup = valuesByField["Makeup"] || "";
    const freckles = valuesByField["Freckles"] || "";
    const beauty = valuesByField["Beauty"] || "";

    const hasNaturalBeauty = /natural face|natural look|minimal makeup|zero or minimal makeup/i.test(beauty);
    const hasNoMakeup = /no makeup|bare face|natural look/i.test(makeup);
    const hasNaturalTexture = /natural skin texture|visible.*pores|skin pores|fine details/i.test(texture);
    const hasHealthyTexture = /healthy skin complexion|healthy complexion|organic skin details/i.test(texture);

    const parts = [];
    if (tone) parts.push(tone);
    if (hasNoMakeup || hasNaturalBeauty) {
      if (hasNaturalTexture) {
        parts.push("natural bare-face look with realistic skin texture and visible fine pores");
      } else if (hasHealthyTexture) {
        parts.push("natural bare-face look with healthy organic skin details");
      } else {
        parts.push("natural bare-face look with authentic facial details");
      }
    } else if (texture) {
      parts.push(texture);
    }
    if (!hasNoMakeup && makeup) parts.push(makeup);
    if (freckles && !/^even skin with no freckles$/i.test(freckles)) parts.push(freckles);
    return uniquePromptParts(parts).join(", ");
  }

  function buildCleanPromptSegments(activeSelections, getValue) {
    const valuesByField = {};
    Object.entries(activeSelections).forEach(([fieldName, selection]) => {
      if (selection.isDropped) return;
      const value = getValue(selection, fieldName);
      if (value && value.trim()) valuesByField[fieldName] = value.trim();
    });

    const identity = uniquePromptParts([
      normalizeIdentityPhrase(valuesByField["Gender"], "Gender"),
      normalizeIdentityPhrase(valuesByField["Age"], "Age"),
      normalizeIdentityPhrase(valuesByField["Ethnicity"], "Ethnicity"),
      /natural face|natural look|minimal makeup|zero or minimal makeup/i.test(valuesByField["Beauty"] || "")
        ? ""
        : valuesByField["Beauty"]
    ].filter(Boolean)).join(", ");

    const faceStructure = valuesByField["Face Shape"] || "";
    const facialFeatures = uniquePromptParts([
      valuesByField["Eyes"],
      valuesByField["Eyebrows"],
      valuesByField["Nose"],
      valuesByField["Lips"]
    ].filter(Boolean)).join(", ");

    return {
      identity,
      appearance: uniquePromptParts([
        faceStructure,
        facialFeatures,
        compactExpressionSegment(valuesByField)
      ].filter(Boolean)).join(", "),
      hair: compactHairSegment(valuesByField),
      skin: compactSkinSegment(valuesByField)
    };
  }

  function wrapPromptSegment(value, tokenClass, cleanTextOnly) {
    if (!value || !value.trim()) return "";
    return cleanTextOnly ? value : `<span class="${tokenClass}">${value}</span>`;
  }

  function enforceExclusionRules(selectedId) {
    const idsToExclude = new Set();
    const selectedItem = state.library.find(item => item.id === selectedId);
    if (selectedItem && selectedItem.exclusions) {
      selectedItem.exclusions.forEach(id => idsToExclude.add(id));
    }

    state.library.forEach(libItem => {
      if (libItem.id !== selectedId && libItem.exclusions && libItem.exclusions.includes(selectedId)) {
        idsToExclude.add(libItem.id);
      }
    });

    if (idsToExclude.size === 0) return;

    idsToExclude.forEach(excludedId => {
      const conflictingField = Object.keys(state.selections).find(
        fieldName => state.selections[fieldName].id === excludedId
      );

      if (!conflictingField) return;

      const conflictingGroup = state.selections[conflictingField].group;
      delete state.selections[conflictingField];

      const conflictingSelect = document.querySelector(
        `#form-container .custom-select[data-field="${conflictingField}"]`
      );
      if (conflictingSelect) {
        conflictingSelect.value = "";
        const formField = conflictingSelect.closest(".form-field");
        if (formField) {
          const customInput = formField.querySelector(".custom-writein-input");
          if (customInput) {
            customInput.value = "";
            customInput.style.display = "none";
          }
          formField.classList.remove("conflict-cleared");
          void formField.offsetWidth;
          formField.classList.add("conflict-cleared");
          formField.addEventListener("animationend", () => {
            formField.classList.remove("conflict-cleared");
          }, { once: true });
        }
      }
      updateAccordionSummaryBadges(conflictingGroup);
    });
  }

  function updateDropdownExclusions() {
    const selectedIds = new Set();
    Object.values(state.selections).forEach(sel => {
      if (!sel.isCustom) selectedIds.add(sel.id);
    });

    const activeExclusions = new Set();
    selectedIds.forEach(selId => {
      const item = state.library.find(li => li.id === selId);
      if (item && item.exclusions) {
        item.exclusions.forEach(exId => activeExclusions.add(exId));
      }
    });

    state.library.forEach(libItem => {
      if (libItem.exclusions && libItem.exclusions.some(exId => selectedIds.has(exId))) {
        activeExclusions.add(libItem.id);
      }
    });

    selectedIds.forEach(id => activeExclusions.delete(id));

    document.querySelectorAll("#form-container .custom-select").forEach(select => {
      Array.from(select.options).forEach(option => {
        if (option.value === "" || option.value === "__custom__") return;
        const originalText = option.getAttribute("data-original-text") || option.textContent;

        if (activeExclusions.has(option.value)) {
          option.disabled = true;
          option.textContent = `🚫 ${originalText}`;
          option.classList.add("option-conflicted");
        } else {
          option.disabled = false;
          option.textContent = originalText;
          option.classList.remove("option-conflicted");
        }
      });
    });
  }

  function updateAccordionSummaryBadges(groupName) {
    const badgeId = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    const selectedInGroup = Object.keys(state.selections)
      .filter(key => state.selections[key].group === groupName)
      .map(key => getPromptValueForSelection(state.selections[key], key))
      .filter(val => val && val.trim() !== "");

    if (selectedInGroup.length > 0) {
      badge.textContent = selectedInGroup.join(", ");
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  function resolveTagConflicts(activeSelections) {
    const items = [];
    for (const fieldName in activeSelections) {
      const sel = activeSelections[fieldName];
      if (sel.isCustom) continue;
      const libItem = state.library.find(li => li.id === sel.id);
      if (libItem && libItem.tags) {
        items.push({
          fieldName,
          category: libItem.category,
          tags: libItem.tags.map(t => t.toLowerCase()),
          priority: window.CATEGORY_PRIORITIES[libItem.category.toLowerCase()] || 0
        });
      }
    }

    window.TAG_CONFLICT_RULES.forEach(rulePair => {
      const [tagA, tagB] = rulePair;
      const itemsA = items.filter(i => i.tags.includes(tagA) && !activeSelections[i.fieldName].isDropped);
      const itemsB = items.filter(i => i.tags.includes(tagB) && !activeSelections[i.fieldName].isDropped);

      if (itemsA.length > 0 && itemsB.length > 0) {
        const maxPriA = Math.max(...itemsA.map(i => i.priority));
        const maxPriB = Math.max(...itemsB.map(i => i.priority));

        if (maxPriA >= maxPriB) {
          itemsB.forEach(i => {
            activeSelections[i.fieldName].isDropped = true;
            activeSelections[i.fieldName].droppedReason = `Dropped: conflicts with '${tagA}'`;
          });
        } else {
          itemsA.forEach(i => {
            activeSelections[i.fieldName].isDropped = true;
            activeSelections[i.fieldName].droppedReason = `Dropped: conflicts with '${tagB}'`;
          });
        }
      }
    });
  }

  function generatePromptText(cleanTextOnly = false) {
    const currentTemplateName = document.getElementById("template-select").value || "portrait";
    const templateStr = state.templates[currentTemplateName];

    const activeSelections = window.getModeCompatibleSelections(state.selections, state.mode);
    if (window.applyReferenceAuthorityToSelections) window.applyReferenceAuthorityToSelections(activeSelections);
    const referenceOwnsAppearance = window.isStoryCharacterReferenceActive && window.isStoryCharacterReferenceActive() && !state.characterReferenceOverrides;

    // Dynamically inject selections for active custom color pickers if empty (Step 11)
    if (!referenceOwnsAppearance && window.isGroupAllowedForMode && window.isGroupAllowedForMode("Hair") && state.customColors && state.customColors["Color"] && (state.customColors["Color"].enabled || state.customColors["Color"].highlightEnabled)) {
      if (!activeSelections["Color"]) {
        activeSelections["Color"] = {
          id: "",
          value: "",
          isCustom: false,
          group: "Hair",
          category: "hair",
          tags: []
        };
      }
    }
    ["Top", "Bottom", "Dress", "Shoes", "Product Type"].forEach(field => {
      if (!referenceOwnsAppearance && window.isGroupAllowedForMode && window.isGroupAllowedForMode("Clothing") && state.customColors && state.customColors[field] && state.customColors[field].enabled) {
        if (!activeSelections[field]) {
          activeSelections[field] = {
            id: "",
            value: field.toLowerCase(),
            isCustom: false,
            group: "Clothing",
            category: "clothing",
            tags: []
          };
        }
      }
    });

    resolveTagConflicts(activeSelections);

    const compileGroupSegment = (groupName, tokenClass) => {
      if (groupName.toLowerCase() === "face") {
        if (state.imageReferences.faceMatch) {
          const txt = "Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, and skin tone while allowing subtle natural variations from facial expression, camera perspective, lighting, and lens characteristics. Prioritize identity preservation over exact geometric matching.";
          return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
        }
      }
      if (groupName.toLowerCase() === "clothing") {
        if (state.mode === "character-sheet" && state.imageReferences.outfitReference) {
          const hasFront = Boolean(state.outfitReferenceImageFront);
          const hasBack = Boolean(state.outfitReferenceImageBack);
          if (hasFront && hasBack) {
            const txt = "matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, and visible details across all sheet views";
            return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
          }
          if (hasFront) {
            const txt = "matching the clothing outfit, garment silhouette, colors, and styling from the uploaded front outfit reference, inferring unseen back details naturally";
            return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
          }
        }
        if (state.imageReferences.styleMatch && !referenceOwnsAppearance) {
          const txt = "matching the style, colors, and clothing outfit from the original uploaded image";
          return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
        }
      }
      if (groupName.toLowerCase() === "pose") {
        if (state.imageReferences.poseMatch) {
          const txt = "with the identical posing and image composition as the original uploaded file";
          return cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`;
        }
      }

      let segmentValues = [];

      state.order.forEach(fieldId => {
        Object.entries(activeSelections).forEach(([fieldName, selection]) => {
          if (groupName === "Body" && fieldName === "Sheet Layout") return;
          const category = window.FIELD_TO_PROMPT_CATEGORY_MAP[fieldName] || selection.category || selection.group.toLowerCase();
          const matchesOrder = category.replaceAll("_", "") === fieldId.replaceAll("_", "");
          if (matchesOrder && selection.group.toLowerCase() === groupName.toLowerCase()) {
            const val = getPromptValueForSelection(selection, fieldName);
            if (val && val.trim() !== "") {
              if (selection.isDropped) {
                if (!cleanTextOnly) segmentValues.push(`<span class="token-dropped" title="${selection.droppedReason}">${val}</span>`);
              } else {
                segmentValues.push(val);
              }
            }
          }
        });
      });

      if (segmentValues.length === 0) {
        segmentValues = Object.keys(activeSelections)
          .filter(key => activeSelections[key].group.toLowerCase() === groupName.toLowerCase())
          .filter(key => !(groupName === "Body" && key === "Sheet Layout"))
          .map(key => {
            const s = activeSelections[key];
            const val = getPromptValueForSelection(s, key);
            if (!val || val.trim() === "") return null;
            if (s.isDropped) return cleanTextOnly ? null : `<span class="token-dropped" title="${s.droppedReason}">${val}</span>`;
            return val;
          })
          .filter(val => val !== null);
      }

      segmentValues = [...new Set(segmentValues)];
      if (segmentValues.length === 0) return "";

      const combinedStr = segmentValues.join(", ");
      if (cleanTextOnly) return combinedStr;
      return `<span class="${tokenClass}">${combinedStr}</span>`;
    };

    const getCharacterSheetLayoutSegment = () => {
      const defaultLayout = "character model sheet, character design sheet, showing front view, side view, and back view of the same character, full-body view, standing straight in a neutral pose";
      const selectedLayout = getPromptValueForSelection(activeSelections["Sheet Layout"], "Sheet Layout");
      const layoutText = selectedLayout && selectedLayout.trim() !== ""
        ? `character model sheet, character design sheet, ${selectedLayout}`
        : defaultLayout;
      return cleanTextOnly ? layoutText : `<span class="token-pose">${layoutText}</span>`;
    };

    const shouldUsePromptCleanup = state.mode === "headshot" || state.mode === "character-sheet";
    const cleanedPromptSegments = shouldUsePromptCleanup
      ? buildCleanPromptSegments(activeSelections, getPromptValueForSelection)
      : null;

    let subject = cleanedPromptSegments
      ? wrapPromptSegment(cleanedPromptSegments.identity, "token-subject", cleanTextOnly)
      : compileGroupSegment("Character", "token-subject");
    let appearance = cleanedPromptSegments
      ? (state.imageReferences.faceMatch
        ? compileGroupSegment("Face", "token-appearance")
        : wrapPromptSegment(cleanedPromptSegments.appearance, "token-appearance", cleanTextOnly))
      : compileGroupSegment("Face", "token-appearance");

    const getSelectionsForGroup = (grp) => {
      return Object.keys(activeSelections)
        .filter(key => activeSelections[key].group.toLowerCase() === grp.toLowerCase())
        .map(key => {
          const s = activeSelections[key];
          const val = getPromptValueForSelection(s, key);
          if (!val || val.trim() === "") return null;
          if (s.isDropped) return cleanTextOnly ? null : `<span class="token-dropped" title="${s.droppedReason}">${val}</span>`;
          return val;
        })
        .filter(val => val !== null);
    };

    let hairList = getSelectionsForGroup("Hair");
    let hair = cleanedPromptSegments
      ? wrapPromptSegment(cleanedPromptSegments.hair, "token-appearance", cleanTextOnly)
      : (hairList.length > 0 ? (cleanTextOnly ? hairList.join(", ") : `<span class="token-appearance">${hairList.join(", ")}</span>`) : "");

    let skinList = getSelectionsForGroup("Skin");
    let skin = cleanedPromptSegments
      ? wrapPromptSegment(cleanedPromptSegments.skin, "token-appearance", cleanTextOnly)
      : (skinList.length > 0 ? (cleanTextOnly ? skinList.join(", ") : `<span class="token-appearance">${skinList.join(", ")}</span>`) : "");

    let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");

    let clothing = compileGroupSegment("Clothing", "token-clothing");

    // Baseline outfit fallback until visible Character Sheet outfit presets are implemented.
    if (state.mode === "character-sheet" && (!clothing || clothing.trim() === "")) {
      const clText = "wearing a plain white tank top and simple white shorts for clear character sheet visibility";
      clothing = cleanTextOnly ? clText : `<span class="token-clothing">${clText}</span>`;
    }

    let pose = compileGroupSegment("Pose", "token-pose");
    let fashionDirection = compileGroupSegment("Fashion Direction", "token-pose");
    let photoContext = compileGroupSegment("Photographic Context", "token-pose");
    let sceneStory = compileGroupSegment("Scene Story", "token-pose");
    let sceneContext = [fashionDirection, photoContext, sceneStory].filter(s => s !== "").join(", ");
    let body = compileGroupSegment("Body", "token-subject");
    let fullSubject = [subject, body].filter(s => s !== "").join(", ");

    let environment = compileGroupSegment("Environment", "token-pose");
    let lighting = compileGroupSegment("Lighting", "token-lighting");
    let camera = compileGroupSegment("Camera", "token-pose");
    let quality = compileGroupSegment("Quality", "token-lighting");
    let nsfw = compileGroupSegment("NSFW", "token-nsfw");

    let prompt = "";
    if (state.mode === "headshot") {
      let headshotLayout = `headshot portrait`;
      let elements = [
        cleanTextOnly ? headshotLayout : `<span class="token-pose">${headshotLayout}</span>`,
        fullSubject,
        appearance,
        hair,
        skin,
        cleanTextOnly ? "showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head" : `<span class="token-pose">showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head</span>`,
        cleanTextOnly ? "on a solid pure white background" : `<span class="token-pose">on a solid pure white background</span>`,
        cleanTextOnly ? "photorealistic photography" : `<span class="token-lighting">photorealistic photography</span>`,
        cleanTextOnly ? "realistic camera imperfections" : `<span class="token-lighting">realistic camera imperfections</span>`,
        camera,
        quality
      ].filter(s => s && s.toString().trim() !== "");
      prompt = elements.join(", ");
    } else if (state.mode === "character-sheet") {
      let sheetLayout = getCharacterSheetLayoutSegment();
      let elements = [
        sheetLayout,
        fullSubject,
        appearance,
        hair,
        clothing,
        cleanTextOnly ? "on a solid pure white background" : `<span class="token-pose">on a solid pure white background</span>`,
        cleanTextOnly ? "photorealistic photography" : `<span class="token-lighting">photorealistic photography</span>`,
        cleanTextOnly ? "realistic camera imperfections" : `<span class="token-lighting">realistic camera imperfections</span>`,
        camera,
        quality
      ].filter(s => s && s.toString().trim() !== "");
      prompt = elements.join(", ");
    } else {
      const characterReferenceText = window.isStoryCharacterReferenceActive && window.isStoryCharacterReferenceActive()
        ? (cleanTextOnly
          ? (state.characterReferenceOverrides
            ? "Preserve the recognizable character identity from the uploaded reference while applying the explicitly selected character styling overrides"
            : "Preserve the character identity, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene")
          : `<span class="token-reference">${state.characterReferenceOverrides
            ? "Preserve the recognizable character identity from the uploaded reference while applying the explicitly selected character styling overrides"
            : "Preserve the character identity, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene"}</span>`)
        : "";
      prompt = templateStr
        .replace("{subject}", fullSubject)
        .replace("{appearance}", fullAppearance)
        .replace("{clothing}", clothing)
        .replace("{nsfw}", nsfw)
        .replace("{pose}", [characterReferenceText, pose, sceneContext].filter(s => s !== "").join(", "))
        .replace("{environment}", environment)
        .replace("{lighting}", lighting)
        .replace("{camera}", camera)
        .replace("{quality}", quality);
    }

    prompt = prompt.replace(/,(\s*,)+/g, ",");
    prompt = prompt.replace(/^\s*,\s*/, "");
    prompt = prompt.replace(/\s*,\s*$/, "");
    prompt = prompt.trim();

    const toggleGptSafeEl = document.getElementById("toggle-gpt-safe");
    const isGptSafeActive = toggleGptSafeEl ? toggleGptSafeEl.checked : false;
    if (isGptSafeActive && prompt !== "") {
      let positiveWordsList = [];
      Object.values(activeSelections).forEach(selection => {
        if (selection.isCustom) return;
        const libItem = state.library.find(li => li.id === selection.id);
        if (libItem && libItem.prompt && libItem.prompt["gpt-image-positive"]) {
          positiveWordsList.push(
            ...libItem.prompt["gpt-image-positive"].split(",").map(w => w.trim()).filter(w => w !== "")
          );
        }
      });
      positiveWordsList = [...new Set(positiveWordsList)];
      if (positiveWordsList.length > 0) {
        const posStr = positiveWordsList.join(", ");
        if (cleanTextOnly) {
          prompt += `, ${posStr}`;
        } else {
          prompt += `, <span class="token-lighting">${posStr}</span>`;
        }
      }
    }

    return prompt;
  }

  // Expose to window
  window.getPromptValueForSelection = getPromptValueForSelection;
  window.splitPromptPhrases = splitPromptPhrases;
  window.uniquePromptParts = uniquePromptParts;
  window.normalizeIdentityPhrase = normalizeIdentityPhrase;
  window.normalizeHairPhrase = normalizeHairPhrase;
  window.getHairAdjective = getHairAdjective;
  window.compactHairSegment = compactHairSegment;
  window.sanitizeHeadshotExpression = sanitizeHeadshotExpression;
  window.compactExpressionSegment = compactExpressionSegment;
  window.compactSkinSegment = compactSkinSegment;
  window.buildCleanPromptSegments = buildCleanPromptSegments;
  window.wrapPromptSegment = wrapPromptSegment;
  window.enforceExclusionRules = enforceExclusionRules;
  window.updateDropdownExclusions = updateDropdownExclusions;
  window.updateAccordionSummaryBadges = updateAccordionSummaryBadges;
  window.resolveTagConflicts = resolveTagConflicts;
  window.generatePromptText = generatePromptText;
})();
