const fs = require("fs");
const path = require("path");
// const htmlparser = require("htmlparser2");
// const { markdownToTxt } = require("markdown-to-txt"); //has an advisory for outdated dependency, i can copy the code if i need this in the actual tool
const Entities = require("html-entities").AllHtmlEntities;
const stripHtml = require("string-strip-html");

var id = 0;


/*
 * Copied from markdown-to-txt (it has an outdated dependency!)
 */

const marked = require('marked');

/* Using lodash escape implementation: https://github.com/lodash/lodash/blob/master/escape.js */
const htmlEscapes = {
  '&': '&amp',
  '<': '&lt',
  '>': '&gt',
  '"': '&quot',
  "'": '&#39',
};
const reUnescapedHtml = /[&<>"']/g;
const reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
const escapeHtml = (string) => {
    if (string && reHasUnescapedHtml.test(string)) {
        return string.replace(reUnescapedHtml, (chr) => htmlEscapes[chr]);
    }
    else {
        return string;
    }
};
const blockFn = (block) => block + '\n';
const inlineFn = (text) => text;
const newlineFn = () => '\n';
const emptyFn = () => '';
const renderer = {
    // Block elements
    code: blockFn,
    blockquote: blockFn,
    html: emptyFn,
    heading: blockFn,
    hr: emptyFn,
    list: blockFn,
    listitem: (text) => blockFn(text),
    paragraph: blockFn,
    table: (header, body) => blockFn(header) + blockFn(body),
    tablerow: blockFn,
    tablecell: blockFn,
    // Inline elements
    strong: inlineFn,
    em: inlineFn,
    codespan: inlineFn,
    br: newlineFn,
    del: inlineFn,
    link: (_0, _1, text) => inlineFn(text),
    image: (_0, _2, text) => inlineFn(text),
    text: inlineFn,
    //needed to add this one!
    checkbox: emptyFn,
};
/**
 * Converts markdown to plaintext. Accepts an option object with the following
 * fields:
 *
 *  - escapeHtml (default: true) Escapes HTML in the final string
 *  - gfp (default: true) Uses github flavor markdown (passed through to marked)
 *  - pedantic (default: false) Conform to markdown.pl (passed through to marked)
 *
 * @param markdown the markdown to convert
 * @param options  the options to apply
 * @returns the unmarked string (plain text)
 */
function markdownToTxt(markdown, options = {
    escapeHtml: true,
    gfm: true,
    pedantic: false,
}) {
    if (markdown) {
        const unmarked = marked(markdown, {
            gfm: options.gfm,
            pedantic: options.pedantic,
            renderer: renderer,
        });
        if (options.escapeHtml) {
            return escapeHtml(unmarked);
        }
        return unmarked;
    }
    return '';
}

/*
 * Analyse snippets extracted from a random sample of packages.
 */

var dir = __dirname;
//fall back if we run from node_code_query/dir
if (
  path.dirname(dir) != "node_code_query" &&
  path.dirname(dir) != "node_code_query/"
) {
  dir = path.join(dir, "../");
}
const BASE = dir;
const DATABASE_DIR = path.join(BASE, "data/readmes.json");
const README_DIR = path.join(BASE, "data/SampleReadmes.json");
const SNIPPET_DIR = path.join(BASE, "analysis/results/snippets.json");
const CSV_DIR = path.join(BASE, "analysis/results/snippets.csv");
const StreamObject = require("stream-json/streamers/StreamObject");
const StreamArray = require("stream-json/streamers/StreamArray");
const { info } = require("console");
const FENCE = /^\`\`\`(\s*)([\w_-]+)?\s*$/;
const OBJECT_ARRAY_OPEN = /({|\[)/;
const STRING = /"([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'/;
//const OBJECT = /(^{)|(^\w+\s?:\s?{)/;
const OBJECT = new RegExp(
  "(^" +
    OBJECT_ARRAY_OPEN.source +
    ")|(^\\w+\\s?:\\s?" +
    OBJECT_ARRAY_OPEN.source +
    ")|(^(" +
    STRING.source +
    ")\\s?:\\s?" +
    OBJECT_ARRAY_OPEN.source +
    ")"
);
const HEADER = /^#+\s+\S+/;
const HEADERUNDER = /^(\s*-+\s*)$/;
const INLINE = /^(\s*`.*`\s*)$/;

/**
 * Gets 384 random readme files and saves them into README_DIR.
 */

async function getRandomReadmes() {
  //first, get number of packages
  var counter = 0;

  function onData() {
    counter++;
  }

  function onEnd() {
    console.log(counter);
  }

  //await readFile(onData, onEnd, "data/readmes.json");

  counter = 925317; //if we know the value already

  //get 384 random indexes
  var samples = 384;
  var list = [];

  //generate a list of 1-count
  for (var i = 0; i < counter; i++) {
    list.push(i);
  }

  list = shuffle(list);

  //get the random sample
  var sample = list.slice(0, samples);

  //sort so we can look in order
  sample.sort((a, b) => a - b);

  //add to object
  var readmes = {};
  var counter2 = 0;
  var i = 0;

  function onData(data, pipeline) {
    var name = data["key"];
    var readme = data["value"];
    //add if matches in sample
    if (counter2 == sample[i]) {
      //the package names are formatted for windows file names, change back
      name = name.replace(/%2A/g, "*");
      name = name.replace(/%2F/g, "/");
      name = name.replace(/%2E/g, ".");
      readmes[name] = readme;
      //increment the next to look for
      i++;
    }
    counter2++;
  }

  await readFile(onData, function () {}, "data/readmes.json");

  //write readmes to file
  fs.writeFileSync(README_DIR, JSON.stringify(readmes), { encoding: "utf-8" });
}

/**
 * Uses stream-json to load the database without storing it into memory.
 * Returns a promise when the end event triggers.
 */
async function readFile(onData = function () {}, onEnd = function () {}, file, streamer = StreamObject.withParser() ) {
  return (promise = new Promise((resolve, reject) => {
    //create pipeline
    const pipeline = fs.createReadStream(file).pipe(streamer);

    //on data, load into memory
    pipeline.on("data", async (data) => {
      onData(data, pipeline);
    });
    //when done, process
    pipeline.on("end", (data) => {
      onEnd();
      resolve();
    });
  }));
}

/**
 * Array shuffle function using Fisher-Yates
 * Copied from: https://stackoverflow.com/a/2450976
 */
function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

/**
 * Check if snippet is valid.
 */
function validSnippet(snippet) {
  //trim and convert to lowercase
  var normalized = snippet.trim().toLowerCase();
  var lines = normalized.split("\n");
  var valid = false;

  //remove comments
  normalized = "";
  var comment = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    if (line.startsWith("//")) {
    } else if (!comment) {
      normalized += lines[i];
    }
  }

  if (normalized.startsWith("$ ")) {
    //starts with $ sign, representing a terminal. must have a space as js variables can start with $
    valid = false;
  } else if (normalized.startsWith("npm ")) {
    //looking for npm commands
    valid = false;
  } else if (normalized.startsWith("bower install")) {
    //looking for bower install
    valid = false;
  } else if (normalized.startsWith("install")) {
    //more general install command
    valid = false;
  } else if (normalized.match(OBJECT)) {
    //console.log(snippet);
    valid = false;
  } else {
    valid = true;
  }

  return valid;
}


async function main2() {
  var i = 0;

  var db = [];


  function onData(data, pipeline) {
    var name = data["key"];
    var readme = data["value"];
    name = name.replace(/%2A/g, "*");
    name = name.replace(/%2F/g, "/");
    name = name.replace(/%2E/g, ".");

    var snippets = getSnippets(readme, name);

    if(snippets["snippets"].length > 1){
      db.push(snippets);
    }


    if(i % 1000 == 0){
      console.log(i);
    }
    
    // if(i == 100){
    //   console.log(i);
    //   pipeline.emit("end")
    //   pipeline.end();
    //   //process.exit();
    // }

    i++;
  }

  function onEnd(){
    if(fs.existsSync("data/snippets.json")){
      fs.unlinkSync("data/snippets.json");
    }

    fs.appendFileSync("data/snippets.json", "[", {encoding : "utf-8"});
    var first = true;
    for(var p of db){
      var content = JSON.stringify(p);
      if(first){
        first = false;
      }
      else{
        content = ", " + content;
      }
      fs.appendFileSync("data/snippets.json", content, {encoding : "utf-8"});
    }

    fs.appendFileSync("data/snippets.json", "]", {encoding : "utf-8"})
  }

  await readFile(onData, onEnd, "data/readmes.json");
}

/**
 * Process for snippets.
 */
function main() {
  var data = JSON.parse(fs.readFileSync(README_DIR));
  var packages = Object.keys(data);

  var allSnippets = [];

  for (let i = 0; i < packages.length; i++) {
    var name = packages[i];
    var readme = data[name];

    //if i forgot to do this, just to make the names readable again
    name = name.replace(/%2A/g, "*");
    name = name.replace(/%2F/g, "/");
    name = name.replace(/%2E/g, ".");

    //get snippets
    var snippets = getSnippets(readme, name);

    //console.log(snippets);

    allSnippets.push(snippets);
  }

  //console.log(JSON.stringify(allSnippets, null, 1))

  fs.writeFileSync(SNIPPET_DIR, JSON.stringify(allSnippets, null, 1), {
    encoding: "utf-8",
  });
}

/**
 * Extract snippets from readme file.
 * Ignore code blocks marked with non-js
 */
function getSnippets(readme, package) {
  var snippets = [];
  var snippetObject = {};
  var snippetList = {};
  var num = 0;
  snippetList["package"] = package;

  var lines = readme.split("\n");
  var block = false;
  var opening;
  var start = -1;
  lines.forEach((line, index) => {
    var match = line.match(FENCE);
    if (match) {
      if (block == false) {
        //start new code block
        block = "";
        opening = match;
        start = index;
      } else {
        //finish block
        //ignore sippets marked explicitly as non js, valid js aliases from https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
        if (
          opening[2] == "js" ||
          opening == "```" ||
          opening[2] == "javascript" ||
          opening[2] == "node"
        ) {
          var pass = validSnippet(block);

          if (pass) {
            snippetObject["description"] = getDescription(
              lines,
              start,
              block,
              package
            );
            snippetObject["snippet"] = block;
            snippetObject["num"] = num;
            //global id
            snippetObject["id"] = id;
            id++;
            num++;
            snippets.push(snippetObject);
            snippetObject = {};
          }
        }
        block = false;
      }
    } else if (block !== false) {
      block += line + "\n";
    }
  });

  snippetList["snippets"] = snippets;

  return snippetList;
}

