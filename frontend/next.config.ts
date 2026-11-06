import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16 writes an AGENTS.md into this folder on `next dev`. The repo has its own at the root.
  agentRules: false,
};

export default nextConfig;
