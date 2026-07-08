# ModelPromptForge Web App Requirements

## 1. Goal & Overview
ModelPromptForge is a premium, client-side web application designed to help users (especially those unfamiliar with prompt engineering) generate high-quality, structured prompts for AI image generators (e.g., Midjourney, DALL-E 3 / ChatGPT, Stable Diffusion) from a set of structured attributes. 

Rather than manually typing complex prompts, users select attributes through a guided visual interface. The app automatically compiles these attributes into a natural-language prompt according to structured templates and order rules.

### 1.1 Aesthetic Focus: Asian Beauty & Fair Complexions
To achieve maximum realism matching the user's specific styling target:
*   **Target Style**: Focus heavily on Asian beauty standards (East/Southeast Asian, Thai, Korean, Japanese). Character rendering should emphasize a cute, elegant, and highly polished "doll-like" aesthetic (หน้าสไตล์ตุ๊กตา).
*   **Skin Complexion**: Emphasize fair/white skin tones as the primary focus, with multiple variations of white/fair skin presets (e.g., Rosy Fair, Milky White, Translucent Glass Skin, Ivory White, and Aura Glowing White).
*   **Exclusions**: Deprioritize or minimize Western/European styling components in the default selectors to align with this aesthetic theme.

---

## 2. Dynamic Schema & Data Integration
The web app must dynamically load its options and UI configuration from the repository's local JSON schema. This ensures the app is highly extensible and automatically reflects any additions to the attribute library.

*   **Attribute Library**: Dynamically fetch all JSON files inside the `/attributes/` directory (e.g., `001-character.json`, `002-face.json`, etc.) or the combined library at `/requirements/spec/attribute-library.json`.
*   **UI Schema**: Use `/requirements/spec/ui-schema.json` to define the groups, layout, order, and control types (e.g., select, text) for rendering form inputs.
*   **Prompt Order**: Follow the ordering rules in `/requirements/spec/prompt-order.json` or `/requirements/prompt-rules.md`.
*   **Templates**: Apply templates from `/requirements/spec/prompt-templates.json` to structure the final prompt based on chosen styles (e.g., portrait, nightclub, street, studio).

---

## 3. Functional Requirements

### A. Dynamic Attribute Form Generator
*   **Categorized Layout**: Group fields into interactive, collapsible sections (accordions/tabs) corresponding to the categories defined in `ui-schema.json`:
    1.  **Character**: Gender, Age, Ethnicity, Beauty Level, Reference Image.
    2.  **Face**: Face Shape, Eyes, Eyebrows, Nose, Lips, Smile, Expression.
    3.  **Hair**: Length, Style, Texture, Color, Bangs.
    4.  **Skin**: Tone, Texture, Makeup, Freckles.
    5.  **Body**: Height, Body Shape, Build, Hands, Legs.
    6.  **Clothing**: Top, Bottom, Dress, Shoes, Accessories.
    7.  **Pose**: Standing, Sitting, Walking, Hand Position, Eye Contact.
    8.  **Environment**: Location, Architecture, Props, Weather, Time of Day, Season.
    9.  **Lighting**: Key Light, Fill Light, Back Light, Flash, Neon, Ambient, Golden Hour.
    10. **Camera**: Brand, Lens, Focal Length, Aperture, ISO, White Balance, Perspective, Composition, Motion Blur.
    11. **Quality**: Resolution, Sharpness, Photorealism, Color Grading, Film Look, Output Frame.

*   **Smart Select Controls**: Render custom-designed select dropdowns containing options parsed from the attributes files.
*   **Attribute Locking**: Each attribute control includes a lock toggle (`🔓`/`🔒`) that prevents the value from being overridden when the user clicks the "Surprise Me" randomize button.
*   **Custom Override Input**: Every attribute select control should have a "Custom" option that reveals a text input field, allowing the user to type custom values not present in the library.
*   **Image Reference Attributes (No Actual Upload Required)**:
    *   A dedicated section/group in the form for referencing external source images (e.g. "Reference Image Prompts").
    *   Provides toggles/options to append specific prompt instructions referring to "the uploaded image" or "the original file":
        *   **Face Match (Identity Lock)**: Injects: *"facial structure, mouth, nose, eyes, and eyebrows must match the original uploaded file 100% without any distortion"*
        *   **Style & Outfit Match**: Injects: *"matching the style, colors, and clothing outfit from the original uploaded image"*
        *   **Pose & Composition Match**: Injects: *"with the identical posing and image composition as the original uploaded file"*

### B. Real-Time Prompt Generator & Preview
*   **Live Assembly**: As the user selects or modifies attributes, the app dynamically constructs the prompt in real time.
*   **Template Selection**: A dropdown to choose the prompt layout template (e.g., standard Portrait, Nightclub, Street, Studio). The output changes layout instantly based on the template.
*   **Visual Highlights**: The prompt preview box should visually highlight different segments (e.g., color-coding subject, lighting, camera keywords) so the user understands how the prompt is structured.

### C. Output, Export & State Management
*   **One-Click Copy**: Buttons to quickly copy the final text prompt to the clipboard.
*   **JSON Config Export**: Download or copy the current selection state as a clean JSON file (matching the structured format of chosen IDs and custom inputs).
*   **JSON Config Import**: A file-upload / paste-box feature allowing users to import a previously saved JSON configuration file to restore their selection state instantly.
*   **Clear / Reset**: A button to reset all selections to their default empty states.

---

## 4. UI/UX & Design Requirements
The web app must have a premium, state-of-the-art visual aesthetic to match modern creative tools:

*   **Theme**: Dark mode by default, featuring deep greys (`#121214`), dark violet accents, and neon glows (pink, violet, cyan) to feel modern and high-tech.
*   **Aesthetics**: Glassmorphism cards (`backdrop-filter: blur`), clean typography (e.g., Inter, Outfit, or Roboto Google Fonts), subtle micro-animations for hover states, and smooth accordion transitions.
*   **Layout**: A dual-panel dashboard layout:
    *   **Left Panel**: Scrollable accordion forms for selecting attributes.
    *   **Right Panel**: Sticky/fixed control room containing the template selector, real-time prompt preview box, copy buttons, and import/export tools.
*   **Responsive Web Design**: Fluid layout that scales elegantly from widescreen desktops to mobile tablets.

---

## 5. Technical Requirements
*   **Core stack**: Single Page Application using standard HTML5, CSS3, and modern Vanilla JavaScript (ES6+).
*   **Libraries**: No heavy external frameworks (like React, Angular, or Vue) or styling packages (like TailwindCSS) unless requested. The app must run on native browser APIs.
*   **Asset Loading**: Asynchronous fetch calls to load the dynamic JSON files from the workspace.
*   **Compatibility**: Compatible with modern evergreen web browsers (Chrome, Edge, Safari, Firefox).

---

## 6. Project Directory Structure
The application code is organized as a lightweight static site containing:
```
ModelPromptForge/
├── index.html                   # Core application markup (app shell, sidebar and preview controls)
├── style.css                    # Design system (variables, neon theme, glassmorphism, responsive grid)
├── app.js                       # Logic (fetching schema, state, prompt compiler, import/export)
├── attributes/                  # Dynamic JSON option files (Character, Face, Skin, Clothing, etc.)
├── requirements/                # Project documentation & implementation plans
└── example-target/              # Exported prompts and configurations directory
```
