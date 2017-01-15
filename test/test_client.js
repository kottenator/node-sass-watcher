var assert = require('assert');
var exec = require('child_process').exec;
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

function checkHelpMessage(output) {
  assert.equal(output.split('\n')[0], "Usage: node-sass-watcher <input.scss> [options]");
  assert.ok(output.indexOf('Error:') == -1);
}

describe('CLI', function() {
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
    command = clientPath + ' -v',
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
});
