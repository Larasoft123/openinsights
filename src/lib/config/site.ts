/**
 * Site configuration for branding customization.
 * Self-hosted instances can customize these via environment variables.
 */

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'OpenInsights',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Transform qualitative research with AI-powered transcription, semantic search, and rapid tagging.',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/nin-logo.png',
  // Check if using custom branding
  isCustomBranded: Boolean(
    process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME !== 'OpenInsights'
  ),
} as const;

export type SiteConfig = typeof siteConfig;
