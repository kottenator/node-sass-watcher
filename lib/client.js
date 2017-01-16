var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var yargs = require('yargs');
var Watcher = require('./watcher');

function Client(name) {
  this.name = name || '$0';
  this.initArgs();
  this.parseArgs();
  this.initWatcher();
}

Client.prototype.messages = {
  NO_INPUT_PATH: "Error: no input path specified",
  EXTRA_POS_ARGS: "Error: too many positional arguments",
  EXTRA_OUTPUT_PATH: "Error: only one output file is allowed",
  EXTRA_ROOT_DIR: "Error: only one root dir is allowed",
  EXTRA_COMMAND: "Error: only one command is allowed"
};

Client.prototype.initArgs = function() {
  this.yargs = yargs
    .usage('Usage: ' + this.name + ' <input.scss> [options]')
    .option('c', {
      alias: 'command',
      describe: 'Pass a command to execute; Shell syntax allowed',
      type: 'string',
      requiresArg: true
    })
    .option('o', {
      alias: 'output',
      describe: 'Output CSS file path',
      type: 'string',
      requiresArg: true
    })
    .option('r', {
      alias: 'root-dir',
      describe: 'Directory to watch for addition/deletion of the files',
      type: 'string',
      default: process.cwd(),
      requiresArg: true
    })
    .option('I', {
      alias: 'include-path',
      describe: 'Path to look for imported files; use multiple if needed',
      type: 'string',
      requiresArg: true
    })
    .option('e', {
      alias: 'include-extensions',
      describe: 'File extensions to watch',
      type: 'array',
      default: Watcher.defaultExtensions
    })
    .option('v', {
      alias: 'verbose',
      describe: "Verbosity level",
      type: 'count'
    })
    .help()
    .alias('h', 'help')
    .version(function() {
      return require('../package').version;
    })
    .alias('V', 'version')
    .wrap(null)
    .strict();
};

Client.prototype.parseArgs = function() {
  var argv = this.yargs.argv;

  if (process.argv.length === 2) {
    this.yargs.showHelp();
    process.exit(1);
  }

  if (argv._.length === 0) {
    console.error(this.messages.NO_INPUT_PATH);
    process.exit(1);
  }

  if (argv._.length > 1) {
    console.error(this.messages.EXTRA_POS_ARGS);
    process.exit(1);
  }

  this.inputPath = path.resolve(argv._[0]);
  this.outputPath = argv.output;

  if (this.outputPath instanceof Array) {
    console.error(this.messages.EXTRA_OUTPUT_PATH);
    process.exit(1);
  }

  if (this.outputPath) {
    this.outputPath = path.resolve(this.outputPath);
  }

  this.includePaths = argv.includePath ? [].concat(argv.includePath) : [];

  if (process.env.SASS_PATH) {
    this.includePaths = this.includePaths.concat(process.env.SASS_PATH.split(/:/).map(function(f) {
      return path.resolve(f);
    }));
  }

  this.includePaths = this.includePaths.map(function(includePath) {
    return path.resolve(includePath);
  });

  this.includeExtensions = argv.includeExtensions;
  this.rootDir = argv.rootDir;

  if (this.rootDir instanceof Array) {
    console.error(this.messages.EXTRA_ROOT_DIR);
    process.exit(1);
  }

  if (this.rootDir) {
    this.rootDir = path.resolve(this.rootDir);
  }

  this.verbosity = argv.verbose;
  this.command = argv.command;

  if (this.command instanceof Array) {
    console.error(this.messages.EXTRA_COMMAND);
    process.exit(1);
  }
};

Client.prototype.initWatcher = function() {
  this.watcher = new Watcher(this.inputPath, {
    rootDir: this.rootDir,
    includePaths: this.includePaths,
    includeExtensions: this.includeExtensions,
    verbosity: this.verbosity
  });

  this.watcher.on('init', this.processUpdate.bind(this));
  this.watcher.on('update', this.processUpdate.bind(this));
};

Client.prototype.processUpdate = function() {
  if (this.command) {
    this.processCommand();
  } else {
    this.processOutput();
  }

  if (this.verbosity === 1) {
    process.stderr.write('.');
  }
};

Client.prototype.processCommand = function() {
  var self = this;
  var inputPath = this.inputPath;
  var outputPath = this.outputPath;
  var command = this.command.replace('<input>', inputPath);

  if (outputPath) {
    command = command.replace('<output>', outputPath);
  }

  var subprocess = exec(command, function(err, stdout, stderr) {
    if (stderr) {
      console.error(stderr);
    }

    if (err) {
      console.error('Error: command "%s" exited with exit code %d', command, err.code);
      return;
    }

    if (stdout) {
      self.output(stdout);
    }
  });

  fs.createReadStream(inputPath).pipe(subprocess.stdin);
};

Client.prototype.processOutput = function() {
  var self = this;

  fs.readFile(this.inputPath, function(err, data) {
    if (err) {
      throw err;
    }

    self.output(data.toString());
  });
};

Client.prototype.output = function(data) {
  var outputPath = this.outputPath;

  if (outputPath) {
    fs.writeFile(outputPath, data);
  } else {
    process.stdout.write(data);
  }
};

Client.prototype.run = function() {
  this.watcher.run();
};

module.exports = Client;
