import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamView } from "./TeamView";
import { locales } from "@/lib/i18n";
import { teamMemberPath } from "@/lib/teamPaths";

const member = {
  slug: "cesar-leon",
  name: "César León",
  role: "Frontend",
  description: "Frontend con Next.js.",
  photo: null,
  linkedinUrl: null,
  githubUrl: null,
};

describe("TeamView", () => {
  it.each(locales)("[%s] el nombre de cada persona enlaza a su página", (locale) => {
    const html = renderToStaticMarkup(createElement(TeamView, { locale, members: [member] }));
    expect(html).toContain(`href="${teamMemberPath(locale, "cesar-leon")}"`);
  });
});
