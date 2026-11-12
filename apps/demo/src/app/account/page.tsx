import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { bff } from "@/lib/auth";

export default async function Account() {
  const session = await bff.getSession(new Request("http://internal/", { headers: await headers() }));
  if (!session) redirect("/api/auth/login?returnTo=/account");
  return (
    <>
      <h1>Account</h1>
      <p>Hello, <strong data-testid="account-name">{session.user.name ?? session.user.sub}</strong>. This page is rendered on the server from the session cookie; the browser never holds a token.</p>
    </>
  );
}
