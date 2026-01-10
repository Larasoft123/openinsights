'use client';

import { HeroSection } from './hero-section';
import { FeaturesSection } from './features-section';
import { AISection } from './ai-section';
import { PrivacySection } from './privacy-section';
import { TemplatesSection } from './templates-section';
import { CTASection } from './cta-section';
import { LandingFooter } from './footer';

/**
 * OpenInsights Landing Page
 *
 * Full landing page using Sprint Linear Clone template structure
 * with OpenInsights-specific content and unified design system.
 *
 * Sections:
 * 1. Hero - 3D mockup with Analysis Canvas
 * 2. Features - Core platform capabilities
 * 3. AI - Multi-provider support (Gemini, OpenAI, Ollama)
 * 4. Privacy - Open source & self-hosted positioning
 * 5. Templates - Research methodology templates
 * 6. CTA - Final call to action
 * 7. Footer - Links and resources
 */
export function LandingPage() {
  return (
    <div className="bg-base min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <AISection />
      <PrivacySection />
      <TemplatesSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
