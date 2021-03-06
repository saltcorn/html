const { textarea, text, div } = require("@saltcorn/markup/tags");
const xss = require("xss");

xss.whiteList.kbd = [];

const html = {
  name: "HTML",
  sql_name: "text",
  fieldviews: {
    showAll: {
      isEdit: false,
      run: (v) =>
        xss(v || "")
          .split("<blockquote>")
          .join('<blockquote class="blockquote">'),
    },
    unsafeNotEscaped: { isEdit: false, run: (v) => v },
    peek: {
      isEdit: false,
      configFields: [
        {
          name: "number_lines",
          label: "Number of lines",
          type: "Integer",
        },
      ],
      run: (v, req, options) =>
        div(
          {
            style: `overflow: hidden;text-overflow: ellipsis;display: -webkit-box; -webkit-line-clamp: ${
              (options && options.number_lines) || 3
            }; -webkit-box-orient: vertical;`,
          },
          text(xss(v || ""))
        ),
    },
    editHTML: {
      isEdit: true,
      run: (nm, v, attrs, cls) =>
        textarea(
          {
            class: ["form-control", cls],
            name: text(nm),
            id: `input${text(nm)}`,
            rows: 10,
          },
          xss(v || "")
        ),
    },
  },
  read: (v) => {
    switch (typeof v) {
      case "string":
        return v;
      default:
        return undefined;
    }
  },
};

module.exports = { sc_plugin_api_version: 1, types: [html] };
