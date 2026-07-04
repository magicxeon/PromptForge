/**
 * ModelPromptForge - Core Application Script
 * Dynamically loads schemas, builds the interactive UI, manages selections,
 * compiles prompts in real-time, and handles configuration imports/exports.
 */

const ATTRIBUTE_FILES = [
  '001-character.json',
  '002-face.json',
  '003-eyes.json',
  '004-eyebrows.json',
  '005-nose.json',
  '006-lips.json',
  '007-skin.json',
  '008-hair.json',
  '009-body.json',
  '010-clothing.json',
  '011-pose.json',
  '012-environment.json',
  '013-lighting.json',
  '014-camera.json',
  '015-quality.json'
];

// Mapping ui-schema fields to attribute categories
const FIELD_TO_CATEGORY_MAP = {
  // Character Group
  "Gender": "character",
  "Age": "character",
  "Ethnicity": "character",
  "Beauty": "character",
  "Reference Image": "character",

  // Face Group
  "Face Shape": "face",
  "Eyes": "eyes",
  "Eyebrows": "eyebrows",
  "Nose": "nose",
  "Lips": "lips",
  "Smile": "lips",
  "Expression": "face",

  // Hair Group
  "Length": "hair",
  "Style": "hair",
  "Texture": "hair",
  "Color": "hair",
  "Bangs": "hair",

  // Skin Group
  "Tone": "skin",
  "Texture": "skin",
  "Makeup": "skin",
  "Freckles": "skin",

  // Body Group
  "Height": "body",
  "Body Shape": "body",
  "Build": "body",
  "Hands": "body",
  "Legs": "body",

  // Clothing Group
  "Top": "clothing",
  "Bottom": "clothing",
  "Dress": "clothing",
  "Shoes": "clothing",
  "Accessories": "clothing",

  // Pose Group
  "Standing": "pose",
  "Sitting": "pose",
  "Walking": "pose",
  "Hand Position": "pose",
  "Eye Contact": "pose",

  // Environment Group
  "Location": "environment",
  "Architecture": "environment",
  "Props": "environment",
  "Weather": "environment",
  "Time of Day": "environment",
  "Season": "environment",

  // Lighting Group
  "Key Light": "lighting",
  "Fill Light": "lighting",
  "Back Light": "lighting",
  "Flash": "lighting",
  "Neon": "lighting",
  "Ambient": "lighting",
  "Golden Hour": "lighting",

  // Camera Group
  "Brand": "camera",
  "Lens": "camera",
  "Focal Length": "camera",
  "Aperture": "camera",
  "ISO": "camera",
  "White Balance": "camera",
  "Perspective": "camera",
  "Composition": "camera",

  // Quality Group
  "Resolution": "quality",
  "Sharpness": "quality",
  "Photorealism": "quality",
  "Color Grading": "quality",
  "Film Look": "quality"
};

