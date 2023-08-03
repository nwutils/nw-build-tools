import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chdir, env } from "node:process";

await main();

/**
 *
 * @param {string} code
 * @param  {string[]} args
 * @return {Promise<unknown>}
 */
function exec(code, ...args) {
  return new Promise((res) => {
    const proc = spawn(code, args, {
      stdio: "inherit",
      shell: true,
      env: {
        ...env,
        Path: env.PATH,
      },
    });
    proc.addListener("exit", res);
  });
}

async function main() {
  const INSTALL_VS = false;
  if (INSTALL_VS) {
    const VS_INSTALLER_PATH = resolve(
      "/",
      '"Program Files (x86)"',
      '"Microsoft Visual Studio"',
      "Installer",
      "setup.exe",
    );

    await exec(
      `${VS_INSTALLER_PATH}`,
      "install",
      "--channelId VisualStudio.17.Release",
      "--productId Microsoft.VisualStudio.Product.Community",
      "--add Microsoft.VisualStudio.Workload.NativeDesktop",
      "--add Microsoft.VisualStudio.Component.VC.ATLMFC",
      "--add Microsoft.VisualStudio.Component.VC.v143.x86.x64",
      "--includeRecommended",
      "--installWhileDownloading",
      "--quiet",
    );
  }

  if (existsSync("./third_party/depot_tools") === false) {
    await exec(
      "git",
      "clone",
      "https://chromium.googlesource.com/chromium/tools/depot_tools.git",
      "third_party/depot_tools",
    );
  }

  env.DEPOT_TOOLS_WIN_TOOLCHAIN = "0";
  env.PATH = `${resolve("./third_party/depot_tools")};${env.PATH};`;

  const gclient = `
solutions = [
    { "name"        : 'src',
        "url"         : 'https://github.com/ayushmanchhabra/nw-chromium.git@origin/nw78',
        "deps_file"   : 'DEPS',
        "managed"     : False,
        "custom_deps" : {},
        "custom_vars": {},
    },
]`;

  await writeFile("./.gclient", gclient);

  if (existsSync("./src") === false) {
    await mkdir("./src");
    await exec("gclient", "sync", "--no-history", "--nohooks");
  }

  await chdir("./src");

  if (existsSync("content/nw") === false) {
    await exec(
      "git",
      "clone",
      "--branch=nw78",
      "--depth=1",
      "https://github.com/ayushmanchhabra/nw-core.git",
      "content/nw",
    );
  }

  if (existsSync("third_party/node-nw") === false) {
    await exec(
      "git",
      "clone",
      "--branch=nw78",
      "--depth=1",
      "https://github.com/ayushmanchhabra/nw-node.git",
      "third_party/node-nw",
    );
  }

  if (existsSync("v8") === false) {
    await exec(
      "git",
      "clone",
      "--branch=nw78",
      "--depth=1",
      "https://github.com/ayushmanchhabra/nw-v8.git",
      "v8",
    );
  }

  await exec("gclient", "sync");

  await exec("gn", "gen", "out/nw");
}
