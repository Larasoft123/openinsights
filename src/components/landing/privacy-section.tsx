'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Shield, Code2, Lock, CheckCircle2 } from 'lucide-react';

export function PrivacySection() {
  return (
    <div className="bg-base relative z-20 py-40">
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
            <div className="bg-success h-2 w-2 rounded-full" />
            <span className="text-text-secondary text-sm">Privacy & Control</span>
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
            Privacy isn&apos;t a feature.
            <br />
            It&apos;s the foundation.
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-text-secondary mb-12 max-w-xl text-lg leading-relaxed"
          >
            Built open source from day one. Self-host on your infrastructure, audit the code, and
            maintain complete control over your research data.
          </motion.p>

          {/* Feature grid */}
          <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="bg-accent-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Code2 className="text-accent-primary h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="text-text-primary mb-2 font-semibold">Open Source</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  MIT licensed. Audit the code, contribute features, or fork for your needs. No
                  black boxes, no vendor lock-in.
                </p>
                <a
                  href="https://github.com/ertad-family/openinsights"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-hover mt-2 inline-flex items-center gap-1 text-sm transition-colors"
                >
                  View on GitHub <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="bg-success/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Shield className="text-success h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="text-text-primary mb-2 font-semibold">Self-Hosted</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Deploy on your infrastructure. Docker Compose for development, Kubernetes for
                  scale. Your data never leaves your control.
                </p>
                <a
                  href="https://github.com/ertad-family/openinsights#deployment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-hover mt-2 inline-flex items-center gap-1 text-sm transition-colors"
                >
                  Deployment guide <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="bg-warning/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Lock className="text-warning h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="text-text-primary mb-2 font-semibold">Data Sovereignty</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  GDPR, HIPAA, or industry-specific compliance? Host in your region, control
                  retention policies, and audit everything.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="bg-info/10 flex h-12 w-12 items-center justify-center rounded-xl">
                  <CheckCircle2 className="text-info h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="text-text-primary mb-2 font-semibold">No Vendor Lock-in</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Export your data anytime. Postgres database with standard schemas. Switch
                  providers or fork the project—it&apos;s your choice.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Comparison callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="from-accent-primary/10 to-success/10 border-accent-primary/20 rounded-2xl border bg-gradient-to-r p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-text-primary mb-2 text-xl font-semibold">
                  Why researchers choose OpenInsights
                </h3>
                <p className="text-text-secondary text-sm">
                  Unlike cloud-only tools, you own your infrastructure and your data story from day
                  one.
                </p>
              </div>
              <a
                href="https://github.com/ertad-family/openinsights#comparison"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-foreground text-surface-1 hover:bg-foreground/95 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
              >
                See comparison
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
