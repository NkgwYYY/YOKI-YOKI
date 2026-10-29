type Environment = Readonly<Record<string, string | undefined>>;

/** Choose credentials and their destination together; never fail over on auth errors. */
export function openAIConnection(env: Environment = process.env) {
  const provider = env.YOKI_AI_PROVIDER?.trim() || "replit";
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} is required for the selected AI provider.`);
    return value;
  };

  if (provider === "openai") {
    return {
      apiKey: required("OPENAI_API_KEY"),
      // Never send a personal key to the Replit gateway or OPENAI_BASE_URL.
      baseURL: "https://api.openai.com/v1",
    };
  }
  if (provider !== "replit") {
    throw new Error("YOKI_AI_PROVIDER must be replit or openai.");
  }
  return {
    apiKey: required("AI_INTEGRATIONS_OPENAI_API_KEY"),
    baseURL: required("AI_INTEGRATIONS_OPENAI_BASE_URL"),
  };
}
