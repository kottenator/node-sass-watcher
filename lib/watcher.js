var fs = require('fs');
var path = require('path');
var util = require('util');
var grapher = require('sass-graph');
var chokidar = require('chokidar');
var Emitter = require('events').EventEmitter;
var difference = require('lodash.difference');

function Watcher(inputPath, options) {
  options = options || {};
  this.inputPath = path.resolve(inputPath);
  this.includePaths = options.includePaths ? options.includePaths.map(function(includePath) {
    return path.resolve(includePath);
  }) : [];
  this.rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  this.verbosity = options.verbosity || 0;
  this.includeExtensions = options.includeExtensions || Watcher.defaultExtensions;
  this.watchedFiles = [];

  if (this.verbosity >= 1) {
    console.log('Start watching "%s"...', this.inputPath);
  }

  process.nextTick(this.emit.bind(this, 'init'));

  if (options.autoRun) {
    this.run();
  }
}

util.inherits(Watcher, Emitter);

Watcher.defaultExtensions = ['scss', 'sass', 'css'];

Watcher.prototype.run = function() {
  this.initRootDirWatcher();
  this.initInputPathWatcher();
};

Watcher.prototype.initRootDirWatcher = function() {
  var self = this;

  this.rootDirWatcher = chokidar.watch(this.rootDir, {
    // Ignore unsupported file extensions
    ignored: new RegExp('(\\.(?!(' + this.includeExtensions.join('|') + '))\\w+$|^\\w+$)')
  });

  ['add', 'addDir', 'unlink', 'unlinkDir'].forEach(function(eventName) {
    self.rootDirWatcher.on(eventName, function(path) {
      var info = self.updateInputPathWatcher();

      if (info[0].length > 0 || info[1].length > 0) {
        if (self.verbosity >= 2) {
          switch (eventName) {
            case 'add':
              console.log('New file "%s" is added', path);
              break;
            case 'addDir':
              console.log('New directory "%s" is added', path);
              break;
            case 'unlink':
              console.log('File "%s" is removed', path);
              break;
            case 'unlinkDir':
              console.log('Directory "%s" is removed', path);
              break;
          }
        }

        self.emit('update');
      }
    });
  });
};

Watcher.prototype.initInputPathWatcher = function() {
  var self = this;

  this.watchedFiles = this.getIncludedFiles();
  this.inputPathWatcher = chokidar.watch(this.watchedFiles);

  if (self.verbosity >= 2) {
    console.log("Initially watched files: %s", this.watchedFiles.join(', '));
  }

  this.inputPathWatcher.on('change', function(filePath) {
    self.updateInputPathWatcher();

    if (self.verbosity >= 2) {
      console.log('File "%s" is modified', filePath);
    }

    self.emit('update');
  });
};

Watcher.prototype.getIncludedFiles = function() {
  var newWatchedFilesGraph = grapher.parseFile(this.inputPath, {
    loadPaths: this.includePaths,
    extensions: this.includeExtensions
  });

  return Object.keys(newWatchedFilesGraph.index);
};

Watcher.prototype.updateInputPathWatcher = function() {
  var newWatchedFiles = this.getIncludedFiles();
  var startWatchingFiles = difference(newWatchedFiles, this.watchedFiles);
  var stopWatchingFiles = difference(this.watchedFiles, newWatchedFiles);
  this.watchedFiles = newWatchedFiles;

  if (this.verbosity >= 3 && startWatchingFiles.length) {
    console.log("Start watching files: %s", startWatchingFiles.join(', '));
  }

  if (this.verbosity >= 3 && stopWatchingFiles.length) {
    console.log("Stop watching files: %s", stopWatchingFiles.join(', '));
  }

  if (this.verbosity >= 3 && startWatchingFiles.length + stopWatchingFiles.length) {
    console.log("Currently watched files: %s", newWatchedFiles.join(', '));
  }

  this.inputPathWatcher.add(startWatchingFiles);
  this.inputPathWatcher.unwatch(stopWatchingFiles);

  return [startWatchingFiles, stopWatchingFiles];
};

module.exports = Watcher;
