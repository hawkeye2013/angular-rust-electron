const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { parseCargoFile } = require('./parsers');
const { info, error, warning, cpFile, success } = require('./helpers');
const { runCargoBuild, runNeonBuild } = require('./Builders');

const cwd = process.cwd();

const exePath = path.join(cwd, 'executables');
const exeDirs = fs.readdirSync(exePath);
const platform = process.platform;

exeDirs.forEach((exeDir) => {
  info(`Processing Project: ${chalk.whiteBright(exeDir)}`);
  console.log(`---------------------------------------------`);

  let configPath = path.join(exePath, exeDir, 'config.json');

  try {
    let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (config.build) {
      info(
        `Building ${path.join(
          exePath,
          exeDir,
          'Cargo.toml'
        )} with ${config.language.toUpperCase()}`
      );
      switch (config.language) {
        case 'rust':
          switch (config.tooling) {
            case 'cargo':
              buildWithCargo(exePath, exeDir);
              break;

            case 'neon':
              buildWithNeon(exePath, exeDir);
              break;

            default:
              error(`Unknown Tooling - ${config.tooling}`);
              break;
          }

          break;
      }
    } else {
      warning('Build flag set to false - skipping build');
    }
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        console.log(
          `ERROR: Could not find ${err.path}. Please add file and try again.`
        );
        break;

      default:
        console.log(err);
        console.log('Could not complete action.  ERROR: UNKNOWN');

        break;
    }
    process.exit(1);
  }

  success(`Build Completed for ${exeDir}\n\n`);
});

process.exit(0);

function buildWithCargo(exePath, exeDir) {
  info('Running With Cargo');

  // Get cargo info
  const cargoFileContents = parseCargoFile(
    path.join(exePath, exeDir, 'Cargo.toml')
  );

  runCargoBuild(path.join(exePath, exeDir, 'Cargo.toml'));

  let targetDirFrom;
  let targetDirTo;
  let targetEXEName;

  if (platform === 'win32') {
    targetDirFrom = path.join(exePath, exeDir, 'target', 'release');

    targetDirTo = path.join(cwd, 'tools', cargoFileContents.package.name);

    targetEXEName = cargoFileContents.package.name + '.exe';
  } else {
    // Copy Executable to dist directory
    targetDirFrom = path.join(exePath, exeDir, 'target', 'release');

    targetDirTo = path.join(cwd, 'tools', cargoFileContents.package.name);

    targetEXEName = cargoFileContents.package.name;
  }

  if (!fs.existsSync(targetDirTo)) {
    info(`Directory ${targetDirTo} does not exist, creating it now.`);
    fs.mkdirSync(targetDirTo);
  }

  cpFile(
    path.join(targetDirFrom, targetEXEName),
    path.join(targetDirTo, targetEXEName)
  );
}

function buildWithNeon(exePath, exeDir) {
  info('Running With Neon');

  runNeonBuild(path.join(exePath, exeDir));

  let projectDirTo = path.join(cwd, 'tools', exeDir);

  let projectDirFrom = path.join(exePath, exeDir);

  makeDirs(projectDirTo);

  cpFile(
    path.join(projectDirFrom, 'package.json'),
    path.join(projectDirTo, 'package.json')
  );

  cpFile(
    path.join(projectDirFrom, 'lib', 'index.js'),
    path.join(projectDirTo, 'lib', 'index.js')
  );

  cpFile(
    path.join(projectDirFrom, 'native', 'index.node'),
    path.join(projectDirTo, 'native', 'index.node')
  );
}

function makeDirs(projectDirTo) {
  if (!fs.existsSync(projectDirTo)) {
    fs.mkdirSync(projectDirTo);
  }

  if (!fs.existsSync(path.join(projectDirTo, 'lib'))) {
    fs.mkdirSync(path.join(projectDirTo, 'lib'));
  }

  if (!fs.existsSync(path.join(projectDirTo, 'native'))) {
    fs.mkdirSync(path.join(projectDirTo, 'native'));
  }
}
