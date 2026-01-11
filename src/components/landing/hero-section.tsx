'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardMockup } from './dashboard-mockup';
import { LandingNavbar } from './navbar';
import Link from 'next/link';

export function HeroSection() {
  const [yOffset, setYOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const offset = Math.min(scrollY / 300, 1) * -20;
      setYOffset(offset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const baseTransform = {
    translateX: 2,
    scale: 1.2,
    rotateX: 47,
    rotateY: 31,
    rotateZ: 324,
  };

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: '#09090B' }}
    >
      <LandingNavbar />

      {/* Subtle indigo glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -30%)',
          width: '1200px',
          height: '800px',
          background:
            'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col pt-28">
        {/* Hero text - contained and centered */}
        <div className="mt-16 flex w-full justify-center px-6">
          <div className="z-10 w-full max-w-4xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-text-primary text-4xl leading-[1.1] font-medium tracking-tight text-balance md:text-5xl lg:text-[56px]"
            >
              Research Intelligence, <span className="text-accent-primary">Privacy First</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-text-secondary mt-6 text-lg leading-relaxed"
            >
              Transform qualitative research with AI-powered transcription, semantic search, and
              rapid tagging.
              <br />
              Open source and self-hosted for complete data control.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex items-center gap-6"
            >
              <Link
                href="/register"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:bg-white"
              >
                Start for free
              </Link>
              <a
                href="https://github.com/ertad-family/openinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <span className="text-text-tertiary">Open source on</span> GitHub
                <span aria-hidden="true">→</span>
              </a>
            </motion.div>
          </div>
        </div>

        {/* 3D Stage - full bleed */}
        <div
          className="relative mt-16"
          style={{
            width: '100vw',
            marginLeft: '-50vw',
            marginRight: '-50vw',
            position: 'relative',
            left: '50%',
            right: '50%',
            height: '700px',
            marginTop: '-60px',
          }}
        >
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-72"
            style={{
              background: 'linear-gradient(to top, #09090B 20%, transparent 100%)',
            }}
          />

          {/* Perspective container */}
          <div
            style={{
              transform: `translateY(${yOffset}px)`,
              transition: 'transform 0.1s ease-out',
              contain: 'strict',
              perspective: '4000px',
              perspectiveOrigin: '100% 0',
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              position: 'relative',
            }}
          >
            {/* Transformed base */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: 0.5,
                duration: 1,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                transformOrigin: '0 0',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                width: '1600px',
                height: '900px',
                margin: '280px auto auto',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                transform: `translate(${baseTransform.translateX}%) scale(${baseTransform.scale}) rotateX(${baseTransform.rotateX}deg) rotateY(${baseTransform.rotateY}deg) rotate(${baseTransform.rotateZ}deg)`,
                transformStyle: 'preserve-3d',
                overflow: 'hidden',
              }}
            >
              <DashboardMockup />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
