// This file can be used to define common AI-related types if needed.
// For now, specific flow inputs/outputs are defined within their respective flow files.

// Example of how you might define shared types:
export interface BaseFlowInput {
  userId?: string; // Optional user identifier
}

export interface BaseFlowOutput {
  error?: string; // Optional error message
}

// Specific types for the new chat flow, mirroring Zod schemas for clarity if imported elsewhere
export interface ChatInput {
  message: string;
  // history?: Array<{ role: 'user' | 'model'; content: string }>;
}

export interface ChatOutput {
  response: string;
}
