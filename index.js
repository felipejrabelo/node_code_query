const repl = require('repl');
const fs = require('fs');
const path = require('path');
const string_similarity = require('string-similarity');
const natural = require('natural');


/* constants */
const version = "1.0.0";
const snippets_dir = "./snippets";
const threshold_sim = 0.25;
const tname = "NQL";

/* library description */
const library_desc = {};

/* snippet description */
const snippets = {};

// keywords extracted from package description and snippet description (needs to clean up)
const tfidf = new natural.TfIdf();

/* read description of snippets from snippets dir and update variable
 * library_desc and snippets */
fs.readdir(snippets_dir, (err, files) => {
    files.forEach(file => {
        const filepath = path.join(snippets_dir, file);
        const text = fs.readFileSync(filepath, 'utf8');
        // update dictionaries with library and snippet descriptions
        if (path.extname(file) == ".desc") {
            library_desc[file] = text;
            tfidf.addDocument(text);
        } else {
            lines = text.split("\n");
            desc = ""; rest = "";
            lines.forEach(line => {
                if (line.startsWith("#")) {
                    desc += line;
                } else {
                    rest += line + "\n";
                }                
            });
            tfidf.addDocument(desc);
            tfidf.addDocument(rest);
            snippets[desc] = rest.trim();
        }
    });
});

/* auto-completion function passed to repl.start as option. See:
 * https://nodejs.org/api/readline.html#readline_use_of_the_completer_function */
function completer(line) {
    tfidf.tfidfs('expect', function(i, measure) {
        console.log('document #' + i + ' is ' + measure);
    });
    
    const completions = '.help .exit version stack reset '.split(' ');
    const hits = completions.filter((c) => c.startsWith(line));
    // Show all completions if none found
    return [hits.length ? hits : completions, line];
}

/* creating REPL */
const myRepl = repl.start({prompt: tname+"> ", ignoreUndefined: true, completer: completer});

/* list_snippets */
Object.assign(myRepl.context,{
    list_s(keys_string) {
        const keys = Object.keys(snippets);
        keys.forEach(key => {
            /* this is a nesty hack. should take code into account*/
            doc = key;
            body = snippets[key];
            var sim = string_similarity.compareTwoStrings(keys_string, doc /* description of snippet */);
            if (sim >= threshold_sim) {
                console.log(doc);
                console.log(body);
            }
        });
    }
});

/* list_packages */
Object.assign(myRepl.context,{
    list_p(string) {
        for ([key, val] of Object.entries(library_desc)) {
            console.log(`${key}      ${val}`);
        }
    }});

/* version */
Object.assign(myRepl.context,{
    version() {
        console.log(`Node Query Library (NQL) version ${version}`);        
    }});
