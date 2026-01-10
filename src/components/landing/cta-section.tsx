'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Github } from 'lucide-react';

export function CTASection() {
  return (
    <section className="bg-base relative overflow-hidden px-6 py-32">
      {/* Subtle glow */}
      <div
        className="glow-indigo-sm pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '600px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-text-primary text-3xl leading-tight font-medium tracking-tight md:text-4xl lg:text-[42px]"
          >
            Start analyzing research.
            <br />
            <span className="text-accent-primary">Own your insights.</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link
              href="/register"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium whitespace-nowrap text-gray-900 transition-colors hover:bg-gray-100"
            >
              Get started for free
            </Link>
            <a
              href="https://github.com/ertad-family/openinsights"
              target="_blank"
              rel="noopener noreferrer"
              className="border-border-default bg-surface-2 text-text-primary hover:bg-surface-3 flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
