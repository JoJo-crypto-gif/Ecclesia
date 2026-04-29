export const generateWelcomeMessage = async (name: string, zoneName?: string): Promise<string> => {
  // Client-side API keys are intentionally not supported in production.
  return `Welcome to the family, ${name}! We are so glad you've joined us.${zoneName ? ` You have been assigned to ${zoneName}.` : ''} We look forward to seeing you grow!`;
};
