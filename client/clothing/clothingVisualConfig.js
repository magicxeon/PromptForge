/**
 * ModelPromptForge - Clothing Swatch Config and Controls Registration
 */
(function () {
  const CLOTHING_FIELDS = [
    {
      key: "Clothing::Pattern",
      group: "Clothing",
      field: "Pattern",
      controlType: "swatch-picker",
      optionMap: {
        "outfit.pattern.solid": "outfit.pattern.solid",
        "outfit.pattern.subtle_stripe": "outfit.pattern.subtle_stripe",
        "outfit.pattern.plaid": "outfit.pattern.plaid",
        "outfit.pattern.floral": "outfit.pattern.floral",
        "outfit.pattern.geometric": "outfit.pattern.geometric",
        "outfit.pattern.color_block": "outfit.pattern.color_block"
      },
      items: [
        {
          optionId: "outfit.pattern.solid",
          slug: "solid",
          swatch: { colors: ["#d4d4d8"] },
          alt: { en: "Solid pattern swatch", th: "Solid pattern swatch" }
        },
        {
          optionId: "outfit.pattern.subtle_stripe",
          slug: "stripe",
          swatch: { colors: ["#111827", "#e5e7eb"], pattern: "stripe" },
          alt: { en: "Stripe pattern swatch", th: "Stripe pattern swatch" }
        },
        {
          optionId: "outfit.pattern.plaid",
          slug: "plaid",
          swatch: { colors: ["#27272a", "#d4d4d8"], pattern: "plaid" },
          alt: { en: "Plaid pattern swatch", th: "Plaid pattern swatch" }
        },
        {
          optionId: "outfit.pattern.floral",
          slug: "floral",
          swatch: { colors: ["#3f3f46", "#e4e4e7"], pattern: "floral" },
          alt: { en: "Floral pattern swatch", th: "Floral pattern swatch" }
        },
        {
          optionId: "outfit.pattern.geometric",
          slug: "geometric",
          swatch: { colors: ["#18181b", "#a1a1aa"], pattern: "geometric" },
          alt: { en: "Geometric pattern swatch", th: "Geometric pattern swatch" }
        },
        {
          optionId: "outfit.pattern.color_block",
          slug: "color-block",
          swatch: { colors: ["#111827", "#f4f4f5"], pattern: "color-block" },
          alt: { en: "Color block design swatch", th: "Color block design swatch" }
        }
      ]
    },
    {
      key: "Clothing::Material",
      group: "Clothing",
      field: "Material",
      controlType: "swatch-picker",
      optionMap: {
        "outfit.material.cotton": "outfit.material.cotton",
        "outfit.material.denim": "outfit.material.denim",
        "outfit.material.knit": "outfit.material.knit",
        "outfit.material.satin": "outfit.material.satin",
        "outfit.material.wool": "outfit.material.wool",
        "outfit.material.leather_like": "outfit.material.leather_like"
      },
      items: [
        {
          optionId: "outfit.material.cotton",
          slug: "cotton",
          swatch: { colors: ["#d4d4d8"], pattern: "cotton" },
          alt: { en: "Cotton material swatch", th: "Cotton material swatch" }
        },
        {
          optionId: "outfit.material.denim",
          slug: "denim",
          swatch: { colors: ["#3f3f46", "#71717a"], pattern: "denim" },
          alt: { en: "Denim material swatch", th: "Denim material swatch" }
        },
        {
          optionId: "outfit.material.knit",
          slug: "knit",
          swatch: { colors: ["#a1a1aa", "#52525b"], pattern: "knit" },
          alt: { en: "Knit material swatch", th: "Knit material swatch" }
        },
        {
          optionId: "outfit.material.satin",
          slug: "satin",
          swatch: { colors: ["#ffffff", "#d4d4d8"], pattern: "satin" },
          alt: { en: "Satin material swatch", th: "Satin material swatch" }
        },
        {
          optionId: "outfit.material.wool",
          slug: "wool",
          swatch: { colors: ["#d6d3d1"], pattern: "wool" },
          alt: { en: "Wool material swatch", th: "Wool material swatch" }
        },
        {
          optionId: "outfit.material.leather_like",
          slug: "leather-like",
          swatch: { colors: ["#18181b"], pattern: "leather" },
          alt: { en: "Leather-like material swatch", th: "Leather-like material swatch" }
        }
      ]
    }
  ];

  if (window.ModelPromptForgeVisualOptionControls?.registerFields) {
    window.ModelPromptForgeVisualOptionControls.registerFields(CLOTHING_FIELDS);
  }
})();
