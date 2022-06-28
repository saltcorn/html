const { textarea, text, div } = require("@saltcorn/markup/tags");
const xss = require("xss");
const { getState } = require("@saltcorn/data/db/state");

xss.whiteList.kbd = [];
xss.whiteList.table = [
  "width",
  "border",
  "align",
  "valign",
  "class",
  "cellpadding",
  "cellspacing",
];

const html = {
  name: "HTML_locale",
  sql_name: "text",
  attributes: ({ table }) => {
    const strFields =
      table &&
      table.fields.filter(
        (f) =>
          (f.type || {}).name === "HTML" &&
          !(f.attributes && f.attributes.localizes_field)
      );
    const locales = Object.keys(
      getState().getConfig("localizer_languages", {})
    );
    return [
      ...(table
        ? [
            {
              name: "localizes_field",
              label: "Translation of",
              sublabel:
                "This is a translation of a different field in a different language",
              type: "String",
              attributes: {
                options: strFields.map((f) => f.name),
              },
            },
            {
              name: "locale",
              label: "Locale",
              sublabel: "Language locale of translation",
              input_type: "select",
              options: locales,
              showIf: { localizes_field: strFields.map((f) => f.name) },
            },
          ]
        : []),
    ];
  },
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
