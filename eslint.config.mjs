import tseslint from "typescript-eslint";

const config = tseslint.config(
  ...tseslint.configs.recommended,
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
);
export default config;
