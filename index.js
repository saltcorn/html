const {
  textarea,
  text,
  div,
  pre,
  code,
  iframe,
  genericElement,
  script,
  domReady,
} = require("@saltcorn/markup/tags");
const xss = require("xss");
const { getState } = require("@saltcorn/data/db/state");
const { getSafeBaseUrl } = require("@saltcorn/data/utils");
const cheerio = require("cheerio");

xss.whiteList.kbd = [];
xss.whiteList.table = [
  "width",
  "border",
  "align",
  "valign",
  "class",
  "cellpadding",
  "cellspacing",
  "style",
];

xss.whiteList.span.push("style");
xss.whiteList.p.push("style");
xss.whiteList.td.push("style");
xss.whiteList.div.push("style");

const rmFirstWord = (s) => s.substring(s.indexOf(" ") + 1);

const highLight = (txt, w) => {
  const ix = txt.toUpperCase().indexOf(w.toUpperCase());
  if (ix < 0) return txt;
  const wlen = w.length;

  return (
    txt.substring(0, ix) +
    `<b>${txt.substring(ix, ix + wlen)}</b>` +
    txt.substring(ix + wlen, txt.length)
  );
};

const searchExtract = (txt, q) => {
  if (!q) return txt.substring(0, 150) + "...";
  const searchWords = q.split(" ");
  const txt_uc = txt.toUpperCase();
  const wordStarts = searchWords
    .map((w) => [w, txt_uc.indexOf(w.toUpperCase())])
    .filter(([w, ix]) => ix >= 0);
  if (wordStarts.length == 0) return txt.substring(0, 150) + "...";
  const ix = wordStarts[0][1];
  const start = Math.max(0, ix - 100);
  const extract = txt.substring(start, Math.min(ix + 120, txt.length - 1));
  //const replace = (t, [w, ...ws]) => w ? replace(t.replace(new RegExp(`\b${w}\b`, 'ig'), m=>`<b>${m}</b>`), ws) : t
  const replace = (t, [w, ...ws]) => (w ? replace(highLight(t, w), ws) : t);
  const replaced = replace(extract, searchWords);
  return (
    (start === 0 ? replaced + "..." : "..." + rmFirstWord(replaced)) + "..."
  );
  //return extract.replaceAll(wordStarts[0][0], `<b>${wordStarts[0][0]}</b>`)
};

const html = {
  name: "HTML",
  sql_name: "text",
  //TODO only remove embedded base64 images
  searchModifier: (fname) =>
    `regexp_replace(${fname},'<img[^>]*>|data:(\\w+)\\/(\\w+);base64,[^=]*=*','','g')`,

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
      run: (v, req) => {
        const s = xss(v || "")
          .split("<blockquote>")
          .join('<blockquote class="blockquote">');
        if (req.generate_email) {
          return s.replaceAll(
            'src="/files/',
            `src="${getSafeBaseUrl()}/files/`
          );
        } else return s;
      },
    },
    showAsCode: {
      isEdit: false,
      run: (v) =>
        pre(
          code(
            (v || "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#039;")
          )
        ),
    },
    showSearchExtract: {
      isEdit: false,
      run: (v, req) => {
        const $ = cheerio.load(`<body>${v}</body>`);
        const txt = $("body").text();
        return searchExtract(txt, req.query.q);
      },
    },
    unsafeNotEscaped: {
      isEdit: false,
      run: (v) => v,
    },
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
            }; -webkit-box-orient: vertical; word-break: break-all; visibility: visible;`,
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
            readonly: attrs.readonly,
          },
          xss(v || "")
        ),
    },
    CodeMirrorEdit: {
      isEdit: true,
      run: (nm, v, attrs, cls) =>
        textarea(
          {
            class: ["form-control", "to-code", cls],
            mode: "text/html",
            name: text(nm),
            id: `input${text(nm)}`,
            rows: 10,
            readonly: attrs.readonly,
          },
          xss(v || "")
        ),
    },
    in_iframe: {
      isEdit: false,
      configFields: [
        {
          name: "copy_stylesheets",
          label: "Copy stylesheets",
          type: "Bool",
        },
        {
          name: "content_height",
          label: "Height from content",
          type: "Bool",
        },
      ],
      run: (v, req, options) => {
        if (!v) return "";
        const rndid = `iframe${Math.floor(Math.random() * 16777215).toString(
          16
        )}`;
        return (
          (options.content_height
            ? script(`function fit${rndid}() {
        var ifrm =document.getElementById("${rndid}")
        var win = ifrm.contentWindow
        var doc = win.document
        var html = doc.documentElement
        var body = doc.body

        if(body) {
            //body.style.overflowX = "scroll" // scrollbar-jitter fix
            body.style.overflowY = "hidden"
        }
        if(html) {
            //html.style.overflowX = "scroll" // scrollbar-jitter fix
            html.style.overflowY = "hidden"
            var style = win.getComputedStyle(html)
            ifrm.width = parseInt(style.getPropertyValue("width")) // round value
            ifrm.height = parseInt(style.getPropertyValue("height"))
        }
            

    requestAnimationFrame(fit${rndid})
            }


addEventListener("load", requestAnimationFrame.bind(this, fit${rndid}))`)
            : "") +
          iframe({
            id: rndid,
            class: ["w-100", options.content_height && "gh-fit"],
            srcdocPre: options.copy_stylesheets
              ? v.replaceAll('"', "&quot;")
              : undefined,
            srcdoc: !options.copy_stylesheets
              ? v.replaceAll('"', "&quot;")
              : undefined,
          }) +
          (options.copy_stylesheets
            ? script(`  (()=>{
let ifrm = document.getElementById("${rndid}")
let ifrmContent = ''
for(const sty of document.querySelectorAll('link[rel=stylesheet]')) 
  ifrmContent+='<link href="'+sty.getAttribute("href")+'" rel="stylesheet">';
ifrmContent += ifrm.getAttribute("srcdocPre");
ifrm.setAttribute("srcdoc", ifrmContent);
          })()`)
            : "")
        );
      },
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

module.exports = {
  sc_plugin_api_version: 1,
  types: [html],
  ready_for_mobile: true,
};
