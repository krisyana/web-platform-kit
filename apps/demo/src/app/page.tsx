import { AuthStatus } from "@/components/AuthStatus";
import { Playground } from "@/components/Playground";

export default function Home() {
  return (
    <>
      <h1>Web Platform Kit demo</h1>
      <p>Components from <code>@kit/ui</code>, login through the <code>@kit/auth</code> BFF, and events collected by <code>@kit/telemetry</code>.</p>
      <AuthStatus />
      <Playground />
    </>
  );
}
