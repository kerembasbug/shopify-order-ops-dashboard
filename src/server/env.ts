import { z } from "zod";

const shopifyStoreSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  adminToken: z.string().min(1),
});

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PASSWORD: z.string().min(1),
  APP_SESSION_SECRET: z.string().min(32),
  INTERNAL_CRON_SECRET: z.string().min(1),
  OPENCLAW_API_KEY: z.string().min(1),
  SHOPIFY_STORES_JSON: z.string().min(2),
});

export type ShopifyStore = z.infer<typeof shopifyStoreSchema>;

export type AppEnv = {
  databaseUrl: string;
  appPassword: string;
  appSessionSecret: string;
  internalCronSecret: string;
  openclawApiKey: string;
  shopifyStores: ShopifyStore[];
};

let cachedEnv: AppEnv | undefined;

export function parseEnv(input: Record<string, string | undefined>): AppEnv {
  const parsed = rawEnvSchema.parse(input);
  const stores = shopifyStoreSchema.array().parse(JSON.parse(parsed.SHOPIFY_STORES_JSON));

  return {
    databaseUrl: parsed.DATABASE_URL,
    appPassword: parsed.APP_PASSWORD,
    appSessionSecret: parsed.APP_SESSION_SECRET,
    internalCronSecret: parsed.INTERNAL_CRON_SECRET,
    openclawApiKey: parsed.OPENCLAW_API_KEY,
    shopifyStores: stores,
  };
}

export function getEnv(): AppEnv {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
