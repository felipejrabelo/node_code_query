# Commands

## **CLI Commands:**

### `repl <package>`

Start a node.js REPL with the given packages installed.

## **REPL Commands:**

**Once the REPL is started you can use these commands:**


### `.install <package>`

Runs `npm install` for a given package.

### `.uninstall <package>`
Runs `npm uninstall` for a given package.

### `.editor`
Opens the editor mode, showing previously submitted lines. On save, the REPL state will be regenerated by running this code.

### `.save <file>`
Saves the REPL's submitted lines to a file.



### **Search Functionality**
**The following commands are only enabled in the search version of the tool.**

### `.packages <task>, <index?>`

Enter a task to search for packages. Prints a table of the 25 most starred packages and their descriptions. Optional index argument can be used to see more results. Starts at 0 by default. 

Example:
```
NCQ [] >  .packages read csv file, 0

  ┌─────────┬───────────────────┬───────────────────────────────────────────────┐
  │  index  │        name       │                   desciption                  │
  ├─────────┼───────────────────┼───────────────────────────────────────────────┤
  │    0    │ csv-to-collection │ reads a csv file and returns a collection of  │
  │         │                   │ objects, using the first record's values...   │ 
  └─────────┴───────────────────┴───────────────────────────────────────────────┘ 

```

### `.samples <package>`
Search for samples by package name. If no package/s specified, the command will search for code snippets from installed packages. Code snippets will be inserted into your prompt, and cyclable using the cycle button.

```sh
NCQ [] >  .samples csv-to-collection
.samples csv-to-collection
package: csv-to-collection, rank: 0, 1/2
NCQ [] > // this csv:
//
// name,age
// sally,5
// billy,10

// becomes...
[
  {name: "sally", age: "5"},
  {name: "billy", age: "10"}
]

```

### `.samplesByTask <task>`
Enter a task to find code snippets. Code snippets will be inserted into your prompt, and cyclable using the cycle button.

# Keybindings 


The following functinalities are mapped to these keys by default:


| **Command**     |    **Keys**  |
|-|-|
| open and close autocompletes | <kbd>tab</kbd> |
| insert autocomplete | <kbd>enter</kbd> |
| scroll autocompletes | <kbd>up</kbd> / <kbd>down</kbd> |
| Cycle snippets (Windows) | <kbd>alt</kbd> + <kbd>1</kbd> |
| Cycle snippets (MacOs) | <kbd>shift</kbd> + <kbd>right</kbd> |
| View command history | <kbd>ctrl</kbd> + <kbd>up</kbd> / <kbd>ctrl</kbd> + <kbd>down</kbd> |
| Move cursor up and down in REPL | <kbd>up</kbd> / <kbd>down</kbd> |
| New line in REPL | <kbd>down</kbd> on last line |
| Paste multi-line | <kbd>ctrl</kbd> + <kbd>v</kbd> |
| Copy current input | <kbd>ctrl</kbd> + <kbd>s</kbd> |

Because of different terminal configurations, many of these keybindings can be modified in the config.json file generated on first run.
