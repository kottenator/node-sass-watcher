var assert = require('assert');
var fs = require('fs');
var exec = require('child_process').exec;
var Client = require('../lib/client');
var version = require('../package').version;
var clientPath = 'bin/node-sass-watcher';

function testCommand(command, message, check) {
  it(message + ' (command: ' + command + ')', function(done) {
    exec(command, function(err, stdout, stderr) {
      check(err, stdout, stderr);
      done();
    });
  });
}

function testCommandAsync(command, message, check) {
  it(message + ' (command: ' + command + ')', function(done) {
    var subprocess = exec(command);
    check(subprocess, done);
  });
}

function checkOutputFilePath(filePath) {
  checkOutputFilePath.cache = checkOutputFilePath.cache || {};

  if (filePath in checkOutputFilePath.cache) {
    throw new Error("Use other output file path, this one is used: " + filePath);
  }

  checkOutputFilePath.cache[filePath] = true;

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return filePath;
}

function checkHelpMessage(output) {
  assert.equal(output.split('\n')[0], "Usage: node-sass-watcher <input.scss> [options]");
  assert.ok(output.indexOf('Error:') == -1);
}

describe('CLI', function() {
  // expect tests to be slow, due to nature of the CLI (invoking sub-processes)
  this.slow(500);

  before(function() {
    if (!fs.existsSync('test/build/')) {
      fs.mkdirSync('test/build/');
    }
  });

  describe('Arguments validation', function() {
    testCommand(
      clientPath,
      "shows help message if there are no arguments",
      function(err, stdout, stderr) {
        checkHelpMessage(stderr);
      }
    );

    testCommand(
      clientPath + ' --help',
      "shows help message if there is '--help' argument",
      function(err, stdout) {
        checkHelpMessage(stdout);
      }
    );

    testCommand(
      clientPath + ' -v -h',
      "shows help message if there is '-h' argument, even if arguments are invalid",
      function(err, stdout) {
        checkHelpMessage(stdout);
      }
    );

    testCommand(
      clientPath + ' --version',
      "shows version if there is '--version' argument",
      function(err, stdout) {
        assert.equal(stdout, version + '\n');
      }
    );

    testCommand(
      clientPath + ' -v -V',
      "shows version if there is '-V' argument, even if arguments are invalid",
      function(err, stdout) {
        assert.equal(stdout, version + '\n');
      }
    );

    testCommand(
      clientPath + ' -v',
      "expects at least one input path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.NO_INPUT_PATH + '\n');
      }
    );

    testCommand(
      clientPath + ' input-1.scss input-2.scss',
      "expects no more than one input path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_POS_ARGS + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -o output-1.css -o output-2.css',
      "expects no more than one output path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_OUTPUT_PATH + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -r one/ -r two/',
      "expects no more than one root dir",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_ROOT_DIR + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -c "grep A" -c "grep B"',
      "expects no more than one command",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_COMMAND + '\n');
      }
    );
  });

  describe('Simple run', function() {
    // No command, output to stout
    (function() {
      var inputPath = 'test/resources/simple.scss';

      testCommandAsync(
        clientPath + ' ' + inputPath,
        "outputs input file contents to stdout",
        function(subprocess, done) {
          // file content should appear in the stdout
          subprocess.stdout.on('data', function(data) {
            assert.equal(data.toString(), fs.readFileSync(inputPath).toString());
            subprocess.kill();
            done();
          });
        }
      );
    })();

    // No command, output to file
    (function() {
      var inputPath = 'test/resources/simple.scss';
      var outputPath = checkOutputFilePath('test/build/simple-wo-command.css');

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -o ' + outputPath,
        "outputs input file contents to output file",
        function(subprocess, done) {
          var interval = setInterval(function() {
            if (fs.existsSync(outputPath) && fs.statSync(outputPath)['size']) {
              assert.equal(
                fs.readFileSync(inputPath).toString(),
                fs.readFileSync(outputPath).toString()
              );
              clearInterval(interval);
              done();
            }
          }, 20);
        }
      );
    })();

    // With command, output to stout
    (function() {
      var inputPath = 'test/resources/simple.scss';

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -c "sed s/red/orange/"',
        "outputs command results to stdout",
        function(subprocess, done) {
          // file content should appear in the stdout
          subprocess.stdout.on('data', function(data) {
            assert.equal(
              data.toString(),
              fs.readFileSync(inputPath).toString().replace('red', 'orange')
            );
            subprocess.kill();
            done();
          });
        }
      );
    })();

    // With command, output to file
    (function() {
      var inputPath = 'test/resources/simple.scss';
      var outputPath = checkOutputFilePath('test/build/simple-w-command.css');

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -c "sed s/red/orange/" -o ' + outputPath,
        "outputs command results to output file",
        function(subprocess, done) {
          var interval = setInterval(function() {
            if (fs.existsSync(outputPath) && fs.statSync(outputPath)['size']) {
              assert.equal(
                fs.readFileSync(inputPath).toString().replace('red', 'orange'),
                fs.readFileSync(outputPath).toString()
              );
              clearInterval(interval);
              done();
            }
          }, 20);
        }
      );
    })();
  });

  describe('Complex run', function() {
    // Pipe
    (function() {
      var inputPath = 'test/resources/simple.scss';

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -c "sed s/red/orange/ | sed s/orange/green/"',
        "outputs command results to stdout, using | in the command",
        function(subprocess, done) {
          // file content should appear in the stdout
          subprocess.stdout.on('data', function(data) {
            assert.equal(
              data.toString(),
              fs.readFileSync(inputPath).toString().replace('red', 'green')
            );
            subprocess.kill();
            done();
          });
        }
      );
    })();

    // Output redirect
    (function() {
      var inputPath = 'test/resources/simple.scss';
      var outputPath = checkOutputFilePath('test/build/simple-redirect.css');

      testCommandAsync(
        clientPath + ' ' + inputPath +
        ' -c "sed s/red/orange/ | sed s/orange/green/ > ' + outputPath + '"',
        "outputs command results to a file, using > in the command",
        function(subprocess, done) {
          var interval = setInterval(function() {
            if (fs.existsSync(outputPath) && fs.statSync(outputPath)['size']) {
              assert.equal(
                fs.readFileSync(inputPath).toString().replace('red', 'green'),
                fs.readFileSync(outputPath).toString()
              );
              clearInterval(interval);
              done();
            }
          }, 20);
        }
      );
    })();
  });
});
