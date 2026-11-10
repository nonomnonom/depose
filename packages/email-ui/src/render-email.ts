import { render } from "@react-email/render";
import React from "react";

export interface RenderEmailOptions {
  component: React.ReactElement;
  props?: Record<string, unknown>;
}

export async function renderEmail({
  component,
  props = {},
}: RenderEmailOptions): Promise<string> {
  const element = React.cloneElement(component, props as React.Attributes);
  const html = await render(element);
  return html;
}
