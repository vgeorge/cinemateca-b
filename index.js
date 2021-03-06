const path = require("path");
const fs = require("fs-extra");
const { JSDOM } = require("jsdom");
const moment = require("moment");
const he = require("he");

const ID_START = 1;
const ID_END = 50000;
const outputDir = path.join(__dirname, "films");

String.prototype.replaceAll = function(search, replacement) {
  let target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};

function extractDate(str) {
  return moment(str, "YYYY.MM.DD").format("YYYY-MM-DD");
}

const patches = {
  "001924": {
    "Argumento/roteiro": {
      Roteiro: ["Diegues, Carlos"]
    }
  },
  "002174": {
    "Argumento/roteiro": {
      Roteiro: ["Omar, Arthur"]
    }
  },
  "003250": {
    "Argumento/roteiro": {
      Roteiro: ["Diegues, Carlos"]
    }
  },
  "003309": {
    "Argumento/roteiro": {
      Roteiro: ["Miziara, José"]
    }
  },
  "003333": {
    Estória: ["Morgantini, Araldo"]
  },
  "003333": {
    "Argumento/roteiro": {
      Roteiro: ["Paula, Francisco de", "Motta, Nelson"],
      Argumento: ["Paula, Francisco de", "Motta, Nelson"]
    }
  },
  "009335": {
    "Argumento/roteiro": {
      Roteiro: ["Cotrim, Costa"]
    }
  }
};

const sectionsInBackOrder = [
  "Observações",
  "Fontes consultadas",
  "Fontes utilizadas",
  "Conteúdo examinado",
  "Identidades/elenco:",
  "Narração",
  "Participação especial",
  "Ator(es) Convidado(s)",
  "Identidades/elenco:",
  "Locação:",
  "Canção",
  "Dados adicionais de música",
  "Música",
  "Dados adicionais de direção de arte",
  "Direção de arte",
  "Dados adicionais de montagem",
  "Montagem",
  "Dados adicionais de som",
  "Som",
  "Dados adicionais de fotografia",
  "Fotografia",
  "Direção",
  "Estória",
  "Argumento/roteiro",
  "Distribuição",
  "Produção  - Dados adicionais",
  "Produção",
  "Prêmios",
  "Termos geográficos",
  "Descritores secundários",
  "Termos descritores",
  "Gênero",
  "Sinopse",
  "Circuito exibidor",
  "Data e local de lançamento",
  "Certificados",
  "Data e local de produção",
  "Versão",
  "Material original",
  "Categorias",
  "Outras remetências de título",
  "Título atribuído ao episódio"
];

const sectionNamesWithColon = [
  "Ator(es) Convidado(s)",
  "Conteúdo examinado",
  "Estória",
  "Fontes consultadas",
  "Fontes utilizadas",
  "Narração",
  "Observações",
  "Outras remetências de título",
  "Participação especial"
];

const onelineSections = ["Conteúdo examinado", "Estória"];

const semicolonSeparatedArray = [
  "Termos geográficos",
  "Descritores secundários",
  "Termos descritores",
  "Gênero"
];

const commaSeparatedArray = ["Material original"];

const dashSeparatedArray = ["Categorias"];

const sourceSections = ["Fontes consultadas", "Fontes utilizadas"];

function parseIdentity(line) {
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
}

function parseAndRemoveSection(accumulator, sectionId) {
  const pageId = accumulator.id;
  let lines;
  try {
    let sectionSeparator;
    if (sectionNamesWithColon.includes(sectionId)) {
      sectionSeparator = `\n${sectionId}:`;
    } else {
      sectionSeparator = `section:${sectionId}`;
    }

    if (accumulator.remainingText.indexOf(sectionSeparator) > -1) {
      const data = {};

      const sectionText = accumulator.remainingText
        .split(sectionSeparator)
        .pop();

      // Remove section from remaining text
      const sectionStartIndex = accumulator.remainingText.lastIndexOf(
        sectionSeparator
      );
      const remainingText = accumulator.remainingText.substring(
        0,
        sectionStartIndex
      );

      // Check if section has patch
      if (patches[pageId] && patches[pageId][sectionId]) {
        return {
          remainingText,
          data: Object.assign({}, accumulator.data, patches[pageId])
        };
      }

      // FULL-TEXT SECTIONS
      if (
        [
          "Argumento/roteiro",
          "Canção",
          "Certificados",
          "Circuito exibidor",
          "Dados adicionais de música",
          "Observações",
          "Prêmios",
          "Sinopse",
          "Título atribuído ao episódio"
        ].includes(sectionId)
      ) {
        data[sectionId] = he.decode(sectionText);
      } else {
        // Parse section

        lines = sectionText
          .split("\n")
          .map(n => n.trim())
          .filter(n => n); // discard empty lines

        if (lines.length == 0)
          return {
            remainingText,
            data: accumulator.data
          };

        if (sourceSections.includes(sectionId)) {
          data[sectionId] = parseSources(lines);
        } else if (onelineSections.includes(sectionId)) {
          data[sectionId] = lines.pop();
        } else if (sectionId === "Locação:") {
          data["Locação"] = lines.pop();
        } else if (sectionId === "Narração") {
          data["Narração"] = lines;
        } else if (sectionId === "Identidades/elenco:") {
          data["Identidades/elenco"] = lines.map(parseIdentity);
        } else if (sectionId === "Ator(es) Convidado(s)") {
          data["Ator(es) Convidado(s)"] = lines.map(parseIdentity);
        } else if (sectionId === "Participação especial") {
          data["Participação especial"] = lines.map(parseIdentity);
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
      }

      // Return modified accumulator
      return {
        id: pageId,
        remainingText,
        data: Object.assign({}, accumulator.data, data)
      };
    } else {
      return accumulator;
    }
  } catch (error) {
    throw new Error(`${pageId} (${sectionId}): ${error.message}`);
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
  const data = await fs.readFile(`./html/${movieId}.html`, "utf8");

  let page = { id: movieId, data: {} };

  const dom = new JSDOM(data);
  const tableNode = dom.window.document.querySelector(
    ".middle > form:nth-child(2) > center:nth-child(32) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)"
  );

  if (!tableNode) {
    console.log(`${movieId}: empty`);
    return;
  }

  // MOVIE TITLE
  const titleDiv = tableNode.querySelector("div");
  if (!titleDiv) return;
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

  page = sectionsInBackOrder.reduce(parseAndRemoveSection, page);

  const outputFilename = path.join(outputDir, `${movieId}.json`);

  // Try to remove the file if it exists.
  try {
    await fs.remove(outputFilename);
  } catch (error) {
    // Nothing to do
  }
    
  const jsonOutput = JSON.stringify(page.data, null, 2);
  await fs.writeFile(outputFilename, jsonOutput);


  console.log(`${movieId}: ok`);
}

async function start() {
  try {
    // Ensure output dir exists.
    await fs.ensureDir(outputDir);

    let i = ID_START;
    while (i < ID_END) {
      await parseFile(i.toString().padStart(6, "0"));
      i++;
    }
  } catch (error) {
    console.log("Fatal error:", error);
  }
}

start();
