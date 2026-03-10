export type BrandType = "company" | "personal" | "animal_mascot" | "unknown";
export type SwagTier = "tier1" | "tier2" | "tier3";
export type AgentTone = "playful" | "professional" | "bold" | "minimal" | "technical" | "warm" | "futuristic";

export interface BrandAnalysis {
  brand_name: string;
  brand_type: BrandType;

  // Character logic — one of these will be populated
  animal_or_character: string | null;
  is_personal_brand: boolean;
  personal_brand_name: string | null;
  personal_brand_description: string | null;

  agent_character: string;
  brand_character_details: string;

  primary_color: string;
  secondary_color: string;
  tone: AgentTone;
  industry: string;
  data_richness: "rich" | "sparse";

  swag_tier: SwagTier;
  swag_item: string;
  swag_reasoning: string;
  personality: string;
  pose_variation_seed: string;
}

export interface GenerationResult {
  id: string;
  brand_analysis: BrandAnalysis;
  image_url: string;
  image_prompt: string;
  created_at: string;
}
