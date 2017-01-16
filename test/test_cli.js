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
    "shows help message if there is '-h' argument, even if args are invalid",
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
    "shows version if there is '-V' argument, even if args are invalid",
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

  (function() {
    var inputPath = 'test/resources/simple.scss';

    testCommandAsync(
      clientPath + ' ' + inputPath,
      "outputs contents of the input file to stdout if there's no '-o' option",
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

  (function() {
    var inputPath = 'test/resources/simple.scss';
    var outputPath = 'test/build/simple.css';

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    testCommandAsync(
      clientPath + ' ' + inputPath + ' -o ' + outputPath,
      "outputs contents of the input file to the output file",
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
});