// Presets definitions
const PRESETS = {
  nightclub: {
    template: "nightclub",
    aspectRatio: "6:8",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.007", value: "thai", isCustom: false },
      "Beauty": { id: "character.023", value: "cute doll-like Asian woman", isCustom: false },
      "Face Shape": { id: "face.016", value: "doll-like face shape", isCustom: false },
      "Eyes": { id: "eyes.006", value: "doe eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.001", value: "straight eyebrows", isCustom: false },
      "Nose": { id: "nose.001", value: "small button nose", isCustom: false },
      "Lips": { id: "lips.001", value: "cherry lips", isCustom: false },
      "Smile": { id: "lips.005", value: "gentle smile", isCustom: false },
      "Expression": { id: "face.017", value: "cute doll-like facial features", isCustom: false },
      "Length": { id: "hair_003", value: "long hair", isCustom: false },
      "Style": { id: "hair_023", value: "long loose waves/beach waves", isCustom: false },
      "Color": { id: "hair_021", value: "reddish-orange hair color", isCustom: false },
      "Bangs": { id: "hair_027", value: "see-through bangs", isCustom: false },
      "Tone": { id: "skin.013", value: "rosy fair skin", isCustom: false },
      "Texture": { id: "skin.011", value: "radiant smooth skin, bright and glowing under flash lighting", isCustom: false },
      "Top": { id: "clothing.014", value: "off-the-shoulder top", isCustom: false },
      "Bottom": { id: "clothing.015", value: "skirt with a thigh-high slit", isCustom: false },
      "Fit": { id: "clothing.003", value: "body-con style clothing", isCustom: false },
      "Fabric": { id: "clothing.008", value: "silk satin fabric", isCustom: false },
      "Sitting": { id: "pose.001", value: "crossing legs", isCustom: false },
      "Hand Position": { id: "pose.010", value: "hand touching the side of her face near cheek and ear", isCustom: false },
      "Location": { id: "environment.001", value: "inside a vibrant crowded bar or nightclub", isCustom: false },
      "Props": { id: "environment.009", value: "green glass bottle, glass with a purple straw, smartphone, table items", isCustom: false },
      "Flash": { id: "lighting.001", value: "strong flash lighting", isCustom: false },
      "Neon": { id: "lighting.002", value: "strong dramatic red and pink neon lighting", isCustom: false },
      "Ambient": { id: "lighting.003", value: "soft lighting on the subject in rich saturated environment", isCustom: false },
      "Brand": { id: "camera.001", value: "shot on a modern mirrorless camera", isCustom: false },
      "Lens": { id: "camera.002", value: "50mm lens", isCustom: false },
      "Perspective": { id: "camera.004", value: "medium close-up from a slightly low angle", isCustom: false },
      "Aperture": { id: "camera.003", value: "shallow depth of field, creating soft bokeh blur", isCustom: false }
    }
  },
  studio: {
    template: "studio",
    aspectRatio: "1:1",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.009", value: "korean", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.002", value: "oval face", isCustom: false },
      "Eyes": { id: "eyes.001", value: "almond-shaped eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.002", value: "soft arched eyebrows", isCustom: false },
      "Nose": { id: "nose.002", value: "high nose bridge", isCustom: false },
      "Lips": { id: "lips.003", value: "plump lips", isCustom: false },
      "Style": { id: "hair_022", value: "layered hush cut hairstyle", isCustom: false },
      "Tone": { id: "skin.015", value: "milky white skin", isCustom: false },
      "Texture": { id: "skin.012", value: "dewy glass skin, translucent and hydrated", isCustom: false },
      "Top": { id: "clothing.010", value: "corset top", isCustom: false },
      "Bottom": { id: "clothing.017", value: "tight leggings", isCustom: false },
      "Hand Position": { id: "pose.009", value: "hand on hip", isCustom: false },
      "Location": { id: "environment.003", value: "in a photography studio", isCustom: false },
      "Ambient": { id: "lighting.003", value: "soft lighting on the subject in rich saturated environment", isCustom: false },
      "Brand": { id: "camera.001", value: "shot on a modern mirrorless camera", isCustom: false },
      "Lens": { id: "camera.002", value: "50mm lens", isCustom: false },
      "Aperture": { id: "camera.003", value: "shallow depth of field, creating soft bokeh blur", isCustom: false }
    }
  },
  street: {
    template: "street",
    aspectRatio: "16:9",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.008", value: "japanese", isCustom: false },
      "Beauty": { id: "character.022", value: "beautiful young Asian woman", isCustom: false },
      "Face Shape": { id: "face.003", value: "round baby face", isCustom: false },
      "Eyes": { id: "eyes.005", value: "puppy eyes", isCustom: false },
      "Eyebrows": { id: "eyebrows.003", value: "natural thick brows", isCustom: false },
      "Nose": { id: "nose.004", value: "soft rounded tip", isCustom: false },
      "Lips": { id: "lips.002", value: "cupid's bow lips", isCustom: false },
      "Style": { id: "hair_023", value: "long loose waves/beach waves", isCustom: false },
      "Tone": { id: "skin.014", value: "translucent glass skin", isCustom: false },
      "Texture": { id: "skin.012", value: "dewy glass skin, translucent and hydrated", isCustom: false },
      "Top": { id: "clothing.012", value: "deep V-neckline top", isCustom: false },
      "Standing": { id: "pose.005", value: "looking over shoulder", isCustom: false },
      "Location": { id: "environment.002", value: "on an urban street at night", isCustom: false },
      "Golden Hour": { id: "lighting.004", value: "golden hour lighting", isCustom: false },
      "Brand": { id: "camera.001", value: "shot on a modern mirrorless camera", isCustom: false },
      "Lens": { id: "camera.002", value: "50mm lens", isCustom: false }
    }
  }
};

