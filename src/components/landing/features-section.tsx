'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Plus, FileVideo, Search, Sparkles } from 'lucide-react';

const featureCards = [
  {
    title: 'Analysis Canvas',
    description:
      'Synchronized video playback with timestamped transcription. Tag highlights in real-time with ±100ms accuracy.',
    illustration: (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="from-accent-primary/20 to-accent-primary/5 border-accent-primary/30 flex h-32 w-32 items-center justify-center rounded-2xl border bg-gradient-to-br">
          <FileVideo className="text-accent-primary h-16 w-16" />
        </div>
      </div>
    ),
  },
  {
    title: 'Semantic Search',
    description:
      'Find relevant clips instantly using meaning-based search powered by vector embeddings. Search by concept, not just keywords.',
    illustration: (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="from-success/20 to-success/5 border-success/30 flex h-32 w-32 items-center justify-center rounded-2xl border bg-gradient-to-br">
          <Search className="text-success h-16 w-16" />
        </div>
      </div>
    ),
  },
  {
    title: 'Magic Cluster',
    description:
      'AI-powered thematic clustering automatically groups similar highlights to reveal patterns across interviews.',
    illustration: (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="from-warning/20 to-warning/5 border-warning/30 flex h-32 w-32 items-center justify-center rounded-2xl border bg-gradient-to-br">
          <Sparkles className="text-warning h-16 w-16" />
        </div>
      </div>
    ),
  },
];

export function FeaturesSection() {
  return (
    <div id="features" className="bg-base relative z-20 py-40">
      <div
        className="pointer-events-none absolute top-0 right-0 left-0"
        style={{
          height: '20%',
          background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.02) 0%, transparent 100%)',
        }}
      />
      <div className="flex w-full justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Header row */}
          <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-text-primary max-w-md text-3xl leading-[1.1] font-medium tracking-tight sm:text-4xl md:text-5xl lg:text-[56px]"
            >
              Built for qualitative researchers
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-md"
            >
              <p className="text-text-secondary leading-relaxed">
                OpenInsights transforms how you analyze interviews, user tests, and customer
                feedback. From transcription to insights in minutes, not days.{' '}
                <a
                  href="https://github.com/ertad-family/openinsights#features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Learn more <ChevronRight className="h-4 w-4" />
                </a>
              </p>
            </motion.div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {featureCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="bg-surface-1/50 border-border-subtle hover:border-border-default group relative flex h-[360px] cursor-pointer flex-col justify-end overflow-hidden rounded-3xl border transition-colors"
              >
                <div
                  className="absolute top-0 left-0 flex w-full"
                  style={{
                    maskImage: 'linear-gradient(#000 70%, transparent 90%)',
                    WebkitMaskImage: 'linear-gradient(#000 70%, transparent 90%)',
                  }}
                >
                  {card.illustration}
                </div>
                <div className="relative z-10 flex w-full flex-col p-6">
                  <h3 className="text-foreground mb-2 text-lg leading-tight font-medium">
                    {card.title}
                  </h3>
                  <p className="text-text-secondary mb-3 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  <div className="flex items-center justify-end">
                    <div className="border-border-default text-text-tertiary group-hover:border-border-strong group-hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-full border transition-colors">
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