/**
 * Look upwards from start point for a description of the code snippet.
 */
function getDescription(lines, start, block, package) {
  var description = "";
  var previousLine;
  snippet = false;
  headerUnder = false; //--------------------
  wasSnippet = false; //debug

  var line;
  for (let i = start - 1; i >= 0; i--) {
    var inline = false;
    previousLine = line;
    line = lines[i];

    //stop at another snippet
    if (line.trim().match(FENCE)) {
      if (snippet) {
        snippet = false;
        line = ""; //make line empty so we dont add the fence
      }
      //if we have no description, keep going
      else if (description.trim().length < 1) {
        snippet = true;
        wasSnippet = true;
      } else {
        break;
      }
    }

    //ignore inline on its own line in description
    //` npm install `
    else if (line.match(INLINE)) {
      inline = true;
    }

    //stop at header
    else if (line.trim().match(HEADER)) {
      //include header
      if (description.trim().length > 0) {
        description = line + "\n" + description;
        break;
      }
    }

    //header with a line underneath
    else if (line.match(HEADERUNDER)) {
      break;
    }

    if (!snippet && line && !inline) {
      description = line + "\n" + description;
    }
  }

  // if(k){
  //   console.log("desc\n" + description);
  //   console.log(block)
  //   //console.log(lines);
  // }

  description = format(description);
  return description;
}

