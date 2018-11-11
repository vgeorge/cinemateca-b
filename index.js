const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const yaml = require("js-yaml");
const moment = require("moment");
const he = require("he");

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};

function extractDate(str) {
  return moment(str, "YYYY.MM.DD").format("YYYY-MM-DD");
}

const semicolonSeparatedArray = [
  "Termos geográficos",
  "Descritores secundários",
  "Termos descritores",
  "Gênero"
];

const commaSeparatedArray = ["Material original"];

const dashSeparatedArray = ["Categorias"];

const sourceSections = ["Fontes consultadas", "Fontes utilizadas"];

const fulltextSections = ["Sinopse", "Circuito exibidor", "Certificados"];

function parseAndRemoveSection(accumulator, sectionId) {
  let title;
  if (
    [
      "Fontes utilizadas",
      "Fontes consultadas",
      "Observações",
      "Conteúdo examinado",
      "Outras remetências de título"
    ].includes(sectionId)
  ) {
    title = `${sectionId}:`;
  } else {
    title = `section:${sectionId}`;
  }

  if (accumulator.remainingText.indexOf(title) > -1) {
    const [remainingText, sectionText] = accumulator.remainingText.split(title);

    const lines = sectionText
      .split("\n")
      .map(n => n.trim())
      .filter(n => n); // discard empty lines

    const data = {};

    if (sourceSections.includes(sectionId)) {
      data[sectionId] = parseSources(lines);
    } else if (sectionId === "Conteúdo examinado") {
      data[sectionId] = lines.pop();
    } else if (sectionId === "Identidades/elenco:") {
      data["Identidades/elenco"] = lines.map(line => {
        let [person, identity] = line.split("(");
        person = person.trim();
        return identity
          ? {
              person,
              identity: identity.replace(")", "")
            }
          : {
              person
            };
      });
    } else if (
      fulltextSections.concat("Observações").includes(sectionId)
    ) {
      data[sectionId] = lines.join("\n");
    } else if (
      semicolonSeparatedArray
        .concat("Outras remetências de título")
        .includes(sectionId)
    ) {
      data[sectionId] = lines
        .pop()
        .split(";")
        .map(i => i.trim());
    } else if (commaSeparatedArray.includes(sectionId)) {
      data[sectionId] = lines
        .pop()
        .split(",")
        .map(i => i.trim());
    } else if (dashSeparatedArray.includes(sectionId)) {
      data[sectionId] = lines
        .pop()
        .split("/")
        .map(i => i.trim());
    } else {
      data[sectionId] = {};
      lines.forEach(line => {
        const [key, value] = line.split(":");
        const entries = value.split(";").map(i => i.trim());
        data[sectionId][key] = entries.length == 1 ? entries[0] : entries;
      });
    }
    return {
      remainingText,
      data: Object.assign(accumulator.data, data)
    };
  } else {
    return accumulator;
  }
}

function parseSources(lines) {
  return lines.map(i => {
    if (i.indexOf("<a") > -1) {
      const anchorDom = new JSDOM(i);
      const result = {
        id: i
          .replace(`<a href="#" onclick="return( showFonte('`, "")
          .split("'")[0]
      };

      const text = anchorDom.window.document.body.textContent;

      if (text != result.id) result.text = text;
      return result;
    } else {
      return { text: i };
    }
  });
}

async function parseFile(movieId) {
  let html;
  fs.readFile("./espelho/004000.html", "utf8", (err, data) => {
    if (err) return;

    let page = { data: {} };

    const dom = new JSDOM(data);
    const tableNode = dom.window.document.querySelector(
      ".middle > form:nth-child(2) > center:nth-child(32) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)"
    );

    // MOVIE TITLE
    const titleDiv = tableNode.querySelector("div");
    tableNode.removeChild(titleDiv);
    page.data["Título"] = titleDiv.textContent;

    let html = tableNode.innerHTML;

    page.remainingText = html
      .trim()
      .replace("<!-- formato de apresentacao da base -->", "")
      .replaceAll("<br>", "\n")
      .replaceAll("<b>", "")
      .replaceAll("</b>", "")
      .replaceAll("<blockquote>", "\n")
      .replaceAll("</blockquote>", "\n")
      .replaceAll('<b class="label">', "section:");

    page = []
      .concat(
        "Observações",
        sourceSections,
        [
          "Conteúdo examinado",
          "Identidades/elenco:",
          "Canção",
          "Direção de arte",
          "Montagem",
          "Fotografia",
          "Direção",
          "Argumento/roteiro",
          "Distribuição",
          "Produção"
        ],
        semicolonSeparatedArray,
        fulltextSections,
        ["Data e local de lançamento", "Data e local de produção"],
        commaSeparatedArray,
        dashSeparatedArray,
        "Outras remetências de título"
      )
      .reduce(parseAndRemoveSection, page);

    console.log(yaml.dump(page));
  });
}

parseFile();
