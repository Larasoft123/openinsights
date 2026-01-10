'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  Star,
  Users,
  ArrowRight,
} from 'lucide-react';

const templates = [
  {
    id: 1,
    name: 'Usability Testing',
    description: 'Track task completion, friction points, and user emotions during usability tests',
    tags: ['Task Success', 'Friction', 'Emotions'],
    icon: ClipboardCheck,
    color: 'text-accent-primary',
    bgColor: 'bg-accent-primary/10',
  },
  {
    id: 2,
    name: 'JTBD Interviews',
    description: 'Map customer timelines and four forces driving switching decisions',
    tags: ['Timeline', 'Push/Pull', 'Anxieties'],
    icon: MessageCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    id: 3,
    name: 'Feedback Synthesis',
    description: 'Analyze customer feedback with sentiment, topic, and actionability tagging',
    tags: ['Sentiment', 'Topics', 'Priority'],
    icon: Star,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    id: 4,
    name: 'Competitor Analysis',
    description: 'Compare feature parity and user perceptions across competing products',
    tags: ['Features', 'Perception', 'Gaps'],
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
];

export function TemplatesSection() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const maxScroll = Math.max(0, templates.length - 3);

  const scrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - 1));
  };

  const scrollRight = () => {
    setScrollPosition(Math.min(maxScroll, scrollPosition + 1));
  };

  return (
    <section id="templates" className="bg-base relative py-24">
      <div
        className="pointer-events-none absolute top-0 right-0 left-0"
        style={{
          height: '20%',
          background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.02), transparent)',
        }}
      />

      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-xl">
            {/* Indicator */}
            <div className="mb-6 flex items-center gap-2">
              <div className="bg-warning h-2 w-2 rounded-full" />
              <span className="text-text-secondary text-sm">Research Templates</span>
              <ChevronRight className="text-text-tertiary h-4 w-4" />
            </div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-text-primary text-4xl leading-[1.1] font-medium tracking-tight md:text-5xl"
            >
              Start fast with
              <br />
              proven templates
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-text-secondary lg:max-w-sm lg:pt-12"
          >
            Pre-configured tag structures, AI prompts, and report templates for common research
            methodologies. Use official templates or create your own.
          </motion.p>
        </div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          <div
            className="flex gap-4 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${scrollPosition * (100 / 3)}%)` }}
          >
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="w-[calc(33.333%-11px)] min-w-[320px] flex-shrink-0"
              >
                <div className="bg-surface-1/50 border-border-subtle hover:border-border-default group flex h-[340px] flex-col overflow-hidden rounded-2xl border transition-all duration-200">
                  {/* Icon area */}
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
                    <div
                      className={`h-24 w-24 rounded-2xl ${template.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                    >
                      <template.icon className={`h-12 w-12 ${template.color}`} />
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="border-border-subtle bg-surface-1/30 border-t p-6">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-text-primary mb-1 font-medium">{template.name}</h3>
                        <p className="text-text-secondary line-clamp-2 text-sm leading-relaxed">
                          {template.description}
                        </p>
                      </div>
                      <button className="border-border-default text-text-tertiary hover:text-text-primary hover:border-border-strong flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface-2 text-text-tertiary border-border-subtle rounded-md border px-2 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={scrollLeft}
            className="border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            disabled={scrollPosition === 0}
            aria-label="Previous templates"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollRight}
            className="border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            disabled={scrollPosition >= maxScroll}
            aria-label="Next templates"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Community callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-surface-1/30 border-border-subtle mt-16 rounded-2xl border p-8 text-center"
        >
          <h3 className="text-text-primary mb-2 text-xl font-semibold">Community Templates</h3>
          <p className="text-text-secondary mx-auto mb-4 max-w-xl text-sm">
            Create and share your own templates. Fork from the community gallery or publish your
            methodology for others to use.
          </p>
          <span className="text-text-tertiary text-xs">Coming soon in Phase 3</span>
        </motion.div>
      </div>
    </section>
  );
}