/**
 * Make a CSV for a spreadsheet
 */
function makeCSV() {
  //read and get data
  var contents = fs.readFileSync(SNIPPET_DIR, { encoding: "utf-8" });
  var data = JSON.parse(contents);

  //initialize to write
  var toWrite = "package\tsnippet\tdescription\n";

  //get packages
  var packages = Object.keys(data);
  for (var i = 0; i < packages.length; i++) {
    //get snippets for each
    var packageArray = data[packages[i]];
    var package = packageArray["package"];
    var snippets = packageArray["snippets"];
    if (snippets) {
      for (var j = 0; j < snippets.length; j++) {
        var snippet = snippets[j];
        var code = JSON.stringify(snippet["snippet"]).replace(/\t/g, "\\t");
        var description = JSON.stringify(snippet["description"]).replace(
          /\t/g,
          "\\t"
        );

        var line = package + "\t" + code + "\t" + description;

        toWrite += line + "\n";
      }
    }
  }

  fs.writeFileSync(CSV_DIR, toWrite, { encoding: "utf-8" });
}

/**
 * Format markdown to plain text using marked.
 */
function format(string) {
  var text = markdownToTxt(string, { escapeHtml: false });

  const entities = new Entities();

  text = entities.decode(text);

  //empty links <a href=""></a> remain
  text = stripHtml(text);

  return text;
}

