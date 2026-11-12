import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, Dialog, Input, Select, ToastProvider, useToast } from "../index";

const meta: Meta = { title: "Kit" };
export default meta;
type S = StoryObj;

export const Buttons: S = { render: () => (
  <div style={{ display: "flex", gap: 12 }}>
    <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="danger">Danger</Button><Button busy>Busy</Button>
  </div>) };

export const Inputs: S = { render: () => (
  <div style={{ display: "grid", gap: 16, maxWidth: 320 }}>
    <Input label="Email" hint="We never share it" />
    <Input label="Name" error="Name is required" />
  </div>) };

export const Selects: S = { render: () => (
  <div style={{ maxWidth: 320 }}><Select label="Country" hint="Where you live"><option>Indonesia</option><option>Singapore</option></Select></div>) };

export const DialogExample: S = { name: "Dialog", render: () => {
  const [open, setOpen] = useState(false);
  return (<><Button onClick={() => setOpen(true)}>Open dialog</Button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Delete item" actions={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => setOpen(false)}>Delete</Button></>}>This action cannot be undone.</Dialog></>);
} };

function ToastButtons() { const { toast } = useToast(); return (
  <div style={{ display: "flex", gap: 12 }}>
    <Button onClick={() => toast({ message: "Saved" })}>Info toast</Button>
    <Button variant="danger" onClick={() => toast({ message: "Upload failed", variant: "error" })}>Error toast</Button>
  </div>); }
export const Toasts: S = { render: () => <ToastProvider><ToastButtons /></ToastProvider> };