// Global App State
const state = {
  schema: null,       // ui-schema.json
  templates: null,    // prompt-templates.json
  order: null,        // prompt-order.json
  library: [],        // Consolidated options loaded from /attributes/
  selections: {},     // User selections: { fieldName: { id, value, isCustom } }
  imageReferences: {
    faceMatch: false,
    styleMatch: false,
    poseMatch: false
  },
  aspectRatio: "6:8"  // Default aspect ratio
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  try {
    // 1. Fetch system specifications from attributes/spec/
    const [schemaRes, templatesRes, orderRes] = await Promise.all([
      fetch("attributes/spec/ui-schema.json").then(r => r.json()),
      fetch("attributes/spec/prompt-templates.json").then(r => r.json()),
      fetch("attributes/spec/prompt-order.json").then(r => r.json())
    ]);

    state.schema = schemaRes;
    state.templates = templatesRes;
    state.order = orderRes.order;

    // Populate Template Selector dropdown
    const templateSelect = document.getElementById("template-select");
    templateSelect.innerHTML = "";
    Object.keys(state.templates).forEach((key, index) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key.charAt(0).toUpperCase() + key.slice(1) + " Template";
      if (index === 0) option.selected = true;
      templateSelect.appendChild(option);
    });

    // 2. Fetch all individual attributes JSON files in parallel
    const attributesData = await Promise.all(
      ATTRIBUTE_FILES.map(file => 
        fetch(`attributes/${file}`)
          .then(r => r.json())
          .catch(err => {
            console.warn(`Error loading attributes/${file}, skipping.`, err);
            return []; // Return empty array if file fails to load
          })
      )
    );

    // Normalize and consolidate all attributes into state.library
    attributesData.forEach(fileData => {
      const items = Array.isArray(fileData) ? fileData : (fileData.entries || []);
      state.library.push(...items);
    });

    // 3. Render Accordion Form UI
    renderForm();

    // 4. Bind Global UI Events
    bindEvents();

    // 5. Initial Compilation
    updatePromptPreview();

  } catch (error) {
    console.error("Initialization failed:", error);
    const container = document.getElementById("form-container");
    container.innerHTML = `
      <div style="color: var(--neon-pink); padding: 2rem; text-align: center;">
        <h3>Failed to load application data</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-weight: bold;">Error: ${error.message}</p>
        <p style="color: var(--text-muted); font-size: 0.8rem; font-family: monospace; white-space: pre-wrap; margin-top: 1rem; text-align: left; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">${error.stack || ''}</p>
      </div>
    `;
  }
}

