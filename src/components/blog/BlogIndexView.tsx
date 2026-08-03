"use client";

import { motion, useReducedMotion } from "framer-motion";
import { blogPosts } from "@/content/blog";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { PostCard } from "@/components/blog/PostCard";

export function BlogIndexView() {
  const reduced = Boolean(useReducedMotion());

  return (
    <main id="main-content" className="px-6 pt-40 pb-24 sm:pt-48 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={staggerContainer(reduced)}
          initial="hidden"
          animate="visible"
          className="flex max-w-2xl flex-col items-start gap-4 text-left"
        >
          <motion.span
            variants={fadeUp(reduced)}
            className="rounded-full border border-foreground/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-foreground/80"
          >
            Blog técnico
          </motion.span>
          <motion.h1
            variants={fadeUp(reduced)}
            className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl"
          >
            Recursos técnicos
          </motion.h1>
          <motion.p
            variants={fadeUp(reduced)}
            className="max-w-2xl text-lg text-foreground/80"
          >
            Arquitectura, seguridad y buenas prácticas — escrito por el
            equipo que construye el software, sin relleno genérico.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {blogPosts.map((post) => (
            <motion.article key={post.slug} variants={fadeUp(reduced)}>
              <PostCard post={post} headingLevel="h2" readingTimeSuffix="min de lectura" />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
