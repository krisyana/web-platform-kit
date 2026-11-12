import { startMockOidc } from "@kit/auth/testing";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const idp = await startMockOidc({ port: 4010, redirectUris: [`${appUrl}/api/auth/callback`], user: { sub: "demo-user", name: "Ada Lovelace", email: "ada@example.com" } });
console.log(`Mock OIDC provider (auto-approves, NOT for production): ${idp.issuer}`);
