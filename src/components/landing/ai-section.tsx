'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Check, Key, Cloud, Server } from 'lucide-react';

const providers = [
  { name: 'Gemini', selected: true, icon: '◇', byok: true },
  { name: 'OpenAI Whisper', selected: false, icon: '◉', byok: true },
  { name: 'Ollama (Local)', selected: false, icon: '◈', byok: false },
];

export function AISection() {
  return (
    <div className="bg-base relative z-20 py-40">
      <div
        className="pointer-events-none absolute top-0 right-0 left-0"
        style={{
          height: '20%',
          background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.02) 0%, transparent 100%)',
        }}
      />
      <div className="flex w-full justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center gap-2"
          >
            <div className="bg-accent-primary h-2 w-2 rounded-full" />
            <span className="text-text-secondary text-sm">Multi-provider AI</span>
            <ChevronRight className="text-text-tertiary h-4 w-4" />
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-text-primary mb-8 max-w-3xl text-3xl leading-[1.1] font-medium tracking-tight sm:text-4xl md:text-5xl lg:text-[56px]"
          >
            Your choice of AI provider
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-text-secondary mb-8 max-w-md"
          >
            <span className="text-text-primary font-medium">Bring Your Own Key (BYOK)</span> or use
            fully local AI with Ollama. Choose from Gemini (native video), OpenAI Whisper, or run
            completely offline.
          </motion.p>

          {/* Learn more button */}
          <motion.a
            href="https://github.com/ertad-family/openinsights#ai-providers"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-surface-2 text-text-secondary border-border-default hover:bg-surface-3 mb-16 inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm transition-colors"
          >
            Learn more
            <ChevronRight className="h-4 w-4" />
          </motion.a>

          {/* Provider selector mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-24 flex justify-center"
          >
            <div
              style={{
                perspective: '900px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                width: '100%',
                maxWidth: '720px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  transformOrigin: 'top',
                  willChange: 'transform',
                  transform: 'translateY(0%) rotateX(30deg) scale(1.15)',
                  position: 'relative',
                }}
              >
                {/* Glass overlay effect */}
                <div className="glass border-border-default pointer-events-none absolute inset-0 z-10 rounded-lg border" />

                <div
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, var(--base) 100%)',
                    height: '80%',
                    position: 'absolute',
                    bottom: '-2px',
                    left: '-180px',
                    right: '-180px',
                    pointerEvents: 'none',
                    zIndex: 11,
                  }}
                />

                {/* Input field */}
                <div className="bg-surface-2/50 border-border-default rounded-t-xl border px-5 py-4">
                  <span className="text-text-tertiary italic">Select AI provider...</span>
                </div>

                {/* Dropdown options */}
                <div className="bg-surface-1/80 border-border-default rounded-b-xl border border-t-0 py-1">
                  {providers.map((provider, index) => (
                    <div
                      key={provider.name}
                      style={
                        provider.selected
                          ? {
                              transform: 'scale(1.04) rotateX(17deg)',
                              background:
                                'linear-gradient(var(--surface-3) 0%, var(--surface-2) 100%)',
                              borderRadius: '6px',
                              height: '48px',
                              position: 'relative',
                              boxShadow:
                                'inset 0 -2.75px 4.75px rgba(255, 255, 255, 0.04), inset 0 -0.752px 0.752px rgba(255, 255, 255, 0.02), 0 54px 73px 3px rgba(0, 0, 0, 0.3)',
                              zIndex: 20,
                              marginLeft: '-12px',
                              marginRight: '-12px',
                            }
                          : {
                              opacity: 1 - index * 0.15,
                              height: '42px',
                            }
                      }
                    >
                      <div className="flex h-full items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-text-secondary text-lg">{provider.icon}</span>
                          <span
                            className={
                              provider.selected ? 'font-medium text-white' : 'text-text-secondary'
                            }
                          >
                            {provider.name}
                          </span>
                          {provider.byok && (
                            <span className="bg-surface-3 text-text-tertiary flex items-center gap-1 rounded px-2 py-0.5 text-xs">
                              <Key className="h-3 w-3" />
                              BYOK
                            </span>
                          )}
                        </div>
                        {provider.selected && <Check className="text-text-secondary h-4 w-4" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom features grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="border-border-subtle grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border md:grid-cols-2"
          >
            {/* Cloud AI */}
            <div className="border-border-subtle bg-surface-1/30 border-r border-b p-8 md:border-b-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-accent-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Cloud className="text-accent-primary h-5 w-5" />
                </div>
                <h3 className="text-text-primary text-lg font-medium">Cloud AI</h3>
              </div>
              <p className="text-text-secondary mb-4 text-sm">
                Use Gemini for native video transcription or OpenAI Whisper for audio-first
                workflows. Pay only for what you use with your own API keys.
              </p>
              <ul className="text-text-secondary space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>1M+ token context window (Gemini)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Multi-language support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Speaker diarization</span>
                </li>
              </ul>
            </div>

            {/* Local AI */}
            <div className="bg-surface-1/30 p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-success/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Server className="text-success h-5 w-5" />
                </div>
                <h3 className="text-text-primary text-lg font-medium">Local AI (Ollama)</h3>
              </div>
              <p className="text-text-secondary mb-4 text-sm">
                Run completely offline with Ollama. Perfect for sensitive research, regulated
                industries, or privacy-first teams.
              </p>
              <ul className="text-text-secondary space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>100% data sovereignty</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>No API costs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Works offline</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
