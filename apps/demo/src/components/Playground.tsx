"use client";
import { useState } from "react";
import { Button, Dialog, Input, Select, useTheme, useToast } from "@kit/ui";

export function Playground() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  return (
    <section aria-labelledby="pg" className="stack">
      <h2 id="pg">Component playground</h2>
      <Input label="Your name" hint="Shown in the toast" name="name" />
      <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </Select>
      <div className="row">
        <Button busy={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); toast({ message: "Saved" }); }, 600); }}>Save</Button>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm" actions={<Button onClick={() => setOpen(false)}>Close</Button>}>This dialog uses the native modal element.</Dialog>
    </section>
  );
}
