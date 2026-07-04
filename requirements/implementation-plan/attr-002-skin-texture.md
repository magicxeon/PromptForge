# Task attr-002: Realistic Skin Textures

## 1. Goal
Populate `/attributes/007-skin.json` with keywords detailing ultra-realistic skin rendering, tone, texture, and light specular response to maximize photorealism.

## 2. Attribute Specifications

*   **Skin Tone (Focusing on Asian Fair/White Skins)**:
    *   `Rosy Fair skin`: Rosy-white complexion, natural pinkish undertones (ขาวอมชมพู).
    *   `Translucent Glass skin`: Transparent glowing fair skin (ขาวใสโปร่งแสงแบบกระจก).
    *   `Milky White skin`: Smooth milk-white fair skin tone (ขาวน้ำนม).
    *   `Ivory White skin`: Clean ivory white tone (ขาวงาช้าง).
    *   `Aura Glowing White skin`: Radiant, bright white skin with an aura glow (ขาวสว่างออร่า).
    *   `Porcelain skin`: Translucent white, ultra-smooth, fine skin textures (ขาวพอร์ซเลนดุจกระเบื้องเคลือบ).
*   **Skin Texture (Realism Enhancers)**:
    *   `Glass skin texture`: Hydrated, luminous skin reflecting light cleanly.
    *   `Dewy complexion`: Moist, fresh, and slightly reflective skin look.
    *   `Natural skin texture`: Visible fine skin pores, micro-textures, and natural skin sheen (no flat airbrushed looks).
    *   `Radiant smooth skin`: Smooth surface with soft specular highlights under flash light.

---

## 3. Implementation Steps
1.  Read `/attributes/007-skin.json`.
2.  Overwrite it with a JSON list containing the skin tone items.
3.  Include texture details in the `prompt.default` and `prompt.gpt-image` mappings to force the AI models to render micro-details (like skin pores and natural sweat sheen instead of plastic doll-like skin).