//reduce info.json down to only packages we have snippets for
async function getInfo(){
  var info_dir = "data/info.json";
  var newInfo_dir = "data/packageStats.json";
  var packages = [];
  var infoObject = [];


  var snippets  = fs.readFileSync("data/snippets.json", {encoding : "utf-8"});
  snippets = JSON.parse(snippets);
  for(var i=0; i<snippets.length; i++){
    var package = snippets[i];
    var name = package["package"];
    packages.push(name);
  }


  // var stream = fs.createReadStream("data/readmes.json", {encoding: "utf-8"});

  function onData(data){
    var value = data["value"];
    var package = value["Name"]
    if(packages.includes(package)){
      infoObject.push(value);
    }

  }

  function onEnd(){
    console.log(packages.length + ", " + infoObject.length);
  }

  await readFile(onData, onEnd, info_dir, StreamArray.withParser());

  fs.writeFileSync(newInfo_dir, "[", {encoding: "utf-8"});
  for(var i=0; i<infoObject.length; i++){
    var o = infoObject[i];
    if(i != 0){
      fs.appendFileSync(newInfo_dir, ", ", {encoding: "utf-8"});
    }
    fs.appendFileSync(newInfo_dir, JSON.stringify(o), {encoding: "utf-8"})
  }
  fs.appendFileSync(newInfo_dir, "]", {encoding: "utf-8"})
}

//comment out unless u need to generate a new set of readmes
//getRandomReadmes();

//gets snippets
// main();

//run on full db
//main2();

//verify json file is parsable
function readdddd(){
  var snippets  = fs.readFileSync("data/snippets.json", {encoding : "utf-8"});
  var data = JSON.parse(snippets);

  var count = 0;

  for(var pk of data){
    count += pk["snippets"].length;
  }

  console.log(count)

  //console.log(JSON.parse(snippets));

  // var a= [];
  // readFile(function(data){console.log(data["value"])}, function(){console.log(a.length)}, "data/snippets.json")
}

// readdddd();

//getInfo(); //run with node --max-old-space-size=12192 analysis/readmes for more RAM
//dont worry, the final files will be much smaller + js stores strings in utf-16, and we're not doing any optimization here


//when we want to make a spreadsheet
//makeCSV();
