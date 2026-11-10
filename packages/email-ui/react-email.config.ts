import { defineConfig } from "react-email";

export default defineConfig({
  entryPoints: [
    "src/components/email/layout.tsx",
    "src/components/email/reset-password.tsx",
    "src/components/email/verify-email.tsx",
    "src/components/email/welcome.tsx",
    "src/components/email/inquiry.tsx",
    "src/components/email/order-confirmation.tsx",
  ],
  features: {
    cssInliner: {
      compile: true,
    },
  },
});
