const { textarea, text } = require("@saltcorn/markup/tags");

const html = {
  name: "HTML",
  sql_name: "text",
  fieldviews: {
    showAll: { isEdit: false, run: (v) => v },
    peek: {
      isEdit: false,
      run: (v) => text(v && v.length > 10 ? v.substring(0, 10) : v),
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
          v || ""
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
