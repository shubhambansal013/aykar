const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Executes a command and returns the output.
 * @param {string} command
 * @returns {string}
 */
function run(command) {
  console.log(`Executing: ${command}`);
  return execSync(command, { encoding: 'utf8', stdio: 'inherit' });
}

/**
 * Checks if the worker exists on Cloudflare.
 * @param {string} name
 * @returns {boolean}
 */
function checkWorkerExists(name) {
  try {
    console.log(`Checking if worker "${name}" exists...`);
    // wrangler deployments list returns exit code 0 if worker exists, non-zero otherwise
    // We use --json to get a machine-readable output and check if it's an empty list or an error
    const output = execSync(`npx wrangler deployments list --name ${name} --json`, { stdio: 'pipe', encoding: 'utf8' });
    const deployments = JSON.parse(output);
    // If it returns an object with deployments array, it exists.
    // Depending on wrangler version, it might be an array directly or { deployments: [] }
    if (Array.isArray(deployments) && deployments.length > 0) return true;
    if (deployments.deployments && deployments.deployments.length > 0) return true;

    // If we reach here, it might exist but have no deployments, which is unlikely for an existing worker
    // but possible if it was just created via dashboard.
    // Let's assume if the command succeeded, the worker exists in some form.
    return true;
  } catch (error) {
    // If it fails, it might be because the worker doesn't exist
    if (error.stderr && error.stderr.includes('not found')) {
      return false;
    }
    // If it's an auth error or other, we'll find out during deploy anyway.
    // For safety, return false to attempt the resilient path if we can't confirm it exists.
    return false;
  }
}

async function main() {
  const configPath = path.join(process.cwd(), 'wrangler.jsonc');
  if (!fs.existsSync(configPath)) {
    console.error('wrangler.jsonc not found');
    process.exit(1);
  }

  let configContent = fs.readFileSync(configPath, 'utf8');

  // Sync name from package.json to wrangler.jsonc for consistency
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const projectName = packageJson.name;

  console.log(`Ensuring project name is "${projectName}" in wrangler.jsonc...`);
  configContent = configContent.replace(/"name"\s*:\s*"[^"]+"/, `"name": "${projectName}"`);
  // Also update self-referencing service if it exists
  configContent = configContent.replace(/"service"\s*:\s*"[^"]+"/, `"service": "${projectName}"`);

  fs.writeFileSync(configPath, configContent);

  const workerName = projectName;

  const workerExists = checkWorkerExists(workerName);
  console.log(`Worker exists: ${workerExists}`);

  // Always build first
  run('npx opennextjs-cloudflare build');

  if (!workerExists) {
    console.log('Performing initial deployment without self-referencing services...');
    const backupPath = configPath + '.bak';
    fs.copyFileSync(configPath, backupPath);

    // Remove the services array to avoid "service not found" error during first deploy
    // This matches "services": [ ... ] including potential comments and multi-line
    const strippedConfig = configContent.replace(/"services"\s*:\s*\[[\s\S]*?\]\s*,?/, '');
    fs.writeFileSync(configPath, strippedConfig);

    try {
      run('npx opennextjs-cloudflare deploy');
      console.log('Initial deployment successful.');
    } catch (error) {
      console.warn('Initial deployment failed or was not needed. Proceeding to full deployment.');
    } finally {
      fs.copyFileSync(backupPath, configPath);
      fs.unlinkSync(backupPath);
    }
  }

  console.log('Performing deployment with full configuration...');
  run('npx opennextjs-cloudflare deploy');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
