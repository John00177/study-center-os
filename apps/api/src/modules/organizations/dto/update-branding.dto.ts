import { IsIn, IsOptional, IsString, Matches } from "class-validator";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const THEMES = ["light", "dark", "auto"];
const LANGUAGES = ["uz", "en", "ru"];

export class UpdateBrandingDto {
  // Nullable so the "Remove Logo" button can clear it via this same
  // endpoint — the actual file upload goes through POST /organizations/me/logo.
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: "primaryColor must be a hex color like #2563eb" })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: "accentColor must be a hex color like #22c55e" })
  accentColor?: string;

  @IsOptional()
  @IsIn(THEMES)
  theme?: string;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;
}