// Render Collapsible Accordion UI based on ui-schema.json
function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = ""; // Clear loader placeholder

  state.schema.forEach((groupObj, groupIdx) => {
    const groupName = groupObj.group;
    
    // Create Accordion Panel Element
    const accordion = document.createElement("div");
    accordion.className = "accordion";
    accordion.id = `accordion-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
    if (groupIdx === 0) accordion.classList.add("active"); // Open the first group by default

    // Accordion Header
    const header = document.createElement("div");
    header.className = "accordion-header";
    
    const titleArea = document.createElement("div");
    titleArea.className = "accordion-title";
    titleArea.innerHTML = `<span>${groupName}</span>`;

    // Dynamic Summary Badge
    const badge = document.createElement("span");
    badge.className = "accordion-badge";
    badge.style.display = "none";
    badge.id = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
    titleArea.appendChild(badge);

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▼";

    header.appendChild(titleArea);
    header.appendChild(arrow);
    accordion.appendChild(header);

    // Accordion Content Box
    const content = document.createElement("div");
    content.className = "accordion-content";

    const inner = document.createElement("div");
    inner.className = "accordion-inner";

    // Fields inside group
    groupObj.fields.forEach(field => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "form-field";
      
      const label = document.createElement("label");
      label.textContent = field.name;
      fieldDiv.appendChild(label);

      // Create dropdown select wrapper
      const selectWrapper = document.createElement("div");
      selectWrapper.className = "select-wrapper";

      const select = document.createElement("select");
      select.className = "custom-select";
      select.id = `select-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
      select.setAttribute("data-field", field.name);
      select.setAttribute("data-group", groupName);

      // Option filter logic
      const category = FIELD_TO_CATEGORY_MAP[field.name] || groupName.toLowerCase();
      const filteredOptions = getOptionsForField(field.name, category, state.library);

      // Default select placeholder
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = `-- Select ${field.name} --`;
      select.appendChild(defaultOpt);

      // Add options
      filteredOptions.forEach(opt => {
        // Skip disabled options
        if (opt.enabled === false) return;
        
        const optionNode = document.createElement("option");
        optionNode.value = opt.id;
        // Check if there is a custom prompt mapping or fall back to label
        optionNode.setAttribute("data-prompt", opt.prompt ? (opt.prompt["gpt-image"] || opt.prompt.default) : opt.label);
        optionNode.textContent = opt.label;
        select.appendChild(optionNode);
      });

      // Add Custom Override Write-in option
      const customOpt = document.createElement("option");
      customOpt.value = "__custom__";
      customOpt.textContent = "Custom (Write-in)...";
      select.appendChild(customOpt);

      selectWrapper.appendChild(select);
      fieldDiv.appendChild(selectWrapper);

      // Hidden custom text input field
      const customInput = document.createElement("input");
      customInput.type = "text";
      customInput.className = "custom-writein-input";
      customInput.placeholder = `Type custom ${field.name.toLowerCase()} here...`;
      customInput.style.display = "none";
      customInput.id = `custom-input-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
      fieldDiv.appendChild(customInput);

      inner.appendChild(fieldDiv);
    });

    content.appendChild(inner);
    accordion.appendChild(content);
    container.appendChild(accordion);
  });
}

// Logic Helper: Filter attributes library by field specific criteria
function getOptionsForField(fieldName, category, allItems) {
  const items = allItems.filter(item => item.category === category);
  const lowerField = fieldName.toLowerCase();

  // 1. If items have subcategories, filter strictly by subcategory match
  const hasSubcategory = items.some(item => item.subcategory);
  if (hasSubcategory) {
    return items.filter(item => item.subcategory && item.subcategory.toLowerCase() === lowerField);
  }

  // 2. Otherwise apply heuristics for flat structures
  if (category === "face") {
    if (lowerField === "face shape") {
      // Exclude expressions and special match options
      return items.filter(item => 
        !item.label.toLowerCase().includes("expression") && 
        !item.label.toLowerCase().includes("details") && 
        !item.label.toLowerCase().includes("match")
      );
    }
    if (lowerField === "expression") {
      return items.filter(item => 
        item.label.toLowerCase().includes("expression") || 
        item.label.toLowerCase().includes("details") ||
        item.label.toLowerCase().includes("gaze")
      );
    }
    return items;
  }

  if (category === "skin") {
    if (lowerField === "tone") {
      // Return fair/white skins and basic tones
      return items.filter(item => 
        item.label.toLowerCase().includes("skin") && 
        !item.label.toLowerCase().includes("texture")
      );
    }
    if (lowerField === "texture") {
      return items.filter(item => 
        item.label.toLowerCase().includes("texture") || 
        item.label.toLowerCase().includes("complexion") || 
        item.label.toLowerCase().includes("smooth")
      );
    }
    return items;
  }

  if (category === "lips") {
    if (lowerField === "smile") {
      return items.filter(item => item.label.toLowerCase().includes("smile") || item.label.toLowerCase().includes("expression"));
    }
    return items.filter(item => !item.label.toLowerCase().includes("smile"));
  }

  if (category === "character") {
    if (lowerField === "gender") {
      return items.filter(item => ["female", "male", "non-binary", "child"].includes(item.label.toLowerCase()));
    }
    if (lowerField === "age") {
      return items.filter(item => ["young adult", "young", "adult", "senior", "mid-twenties"].includes(item.label.toLowerCase()));
    }
    if (lowerField === "ethnicity") {
      return items.filter(item => ["thai", "japanese", "korean", "chinese", "vietnamese", "european", "african", "middle eastern", "south asian", "southeast asian"].includes(item.label.toLowerCase()));
    }
    if (lowerField === "beauty") {
      return items.filter(item => ["beautiful", "attractive", "stunning", "beautiful young asian", "cute doll-like asian"].includes(item.label.toLowerCase()));
    }
  }

  return items;
}

// Bind event listeners
function bindEvents() {
  // Accordion Toggle Headers
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const accordion = header.parentElement;
      const isActive = accordion.classList.contains("active");

      // Close all accordions
      document.querySelectorAll(".accordion").forEach(acc => acc.classList.remove("active"));
      
      // Toggle current accordion
      if (!isActive) {
        accordion.classList.add("active");
      }
    });
  });

  // Dropdown Select Inputs (only inside #form-container to avoid matching template-select)
  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    const groupName = select.getAttribute("data-group");
    const customInput = select.parentElement.parentElement.querySelector(".custom-writein-input");

    // Change event
    select.addEventListener("change", (e) => {
      const val = e.target.value;
      
      if (val === "__custom__") {
        // Show custom write-in field
        customInput.style.display = "block";
        customInput.focus();
        state.selections[fieldName] = { id: "__custom__", value: customInput.value, isCustom: true, group: groupName };
      } else {
        // Hide custom field
        customInput.style.display = "none";
        
        if (val === "") {
          delete state.selections[fieldName];
        } else {
          const selectedOption = e.target.options[e.target.selectedIndex];
          const promptVal = selectedOption.getAttribute("data-prompt");
          state.selections[fieldName] = { id: val, value: promptVal, isCustom: false, group: groupName };
        }
      }
      
      updateAccordionSummaryBadges(groupName);
      updatePromptPreview();
    });

    // Custom Input events
    customInput.addEventListener("input", (e) => {
      if (select.value === "__custom__") {
        state.selections[fieldName] = { id: "__custom__", value: e.target.value, isCustom: true, group: groupName };
        updateAccordionSummaryBadges(groupName);
        updatePromptPreview();
      }
    });
  });

  // Template select
  document.getElementById("template-select").addEventListener("change", () => {
    updatePromptPreview();
  });

  // Aspect Ratio Chips
  document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.aspectRatio = chip.getAttribute("data-ratio");
      updatePromptPreview();
    });
  });

  // Preset selector chips
  document.querySelectorAll("#presets-group .option-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const presetName = chip.getAttribute("data-preset");
      
      // Visual active class handling
      document.querySelectorAll("#presets-group .option-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      
      // Load preset
      const preset = PRESETS[presetName];
      if (preset) {
        importConfigJSON(JSON.stringify(preset));
      }
    });
  });

  // Image Reference Checkboxes
  const refFace = document.getElementById("ref-face-match");
  const refStyle = document.getElementById("ref-style-match");
  const refPose = document.getElementById("ref-pose-match");

  const updateRefState = () => {
    state.imageReferences.faceMatch = refFace.checked;
    state.imageReferences.styleMatch = refStyle.checked;
    state.imageReferences.poseMatch = refPose.checked;
    applyFaceMatchLockout();
    updatePromptPreview();
  };

  refFace.addEventListener("change", updateRefState);
  refStyle.addEventListener("change", updateRefState);
  refPose.addEventListener("change", updateRefState);

  // Copy Prompt Button
  document.getElementById("btn-copy").addEventListener("click", () => {
    copyPromptToClipboard();
  });

  // Random / Surprise Me Button
  document.getElementById("btn-random").addEventListener("click", () => {
    randomizeSelections();
  });

  // Reset Button
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetForm();
  });

  // Export JSON Button
  document.getElementById("btn-export").addEventListener("click", () => {
    exportConfigJSON();
  });

  // Import JSON Button
  document.getElementById("btn-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      importConfigJSON(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear file input
  });
}

// Update accordion header summary badge to show selected items at a glance
function updateAccordionSummaryBadges(groupName) {
  const badgeId = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  const selectedInGroup = Object.keys(state.selections)
    .filter(key => state.selections[key].group === groupName)
    .map(key => state.selections[key].value)
    .filter(val => val && val.trim() !== "");

  if (selectedInGroup.length > 0) {
    badge.textContent = selectedInGroup.join(", ");
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

// Live compilation of active selections into prompt structure
function generatePromptText(cleanTextOnly = false) {
  const currentTemplateName = document.getElementById("template-select").value || "portrait";
  const templateStr = state.templates[currentTemplateName];

  // Helper to compile a category group
  const compileGroupSegment = (groupName, tokenClass) => {
    let segmentValues = [];

    // Get order mappings for attributes within this segment
    state.order.forEach(fieldId => {
      // Find field in selections
      const selection = Object.values(state.selections).find(s => {
        const category = FIELD_TO_CATEGORY_MAP[s.group] || s.group.toLowerCase();
        // Match approximate category IDs in order rules
        return category.replace("_", "") === fieldId.replace("_", "") || s.group.toLowerCase() === fieldId.toLowerCase();
      });
      
      if (selection && selection.group.toLowerCase() === groupName.toLowerCase()) {
        if (selection.value && selection.value.trim() !== "") {
          segmentValues.push(selection.value);
        }
      }
    });

    // If order rule didn't catch it, fallback to search by group mapping
    if (segmentValues.length === 0) {
      segmentValues = Object.keys(state.selections)
        .filter(key => state.selections[key].group.toLowerCase() === groupName.toLowerCase())
        .map(key => state.selections[key].value)
        .filter(val => val && val.trim() !== "");
    }

    // Apply specific Image Reference inserts
    if (groupName.toLowerCase() === "face" || groupName.toLowerCase() === "appearance") {
      if (state.imageReferences.faceMatch) {
        const txt = "facial structure, mouth, nose, eyes, and eyebrows must match the original uploaded file 100% without any distortion";
        segmentValues.push(cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`);
      }
    }
    if (groupName.toLowerCase() === "clothing") {
      if (state.imageReferences.styleMatch) {
        const txt = "matching the style, colors, and clothing outfit from the original uploaded image";
        segmentValues.push(cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`);
      }
    }
    if (groupName.toLowerCase() === "pose") {
      if (state.imageReferences.poseMatch) {
        const txt = "with the identical posing and image composition as the original uploaded file";
        segmentValues.push(cleanTextOnly ? txt : `<span class="token-reference">${txt}</span>`);
      }
    }

    if (segmentValues.length === 0) return "";

    const combinedStr = segmentValues.join(", ");
    if (cleanTextOnly) return combinedStr;
    return `<span class="${tokenClass}">${combinedStr}</span>`;
  };

  // Compile individual templates
  let subject = compileGroupSegment("Character", "token-subject");
  let appearance = compileGroupSegment("Face", "token-appearance");
  let hair = compileGroupSegment("Hair", "token-appearance"); // Hair maps under appearance in layout
  let skin = compileGroupSegment("Skin", "token-appearance"); // Skin maps under appearance in layout
  
  // Combine appearance, hair, and skin under the main appearance segment
  let fullAppearance = [appearance, hair, skin].filter(s => s !== "").join(", ");

  let clothing = compileGroupSegment("Clothing", "token-clothing");
  let pose = compileGroupSegment("Pose", "token-pose");
  
  // Body properties also merge with pose/subject contextually
  let body = compileGroupSegment("Body", "token-subject");
  let fullSubject = [subject, body].filter(s => s !== "").join(", ");

  let environment = compileGroupSegment("Environment", "token-pose"); // Environment maps contextually
  let lighting = compileGroupSegment("Lighting", "token-lighting");
  let camera = compileGroupSegment("Camera", "token-pose"); // Camera tags
  let quality = compileGroupSegment("Quality", "token-lighting"); // Quality keywords

  // Format replacements
  let prompt = templateStr
    .replace("{subject}", fullSubject)
    .replace("{appearance}", fullAppearance)
    .replace("{clothing}", clothing)
    .replace("{pose}", pose)
    .replace("{environment}", environment)
    .replace("{lighting}", lighting)
    .replace("{camera}", camera)
    .replace("{quality}", quality);

  // Clean double commas and spaces
  prompt = prompt.replace(/,(\s*,)+/g, ","); // Replace multiple commas
  prompt = prompt.replace(/^\s*,\s*/, "");     // Clean leading comma
  prompt = prompt.replace(/\s*,\s*$/, "");     // Clean trailing comma
  prompt = prompt.trim();

  // Postfix Aspect Ratio
  if (state.aspectRatio && prompt !== "") {
    const arStr = `(Image aspect ratio ${state.aspectRatio})`;
    if (cleanTextOnly) {
      prompt += ` ${arStr}`;
    } else {
      prompt += ` <span class="token-lighting">${arStr}</span>`;
    }
  }

  return prompt;
}

// Update DOM Prompt Preview
function updatePromptPreview() {
  const previewBox = document.getElementById("prompt-preview");
  const htmlContent = generatePromptText(false);

  if (htmlContent === "") {
    previewBox.innerHTML = '<span class="placeholder-text">Prompt will generate here once attributes are selected...</span>';
  } else {
    previewBox.innerHTML = htmlContent;
  }
}

// Copy prompt clean string to clipboard
function copyPromptToClipboard() {
  const textVal = generatePromptText(true);
  if (textVal === "") return;

  navigator.clipboard.writeText(textVal).then(() => {
    const copyBtn = document.getElementById("btn-copy");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("neon-glow-pink");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("neon-glow-pink");
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

// Reset Selections
function resetForm() {
  // Clear select elements
  document.querySelectorAll(".custom-select").forEach(select => {
    select.value = "";
    const customInput = select.parentElement.parentElement.querySelector(".custom-writein-input");
    if (customInput) {
      customInput.value = "";
      customInput.style.display = "none";
    }
  });

  // Clear checkboxes
  document.getElementById("ref-face-match").checked = false;
  document.getElementById("ref-style-match").checked = false;
  document.getElementById("ref-pose-match").checked = false;

  // Reset state
  state.selections = {};
  state.imageReferences = { faceMatch: false, styleMatch: false, poseMatch: false };
  state.aspectRatio = "6:8";

  // Re-activate default aspect ratio chip
  document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
    chip.classList.remove("active");
    if (chip.getAttribute("data-ratio") === "6:8") {
      chip.classList.add("active");
    }
  });

  // Hide all badges
  document.querySelectorAll(".accordion-badge").forEach(badge => {
    badge.textContent = "";
    badge.style.display = "none";
  });

  // Revert templates select
  const templateSelect = document.getElementById("template-select");
  if (templateSelect.options.length > 0) templateSelect.selectedIndex = 0;

  // Clear presets active state
  document.querySelectorAll("#presets-group .option-chip").forEach(c => c.classList.remove("active"));

  applyFaceMatchLockout();
  updatePromptPreview();
}

// Export Selection State as Downloadable JSON config
function exportConfigJSON() {
  // Build clean config payload
  const payload = {
    selections: {},
    imageReferences: state.imageReferences,
    aspectRatio: state.aspectRatio,
    template: document.getElementById("template-select").value || "portrait"
  };

  // Extract relevant values from selection states
  Object.keys(state.selections).forEach(field => {
    payload.selections[field] = {
      id: state.selections[field].id,
      value: state.selections[field].value,
      isCustom: state.selections[field].isCustom
    };
  });

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "model-prompt-config.json";
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import JSON configuration and restore UI state
function importConfigJSON(jsonString) {
  try {
    const payload = JSON.parse(jsonString);
    if (!payload || typeof payload !== "object") throw new Error("Invalid preset format");

    // Reset current form state first
    resetForm();

    // 1. Restore template dropdown
    if (payload.template) {
      const templateSelect = document.getElementById("template-select");
      templateSelect.value = payload.template;
    }

    // 2. Restore Aspect Ratio Chip
    if (payload.aspectRatio) {
      state.aspectRatio = payload.aspectRatio;
      document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
        chip.classList.remove("active");
        if (chip.getAttribute("data-ratio") === payload.aspectRatio) {
          chip.classList.add("active");
        }
      });
    }

    // 3. Restore Image Reference Checkboxes
    if (payload.imageReferences) {
      state.imageReferences = payload.imageReferences;
      document.getElementById("ref-face-match").checked = !!payload.imageReferences.faceMatch;
      document.getElementById("ref-style-match").checked = !!payload.imageReferences.styleMatch;
      document.getElementById("ref-pose-match").checked = !!payload.imageReferences.poseMatch;
    }

    // 4. Restore Select dropdowns & custom fields
    if (payload.selections) {
      Object.keys(payload.selections).forEach(field => {
        const item = payload.selections[field];
        
        // Find select control that matches field name
        const select = document.querySelector(`.custom-select[data-field="${field}"]`);
        if (!select) return;

        const groupName = select.getAttribute("data-group");

        if (item.isCustom) {
          select.value = "__custom__";
          const customInput = select.parentElement.parentElement.querySelector(".custom-writein-input");
          if (customInput) {
            customInput.value = item.value;
            customInput.style.display = "block";
          }
          state.selections[field] = { id: "__custom__", value: item.value, isCustom: true, group: groupName };
        } else {
          select.value = item.id;
          state.selections[field] = { id: item.id, value: item.value, isCustom: false, group: groupName };
        }

        updateAccordionSummaryBadges(groupName);
      });
    }

    applyFaceMatchLockout();
    updatePromptPreview();

  } catch (error) {
    alert("Failed to load preset configuration: " + error.message);
  }
}

// Visual Lockout for facial selections when Face Match is checked
function applyFaceMatchLockout() {
  const isLocked = state.imageReferences.faceMatch;
  const faceFields = ["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile", "Expression"];
  
  faceFields.forEach(field => {
    const select = document.querySelector(`.custom-select[data-field="${field}"]`);
    if (!select) return;
    
    const formField = select.closest(".form-field");
    if (isLocked) {
      select.disabled = true;
      if (formField) formField.classList.add("disabled");
      
      // Remove selections from active state
      delete state.selections[field];
      select.value = "";
      
      const customInput = formField.querySelector(".custom-writein-input");
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
    } else {
      select.disabled = false;
      if (formField) formField.classList.remove("disabled");
    }
  });
  
  updateAccordionSummaryBadges("Face");
}

// Randomize active options in all selectors inside form-container
function randomizeSelections() {
  // Clear form selections first
  resetForm();

  // Face Match status might lock out face attributes, check it
  const isFaceLocked = state.imageReferences.faceMatch;
  const faceFields = ["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile", "Expression"];

  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    const groupName = select.getAttribute("data-group");
    
    // Skip if field is locked by face match
    if (isFaceLocked && faceFields.includes(fieldName)) return;

    // 65% probability to select an option (to make it a natural, non-overloaded prompt)
    if (Math.random() > 0.65) return;

    const options = Array.from(select.options).filter(opt => opt.value !== "" && opt.value !== "__custom__");
    if (options.length === 0) return;

    // Pick a random option
    const randomOpt = options[Math.floor(Math.random() * options.length)];
    select.value = randomOpt.value;
    
    const promptVal = randomOpt.getAttribute("data-prompt");
    state.selections[fieldName] = { id: randomOpt.value, value: promptVal, isCustom: false, group: groupName };
    
    updateAccordionSummaryBadges(groupName);
  });

  // Randomize template selection
  const templateSelect = document.getElementById("template-select");
  if (templateSelect && templateSelect.options.length > 0) {
    const randTplIdx = Math.floor(Math.random() * templateSelect.options.length);
    templateSelect.selectedIndex = randTplIdx;
  }

  // Randomize Aspect Ratio selection
  const chips = document.querySelectorAll("#aspect-ratio-group .option-chip");
  if (chips.length > 0) {
    const randChip = chips[Math.floor(Math.random() * chips.length)];
    chips.forEach(c => c.classList.remove("active"));
    randChip.classList.add("active");
    state.aspectRatio = randChip.getAttribute("data-ratio");
  }

  updatePromptPreview();
}
