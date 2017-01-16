var assert = require('assert');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var Client = require('../lib/client');
var version = require('../package').version;
var clientPath = 'node-sass-watcher';

process.env.PATH += ':./bin';

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
    var subprocess = spawn(command, {shell: true});
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

  describe('Arguments validation', function() {
    testCommand(
      clientPath,
      "show help message if there are no arguments",
      function(err, stdout, stderr) {
        checkHelpMessage(stderr);
      }
    );

    testCommand(
      clientPath + ' --help',
      "show help message if there is '--help' argument",
      function(err, stdout) {
        checkHelpMessage(stdout);
      }
    );

    testCommand(
      clientPath + ' -v -h',
      "show help message if there is '-h' argument, even if args are invalid",
      function(err, stdout) {
        checkHelpMessage(stdout);
      }
    );

    testCommand(
      clientPath + ' --version',
      "show version if there is '--version' argument",
      function(err, stdout) {
        assert.equal(stdout, version + '\n');
      }
    );

    testCommand(
      clientPath + ' -v -V',
      "show version if there is '-V' argument, even if args are invalid",
      function(err, stdout) {
        assert.equal(stdout, version + '\n');
      }
    );

    testCommand(
      clientPath + ' -v',
      "expect at least one input path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.NO_INPUT_PATH + '\n');
      }
    );

    testCommand(
      clientPath + ' input-1.scss input-2.scss',
      "expect no more than one input path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_POS_ARGS + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -o output-1.css -o output-2.css',
      "expect no more than one output path",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_OUTPUT_PATH + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -r one/ -r two/',
      "expect no more than one root dir",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_ROOT_DIR + '\n');
      }
    );

    testCommand(
      clientPath + ' input.scss -c "grep A" -c "grep B"',
      "expect no more than one command",
      function(err, stdout, stderr) {
        assert.equal(stderr, Client.prototype.messages.EXTRA_COMMAND + '\n');
      }
    );
  });

  describe('Run', function() {
    before(function() {
      if (!fs.existsSync('test/build/')) {
        fs.mkdirSync('test/build/');
      }
    });

    // No command, output to stout
    (function() {
      var inputPath = 'test/resources/simple.scss';

      testCommandAsync(
        clientPath + ' ' + inputPath,
        "output contents of the input file to stdout",
        function(subprocess, done) {
          // file content should appear in the stdout
          subprocess.stdout.on('data', function(data) {
            assert.equal(data.toString(), fs.readFileSync(inputPath).toString());
            subprocess.kill();
            done();
          });
        }
      );
    }());

    // No command, output to file
    (function() {
      var inputPath = 'test/resources/simple.scss';
      var outputPath = checkOutputFilePath('test/build/simple-wo-command.css');

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -o ' + outputPath,
        "output contents of the input file to the output file",
        function(subprocess, done) {
          var interval = setInterval(function() {
            if (fs.existsSync(outputPath)) {
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
    }());

    // With command, output to stout
    (function() {
      var inputPath = 'test/resources/simple.scss';

      testCommandAsync(
        clientPath + ' ' + inputPath + ' -c "sed s/red/orange/"',
        "output results of the command to stdout",
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
        "output results of the command to the output file",
        function(subprocess, done) {
          var interval = setInterval(function() {
            if (fs.existsSync(outputPath)) {
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
});
