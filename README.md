# node-sass-watcher

[![Build Status](https://travis-ci.org/kottenator/node-sass-watcher.svg?branch=master)](https://travis-ci.org/kottenator/node-sass-watcher)

<img src="media/node-sass-watcher-logo.png" alt="Logo" width="270">

SCSS watcher with post-processing.

## Why?

`node-sass` has `--watch` option but it doesn't allow post-processing of the compiled CSS.

The only way is to "watch" the generated CSS file with another watcher. **It's not convenient**.

`node-sass-watcher` provides simple way to do SCSS watching with post-processing.

## Install

```sh
npm install node-sass-watcher
```

## Usage: CLI

```sh
node-sass-watcher src/input.scss -o dist/output.css -c "node-sass <input> | cssnano"
```

_Note:_ You need to run `node-sass` inside the post-processing command,
because I don't want to deal with all `node-sass` CLI arguments. 
In fact, current implementation is `node-sass`-independent. 

More about `--command` (`-c`):

* contents of the `input.scss` are passed to the command's `stdin`
* `<input>` will be replaced with the input file path
* `<output>` will be replaced with the output file path, provided with `--output` (`-o`) argument (if specified)
* Shell syntax is allowed: pipes (`|`), FD redirect (`> output.css`), etc

If there's no `-o` specified, the command output will be printed to `stdout`.

All CLI options:

```
Usage: node-sass-watcher <input.scss> [options]

Options:
  -c, --command             Pass a command to execute. Shell syntax allowed
  -o, --output              Output CSS file path
  -r, --root-dir            Directory to watch for addition/deletion of the files. Default: .
  -I, --include-path        Path to look for imported files. Use multiple if needed
  -e, --include-extensions  File extensions to watch. Default: scss, sass, css
  -v, --verbose             Verbosity level: from -v to -vvv
  -h, --help                Show help
  -V, --version             Show version number
```

## Usage: JS

Example: `node-sass` → `autoprefixer`.

```js
// watch-it.js
var fs = require('fs');
var sass = require('node-sass');
var postcss = require('postcss');
var autoprefixer = require('autoprefixer');
var Watcher = require('node-sass-watcher');

// Input variables
var inputFile = process.argv[2];
var outputFile = process.argv[3];
var supportedBrowsers = process.argv[4];

// Renderer
function render() {
  console.warn('Rendering "' + inputFile + '" file...');

  sass.render({file: inputFile}, function(err, result) {
    if (err) {
      console.error('Error: ' + err.message);
      return;
    }

    var processor = postcss([
      autoprefixer({
        browsers: supportedBrowsers.split(/,\s*/g)
      })
    ]);

    console.warn('Processing with Autoprefixer for browsers: ' + supportedBrowsers);

    processor.process(result.css.toString()).then(
      function(result) {
        console.warn('Outputting to "' + outputFile + '" file...');
        fs.writeFile(outputFile, result.css);
      },
      function(err) {
        console.error('Error: ' + err.message);
      }
    );
  });
}

// Start watching
var watcher = new Watcher(inputFile);
watcher.on('init', render);
watcher.on('update', render);
watcher.run();
```

Run your custom script:

```sh
node watch-it.js src/input.scss dist/output.css "ie >= 9, > 1%" 
```

## Collaboration

Feel free to create a ticket/pull-request ;)
