export const SWAG_TIERS = {
  tier1_wearables: [
    "t-shirt", "hoodie", "crewneck sweatshirt", "zip-up hoodie",
    "polo shirt", "long sleeve shirt", "tank top",
  ],

  tier2_accessories: [
    "snapback hat", "beanie", "bucket hat", "trucker hat",
    "headband with lightning bolt", "high-top sneakers", "slides",
    "socks", "fanny pack", "tote bag", "backpack",
    "varsity jacket", "bomber jacket", "cape", "windbreaker",
  ],

  tier3_luxury: [
    "Supered-branded Lamborghini (hot pink with gold lightning bolt decals)",
    "Supered-branded yacht (SUPERED on the hull in gold lettering)",
    "Supered-branded private jet (pink and navy livery)",
    "Supered Rolex (pink face, lightning bolt second hand, navy strap)",
    "golden throne with Supered lightning bolt crest",
    "championship trophy engraved with SUPERED",
    "Supered-branded rocket ship",
    "custom arcade cabinet labeled SUPERED: THE GAME",
    "giant novelty check made out to Your AI Agent, signed by Supered",
    "Supered-branded private helicopter (pink and navy)",
  ],
};

export const TIER_SELECTION_RULES = `
- Rich brand data (colors + tone + character all detected) + professional/minimal tone → prefer tier1
- Rich brand data + bold/playful/futuristic/zany tone → prefer tier2
- Sparse data (couldn't detect much) → go straight to tier3 — lean into the mystery with luxury
- Personal brand (solo human) + bold personality → tier2 or tier3
- Always aim for the most SURPRISING and SHAREABLE choice — boring is the only wrong answer
- Never default to t-shirt unless it's genuinely the most on-brand choice
`;
