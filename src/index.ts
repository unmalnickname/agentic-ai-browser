#!/usr/bin/env node

import { runGraph } from './automation.js';

async function main() {
  try {
    await runGraph();
  } catch (error) {
    console.error('Critical error:', error);
    process.exit(1);
  }
}

main();