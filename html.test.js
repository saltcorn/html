const { describe, it, expect } = require("@jest/globals");
const {
  types: [
    {
      fieldviews: { showAll },
    },
  ],
} = require("./index");
describe("xss escaping", () => {
  it("passes simple text", () => {
    expect(showAll.run("Foo")).toBe("Foo");
  });
  it("passes simple html", () => {
    expect(showAll.run("<p>Foo</p>")).toBe("<p>Foo</p>");
  });
  it("filters out script tags", () => {
    expect(showAll.run("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });
  it("passes harmless style tags", () => {
    expect(
      showAll.run('<span style="background-color:#e74c3c">bar</span>')
    ).toBe('<span style="background-color:#e74c3c;">bar</span>');
  });
  it("blocks denied style tags", () => {
    expect(showAll.run('<span style="vertical-align: top;">bar</span>')).toBe(
      "<span style>bar</span>"
    );
  });
  it("filters allowed/denied style tags", () => {
    expect(
      showAll.run(
        '<span style="background-color:#e74c3c;vertical-align: top;">bar</span>'
      )
    ).toBe('<span style="background-color:#e74c3c;">bar</span>');
  });
});
