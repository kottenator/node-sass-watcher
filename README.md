# node-sass-watcher

SCSS watcher with post-processing.

`node-sass` has `--watch` option but it doesn't allow post-processing of the compiled CSS.

The only way is to "watch" the generated CSS file with another watcher. It's not convenient.

This tool provides simple way to do desired post-processing.

## Install

```sh
npm install node-sass-watcher
```

## Usage

```sh
node-sass-watcher file.scss -c "some-processing | another-processing" -o output.css
```
