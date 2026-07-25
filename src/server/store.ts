/**
 * Maravae Shopify store link configuration.
 * Centralized — update here to change store URL and featured product everywhere.
 */
import { createServerFn } from "@tanstack/react-start";

/* ============================================
   STORE CONFIG
   ============================================ */

const STORE_URL = "https://maravae.com/shop";

const FEATURED_PRODUCT = {
  title: "The Rebuilding Journal",
  description: "A guided journal for women finding their way back to themselves.",
};

/* ============================================
   SERVER FUNCTION
   ============================================ */

export const getStoreLinkFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return {
      storeUrl: STORE_URL,
      featured: {
        title: FEATURED_PRODUCT.title,
        description: FEATURED_PRODUCT.description,
      },
    };
  });
