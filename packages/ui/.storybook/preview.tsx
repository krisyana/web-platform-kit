import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import "../dist/styles.css";

const preview: Preview = {
  globalTypes: {
    theme: { description: "Theme", toolbar: { icon: "circlehollow", items: ["light", "dark"], dynamicTitle: true } },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, ctx) => {
      useEffect(() => { document.documentElement.setAttribute("data-theme", ctx.globals.theme); }, [ctx.globals.theme]);
      return <div style={{ padding: 24, background: "var(--kit-color-bg)", minHeight: "100vh" }}><Story /></div>;
    },
  ],
  parameters: { a11y: { test: "error" } },
};
export default preview;
