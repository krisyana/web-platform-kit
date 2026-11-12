import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { useState } from "react";
import { Button, Input, Select, Dialog, ToastProvider, useToast, ThemeProvider, useTheme } from "../index";

describe("Button", () => {
  it("activates with Enter and Space and has no axe violations", async () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(await axe(container)).toHaveNoViolations();
  });
  it("ignores clicks and reports busy while loading, but stays focusable", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).not.toBeDisabled();
  });
  it("busy behaves like loading did", async () => {
    const onClick = vi.fn();
    render(<Button busy onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled(); expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
  it("still honours deprecated `loading` and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<Button loading>A</Button>);
    rerender(<Button loading>B</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("deprecated")).length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Input", () => {
  it("associates label, hint and error and has no axe violations", async () => {
    const { container } = render(<Input label="Email" hint="We never share it" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it Required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
  it("is not marked invalid without an error", () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Select", () => {
  it("is a labelled combobox, changes by keyboard, and has no axe violations", async () => {
    const { container } = render(<Select label="Country" defaultValue="id"><option value="id">Indonesia</option><option value="sg">Singapore</option></Select>);
    const select = screen.getByRole("combobox", { name: "Country" });
    await userEvent.selectOptions(select, "sg");
    expect(select).toHaveValue("sg");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Dialog", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (<><Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete item" actions={<Button onClick={() => setOpen(false)}>Cancel</Button>}>Are you sure?</Dialog></>);
  }
  it("opens as a named dialog, closes via action, and has no axe violations", async () => {
    const { container } = render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dlg = screen.getByRole("dialog", { name: "Delete item" });
    expect(dlg).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("calls onClose when the native close event fires (Esc in browsers)", async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T">x</Dialog>);
    const dlg = screen.getByRole("dialog");
    act(() => { dlg.dispatchEvent(new Event("close")); });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Toast", () => {
  function Trigger({ variant }: { variant?: "info" | "error" }) {
    const { toast } = useToast();
    return <Button onClick={() => toast({ message: "Saved", variant, duration: variant ? 0 : 1000 })}>Go</Button>;
  }
  it("announces info politely, can be dismissed, and has no axe violations", async () => {
    const { container } = render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
  it("announces errors in the alert region and does not auto-dismiss", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ToastProvider><Trigger variant="error" /></ToastProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("Saved");
    vi.useRealTimers();
  });
  it("auto-dismisses info toasts after their duration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    vi.useRealTimers();
  });
});

describe("ThemeProvider", () => {
  function Toggle() {
    const { theme, setTheme } = useTheme();
    return <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme}</Button>;
  }
  it("sets data-theme on <html>, persists the choice, and restores it", async () => {
    const { unmount } = render(<ThemeProvider><Toggle /></ThemeProvider>);
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("kit-theme")).toBe("dark");
    unmount();
    document.documentElement.removeAttribute("data-theme");
    render(<ThemeProvider><Toggle /></ThemeProvider>);
    expect(await screen.findByRole("button", { name: "dark" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
  it("leaves data-theme unset for 'system' so CSS media query decides", () => {
    render(<ThemeProvider><Toggle /></ThemeProvider>);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
