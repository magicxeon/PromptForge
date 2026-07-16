# Task attr-005: Clothing, Fits & Fabric Textures

## 1. Goal
Populate `/attributes/010-clothing.json` with realistic garment descriptions, tight fits, fabrics, necklines, and layers that outline shape cleanly.

## 2. Attribute Specifications

*   **Fit & Silhouette**:
    *   `Tight-fitting / skin-tight`: Clings tightly to the form.
    *   `Body-con style`: Fashion-standard body-conscious fit.
    *   `Compression garment`: High-performance athletic styling.
    *   `Form-fitting`: Snug profile.
    *   `Clinging fabric`: Draped cloth highlighting shape.
    *   `Second-skin fit`: Skin-tight overlay.
*   **Fabrics & Textures (Specular Specifiers)**:
    *   `Latex / Vinyl`: High-gloss, tight-clinging.
    *   `Faux leather`: Matte or semi-gloss structured skin.
    *   `Patent leather`: Glossy black leather with neon highlights.
    *   `Silk / Satin`: Smooth sheen, realistic folds.
    *   `Wet-look fabric`: Glossy wet reflection.
*   **Tops & Necklines**: Corset top, Bustier top, Deep V-neckline, Plunging neckline, Low-cut tank top, Off-the-shoulder, Halter neck.
*   **Bottoms**: Mini skirt, Skirt with a thigh-high slit, Tight leggings, Form-fitting trousers.
*   **Layers & Accessories**: Fashion harness (worn over clothing), Thigh-high boots, High-waist stockings, Leather gloves.

---

## 3. Implementation Steps
1.  Open `/attributes/010-clothing.json`.
2.  Populate it with the arrays of objects representing Tops, Bottoms, Fabrics, and Fits.
3.  Inject details like `"realistic fabric creases and folds"` in the prompt value definitions.
