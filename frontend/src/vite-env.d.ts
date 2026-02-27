/// <reference types="vite/client" />

import "vue";

declare module "vue" {
  interface HTMLAttributes {
    "data-slot"?: string;
  }
}
