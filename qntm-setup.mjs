import { input, select } from "@inquirer/prompts";
import { execSync,spawn } from "child_process";
import fs from "fs";
import path from "path";


const repoDefinitions = [
	{
	  name: "Module",
	  repoUrl: "git@github.com:nukage/wp-modules.git",
	  cloneDir: "resources/repo/modules",
	  targetDir: "resources/modules",
	  qntmFunctionsFile: "resources/qntm-modules.php",
	},
	{
	  name: "Block",
	  repoUrl: "git@github.com:nukage/wp-blocks.git",
	  cloneDir: "resources/repo/blocks",
	  targetDir: "resources/blocks",
	  qntmFunctionsFile: "resources/qntm-blocks.php",
	}
	// You can add more repo definitions here with the same structure
  ];
  
  function getDefinition(choice) {
	return repoDefinitions.find((definition) => definition.name === choice);
  }


async function main(notFirstRun = false) {
	try {
		// Prompt the user to choose between module or block
    console.log("Welcome to the QNTM setup script!  Let's get started.");
    console.log("Select Block or Module to install or uninstall site components.  ")
    console.log("Select Clean Up to delete the repository cache.  ")
	const choices = repoDefinitions.map((definition) => definition.name);
		const choice = await select({
			message: "What do you want to do?",
			choices: [...choices, "Clean Up", "Cancel"],
		});

		// let repoUrl, cloneDir, targetDir, qntmFunctionsFile;
		if (choice === "Cancel") {
			console.log("Exiting...");
			return;
		}
    if (choice === "Clean Up"){
        execSync(`rm -rf resources/repo`);
        console.log("Cleaned up repository.");
        return;
    }
	
	const definition = getDefinition(choice);
    const { repoUrl, cloneDir, targetDir, qntmFunctionsFile } = definition;


		// Check if the clone directory exists
		if (fs.existsSync(cloneDir)) {
        if (!notFirstRun) {
          console.log("Repository found, updating...");
          execSync(`git pull origin main`, { cwd: cloneDir });
        }
			} else {
				console.log("Repository not found, downloading...");
				execSync(`git clone ${repoUrl} ${cloneDir}`);
		}

// List subdirectories in the cloned directory
const clonedSubdirectories = fs
    .readdirSync(cloneDir)
    .filter(
        (file) =>
            fs.statSync(path.join(cloneDir, file)).isDirectory() &&
            !file.startsWith(".")
    );

// List subdirectories in the destination directory

// if (!fs.existsSync(targetDir)){
// 	await fs.mkdir('resources/blocks', { recursive: true }, (err) => {
// 		if (err) {
// 			console.error('Error creating directory:', err);
// 		} else {
// 			console.log('Directory created successfully.');
// 		}
// 	});
// }

let installedSubdirectories = [];
if (fs.existsSync(targetDir)){
	installedSubdirectories = fs
		.readdirSync(targetDir)
		.filter(
			(file) =>
				fs.statSync(path.join(targetDir, file)).isDirectory() &&
				!file.startsWith(".")
		);
}

// Combine and deduplicate the lists
const allSubdirectoriesSet = new Set([...clonedSubdirectories, ...installedSubdirectories]);
const allSubdirectories = Array.from(allSubdirectoriesSet);

// Prompt the user to select a subdirectory
const subdir = await select({
    message: "Select a subdirectory:",
    choices: allSubdirectories,
});

		const destinationDir = `${targetDir}/${subdir}`;

		// Check if the target directory already exists
		if (fs.existsSync(destinationDir)) {


      const actionChoices = [];

      // Check if the existing directory name matches any subdirectories in the repository
      const hasMatchingSubdirectory = clonedSubdirectories.includes(subdir);
  
      // Only add the Reinstall option if there is an exact match in the repository
      if (hasMatchingSubdirectory) {
		  const setupMjsExists = fs.existsSync(path.join(destinationDir, "setup.mjs"));
  
		  if (setupMjsExists) {
			  actionChoices.push("Run Setup Script");
		  }
          actionChoices.push("Reinstall");
		  // Check if a setup.mjs file exists in the subdirectory

      }
      actionChoices.push("Uninstall", "Rename", "Cancel");

      const message = hasMatchingSubdirectory ? "The directory exists in the repo and in the theme. What would you like to do?" : "The directory exists in your theme, but not the repo. What would you like to do?";
			const action = await select({
				message: message,
				choices: actionChoices,
			});
			if (action === "Run Setup Script") {
				console.log("Running setup script for", subdir);
			  
				// Call the spawnChildProcess function from the selected directory
				const cleanupRequested = await spawnChildProcess(destinationDir);
			  
				console.log("Setup script execution complete.");
			  
				// Re-run the main function after setup script finishes
				await main(true);
				return; // Exit after running setup script
			  }

			else if (action === "Reinstall") {
				// Delete the existing directory
				execSync(`rm -rf ${destinationDir}`);
				console.log(`Removed existing directory: ${destinationDir}`);
			} else if (action === "Uninstall") {
				// Confirm before uninstalling
				const confirmUninstall = await select({
					message: `Are you sure you want to uninstall ${subdir}? This will delete the existing directory.`,
					choices: ["Yes", "No"],
				});
		
				if (confirmUninstall === "Yes") {
					execSync(`rm -rf ${destinationDir}`);
					console.log(`Uninstalled: ${destinationDir}`);
		
					// Remove the include line from the functions file
					const functionsContent = fs.readFileSync(qntmFunctionsFile, "utf8");
					const updatedContent = functionsContent
						.split("\n")
						.filter((line) => !line.includes(`'${targetDir}/${subdir}/index.php'`))
						.join("\n");
		
					fs.writeFileSync(qntmFunctionsFile, updatedContent, "utf8");
					console.log(`Removed reference to ${targetDir}/${subdir}/index.php from ${qntmFunctionsFile}`);

					await main(true); // Re-run the main function to prompt the user to choose again
					return; // Exit after uninstalling
				} else {
					console.log("Uninstall cancelled.");
					return;
				}
			} else if (action === "Rename") {
				// Prompt for the new name
				const newName = await input({
					message: "Enter the new name for the block:",
					validate: (value) => (value ? true : "Name cannot be empty."),
				});


        // Create new destination directory with the new name
        const newDestinationDir = `${targetDir}/${newName}`;
        
        // Rename the existing directory
        fs.renameSync(destinationDir, newDestinationDir);
        console.log(`Renamed ${destinationDir} to ${newDestinationDir}`);

        // Update the functions file to reflect the new path
        const functionsContent = fs.readFileSync(qntmFunctionsFile, "utf8");
        const updatedContent = functionsContent
            .split("\n")
            .map((line) =>
                line.includes(`'${destinationDir}/index.php'`)
                    ? line.replace(destinationDir, newDestinationDir)  // Update with new path
                    : line
            )
            .join("\n");

        fs.writeFileSync(qntmFunctionsFile, updatedContent, "utf8");
        console.log(`Updated references in ${qntmFunctionsFile}`);

        await main(true); // Re-run the main function to prompt the user to choose again
        return; // Exit after renaming

			} else if (action === "Cancel") {
				console.log("Operation cancelled.");
				return;
			}
		}

		// Copy the selected subdirectory to the target directory
		const sourceDir = `${cloneDir}/${subdir}`;
		fs.cpSync(sourceDir, destinationDir, { recursive: true });



		const functionsFile = "functions.php";

		if (!fs.existsSync(functionsFile)) {
			fs.writeFileSync(
				functionsFile,
				"<?php // This is the " + functionsFile + " file\n",
				"utf8"
			);
		}

		// Check if the relevant php functions file exists, create it if it doesn't
		if (!fs.existsSync(qntmFunctionsFile)) {
			fs.writeFileSync(
				qntmFunctionsFile,
				"<?php // This is the " + qntmFunctionsFile + " file\n",
				"utf8"
			);
			console.log(`Created ${qntmFunctionsFile}`);

			// Modify functions.php to include it if it's created for the first time
			const functionsContent = fs.readFileSync(functionsFile, "utf8");

			// Insert PHP include statement for the respective qntm-functions.php
			const includeCode = `\ninclude_once '${qntmFunctionsFile}';\n`;
			const newFunctionsContent = functionsContent + includeCode;

			fs.writeFileSync(functionsFile, newFunctionsContent, "utf8");
			console.log(`Modified ${functionsFile} to include ${qntmFunctionsFile}`);
		} else {
			console.log(`${qntmFunctionsFile} already exists, skipping creation.`);
		}

		// Add the code for the subdirectory to the respective qntm-functions.php
		const newCode = `\ninclude_once '${destinationDir}/index.php';\n`;

		const functionsContent = fs.readFileSync(qntmFunctionsFile, "utf8");

		// Check if the newCode already exists in the file
		if (
			!functionsContent.includes(`include_once '${destinationDir}/index.php';`)
		) {
			fs.appendFileSync(qntmFunctionsFile, newCode, "utf8");
			console.log(`Added code for the subdirectory to ${qntmFunctionsFile}`);
		} else {
			console.log(
				`Code for the subdirectory already exists in ${qntmFunctionsFile}, skipping insertion.`
			);
		}

		// ========== GITIGNORE: ADD NODE_MODULES AND VSCODE TO.GITIGNORE ==========

		if (!notFirstRun) {
			// Check if '.gitignore' exists; if not, create it
			const gitignorePath = `.gitignore`;

			if (!fs.existsSync(gitignorePath)) {
				fs.writeFileSync(gitignorePath, "", "utf8");
				console.log(`Created ${gitignorePath}`);
			}

			// Read the content of .gitignore
			const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");

			// Check if '.node_modules' is in .gitignore
			if (!gitignoreContent.includes("node_modules")) {
				fs.appendFileSync(gitignorePath, "node_modules\n");
				console.log('Added ".node_modules" to .gitignore');
			} else {
				console.log('".node_modules" already exists in .gitignore, skipping addition.');
			}

			if (!gitignoreContent.includes(".vscode")) {
				fs.appendFileSync(gitignorePath, ".vscode\n");
				console.log('Added ".vscode" to .gitignore');
			} else {
				console.log('".vscode" already exists in .gitignore, skipping addition.');
			}
			 

			// Check if 'resources/repo' is in .gitignore
			if (!gitignoreContent.includes("resources/repo")) {
				fs.appendFileSync(gitignorePath, "resources/repo\n");
				console.log('Added "resources/repo" to .gitignore');
			} else {
				console.log('"resources/repo" already exists in .gitignore, skipping addition.');
			}
		}

	/**
	 * Spawns a child process to execute the setup.mjs file in the given destination
	 * directory. This function will return true if the child process outputs the string
	 * "cleanup" at any point, indicating that the calling process should perform a cleanup
	 * operation.
	 * @param {string} destinationDir - The directory path where the setup.mjs file should
	 *                                  be executed.
	 * @returns {Promise<boolean>} A promise that resolves with true if the child process
	 *                              outputs "cleanup", or false otherwise.
	 */
		async function spawnChildProcess(destinationDir) {
			const initFilePath = path.join(destinationDir, "setup.mjs");
			let cleanupRequested = false;
		  
			if (fs.existsSync(initFilePath)) {
			  const initProcess = spawn("node", ["setup.mjs"], { cwd: destinationDir, stdio: 'inherit' });
		  
			  initProcess.stdout.on("data", (data) => {
				console.log(`setup.mjs output: ${data}`);
				if (data.toString().includes("cleanup")) {
				  cleanupRequested = true;
				}
			  });
		  
			  initProcess.stderr.on("data", (data) => {
				console.error(`setup.mjs error: ${data}`);
			  });
		  
			  await new Promise((resolve) => {
				initProcess.on("exit", () => {
				  console.log(`setup.mjs process exited`);
				  resolve();
				});
			  });
		  
			  return cleanupRequested;
			} else {
			  console.log("setup.mjs does not exist, skipping execution.");
			  return false;
			}
		  }
		  
		const cleanupRequested = await spawnChildProcess(destinationDir);

		// Prompt the user to clean up only if init.js signaled it
		if (cleanupRequested) {
			const cleanup = await select({
				message: "Install complete. Do you want to clean up the temporary folder?",
				choices: ["Yes", "No"],
			});

			if (cleanup === "Yes") {
				// Delete the cloned repository
				execSync(`rm -rf ${cloneDir}`);
			}
		}

		console.log("Operation completed successfully.");

		// Re-run the main function if the user selected Block or Module
		if (choice === "Module" || choice === "Block") {
			await main(true);
		}
	} catch (error) {
		console.error("An error occurred:", error);
	}
}

main();
