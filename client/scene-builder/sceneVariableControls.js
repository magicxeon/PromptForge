/**
 * ModelPromptForge - Scene Template Variable UI Controls
 */
(function () {
  /**
   * Render control wrapper and input element for a template variable.
   */
  function renderSceneVariableControl(container, variable, value, onChange) {
    if (!container || !variable) return;

    // Create wrapper card
    const card = document.createElement("div");
    card.className = "step-card";
    card.style.padding = "0.75rem";
    card.style.marginBottom = "0.75rem";
    card.style.background = "rgba(255, 255, 255, 0.02)";
    card.style.border = "1px solid rgba(255, 255, 255, 0.05)";

    // Label row
    const labelRow = document.createElement("div");
    labelRow.style.display = "flex";
    labelRow.style.justifyContent = "space-between";
    labelRow.style.alignItems = "center";
    labelRow.style.marginBottom = "0.5rem";

    const label = document.createElement("label");
    label.className = "control-label";
    label.style.margin = "0";
    label.innerHTML = `${variable.label || variable.sourceFieldName} ${variable.required ? '<span style="color:#ef4444;">*</span>' : ""}`;
    labelRow.appendChild(label);

    if (variable.replacementPolicy === "locked") {
      const lockBadge = document.createElement("span");
      lockBadge.innerText = "🔒 Locked";
      lockBadge.style.fontSize = "0.7rem";
      lockBadge.style.padding = "2px 6px";
      lockBadge.style.background = "rgba(255, 255, 255, 0.1)";
      lockBadge.style.borderRadius = "3px";
      lockBadge.style.color = "rgba(255, 255, 255, 0.5)";
      labelRow.appendChild(lockBadge);
    }

    card.appendChild(labelRow);

    const controlWrapper = document.createElement("div");
    controlWrapper.className = "control-input-wrapper";

    const isLocked = variable.replacementPolicy === "locked";

    if (isLocked) {
      // Locked controls are display only
      const displayVal = document.createElement("div");
      displayVal.className = "sub-label";
      displayVal.style.padding = "0.5rem";
      displayVal.style.background = "rgba(255, 255, 255, 0.03)";
      displayVal.style.borderRadius = "4px";
      displayVal.innerText = value || variable.defaultValue || "(No Value)";
      controlWrapper.appendChild(displayVal);
    } else if (variable.type === "reference_image") {
      // Renders reference slot picker card
      const dropZone = document.createElement("div");
      dropZone.style.border = "1px dashed rgba(255, 255, 255, 0.15)";
      dropZone.style.borderRadius = "6px";
      dropZone.style.padding = "1rem";
      dropZone.style.textAlign = "center";
      dropZone.style.cursor = "pointer";
      dropZone.style.background = "rgba(0, 0, 0, 0.2)";
      dropZone.style.display = "flex";
      dropZone.style.flexDirection = "column";
      dropZone.style.alignItems = "center";
      dropZone.style.justifyContent = "center";
      dropZone.style.gap = "0.5rem";

      const previewImg = document.createElement("img");
      previewImg.style.width = "80px";
      previewImg.style.height = "80px";
      previewImg.style.objectFit = "cover";
      previewImg.style.borderRadius = "4px";
      previewImg.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      let imgSrc = "";
      let labelText = "Drag & Drop or Click to Upload Image";
      let isPreviewOnly = false;
      if (value) {
        if (typeof value === "string") {
          imgSrc = value;
          labelText = "Click to change reference image";
        } else if (typeof value === "object") {
          imgSrc = value.thumbnailUrl || value.imageUrl || "";
          if (value.source === "history") {
            labelText = `Selected from History (#${value.jobId ? value.jobId.substring(4, 9) : 'image'})`;
          } else {
            labelText = "Click to change reference image";
          }
        }
      } else if (variable && variable.previewValue) {
        imgSrc = variable.previewValue.thumbnailUrl || variable.previewValue.imageUrl || "";
        labelText = "Template Preview Only (Upload required)";
        isPreviewOnly = true;
      }

      previewImg.style.display = imgSrc ? "block" : "none";
      previewImg.style.opacity = isPreviewOnly ? "0.45" : "1";
      if (imgSrc) previewImg.src = imgSrc;

      const placeholderText = document.createElement("span");
      placeholderText.className = "sub-label";
      placeholderText.innerText = labelText;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      dropZone.appendChild(previewImg);
      dropZone.appendChild(placeholderText);
      dropZone.appendChild(fileInput);

      dropZone.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          previewImg.src = base64;
          previewImg.style.display = "block";
          placeholderText.innerText = "Click to change reference image";
          onChange(base64);
        };
        reader.readAsDataURL(file);
      });

      controlWrapper.appendChild(dropZone);
    } else if (variable.type === "select_option") {
      const select = document.createElement("select");
      select.className = "custom-writein-input";
      select.style.width = "100%";

      // Populate dynamic options from the library catalog matches
      const fieldName = variable.sourceFieldName;
      const optionsList = (window.state.library || []).filter(item => {
        return item.category === fieldName || item.subcategory === fieldName || item.fieldName === fieldName;
      });

      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.innerText = `-- Choose ${fieldName} --`;
      select.appendChild(defaultOpt);

      optionsList.forEach(opt => {
        const optEl = document.createElement("option");
        optEl.value = opt.id;
        optEl.innerText = opt.label || opt.id;
        if (value === opt.id || (!value && variable.defaultValue === opt.id)) {
          optEl.selected = true;
        }
        select.appendChild(optEl);
      });

      select.addEventListener("change", (e) => onChange(e.target.value));
      controlWrapper.appendChild(select);
    } else if (variable.type === "custom_text") {
      const textarea = document.createElement("textarea");
      textarea.className = "custom-writein-input";
      textarea.style.width = "100%";
      textarea.style.height = "60px";
      textarea.style.resize = "vertical";
      textarea.placeholder = `Describe ${variable.sourceFieldName}...`;
      textarea.value = value || variable.defaultValue || "";

      textarea.addEventListener("input", (e) => onChange(e.target.value));
      controlWrapper.appendChild(textarea);
    } else if (variable.type === "color") {
      const colorContainer = document.createElement("div");
      colorContainer.style.display = "flex";
      colorContainer.style.alignItems = "center";
      colorContainer.style.gap = "0.5rem";

      const colorPicker = document.createElement("input");
      colorPicker.type = "color";
      colorPicker.style.border = "none";
      colorPicker.style.background = "none";
      colorPicker.style.width = "40px";
      colorPicker.style.height = "40px";
      colorPicker.style.cursor = "pointer";
      colorPicker.value = value || variable.defaultValue || "#000000";

      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "custom-writein-input";
      textInput.style.flex = "1";
      textInput.value = value || variable.defaultValue || "#000000";

      colorPicker.addEventListener("input", (e) => {
        textInput.value = e.target.value;
        onChange(e.target.value);
      });

      textInput.addEventListener("input", (e) => {
        const val = e.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          colorPicker.value = val;
          onChange(val);
        }
      });

      colorContainer.appendChild(colorPicker);
      colorContainer.appendChild(textInput);
      controlWrapper.appendChild(colorContainer);
    }

    card.appendChild(controlWrapper);
    container.appendChild(card);
  }

  // Expose to window
  window.ModelPromptForgeSceneVariableControls = {
    renderSceneVariableControl
  };
})();
