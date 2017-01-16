var assert = require('assert');
var fs = require('fs');
var Watcher = require('../lib/watcher');

describe('Watcher', function() {
  // expect tests to be slow, due to nature of the CLI (invoking sub-processes)
  this.slow(500);

  it("emits 'init' event on init", function(done) {
    var watcher = new Watcher('test/resources/simple.scss');
    watcher.run();
    watcher.on('init', done);
  });

  it("emits 'update' event on the input file change", function(done) {
    var inputPath = 'test/build/simple.scss';
    var inputContents = fs.readFileSync('test/resources/simple.scss');

    // Copy-paste input file to avoid original file modification
    fs.writeFileSync(inputPath, inputContents);

    var watcher = new Watcher(inputPath);
    watcher.run();

    // We need to wait, otherwise - FS 'update' event is triggered immediately
    // (probably because we copy-paste the input file).
    setTimeout(function() {
      watcher.on('update', done);
      fs.writeFileSync(inputPath, inputContents.toString().replace('red', 'orange'));
    }, 200);
  });

  it("emits 'update' event on SCSS dependency file change", function(done) {
    var inputPath = 'test/build/complex.scss';
    var dependencyPath = 'test/build/complex-dep.scss';
    var dependencyContents = fs.readFileSync('test/resources/complex-dep.scss');

    // Copy-paste input files to avoid original files modification
    fs.writeFileSync(inputPath, fs.readFileSync('test/resources/complex.scss'));
    fs.writeFileSync(dependencyPath, dependencyContents);

    var watcher = new Watcher(inputPath);
    watcher.run();

    // We need to wait, otherwise - FS 'update' event is triggered immediately
    // (probably because we copy-paste the input files).
    setTimeout(function() {
      watcher.on('update', done);
      fs.writeFileSync(dependencyPath, dependencyContents.toString().replace('red', 'orange'));
    }, 200);
  });
});
