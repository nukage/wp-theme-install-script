# Theme Module Installer Script

This is a solution to how to easily import modular code. The script's purpose is to automate the process of installing modular bits of code, such as blocks, into a Wordpress theme. It should be compatible with any Wordpress theme.

Blocks:  The usual Wordpress blocks we are used to, for building pages in Gutenberg.

Modules:  These are modular bits of code that aren't necessarily blocks, but are things we re-use. They could be collections of helper functions, collections of patterns, anything.

Blocks and modules can have their own installer scripts that will run if they are present. This way, we could use this to install other things outside of this typical folder structure, such as tailwind configurations, or other libraries.

### REQUIREMENTS:

Requires Node to be installed. Tested with Node 22.3.0.

## TO USE:

Copy `qntm-setup.mjs` to the root of your theme folder/theme repo.

Install dependencies: 

`npm install @inquirer/prompts child_process fs`

Running the script:

`node qntm-setup.mjs`

You can also set it up as a script in your package.json like so:

```JSON
  "scripts": {
    "setup": "node qntm-setup.mjs"
  },
```
Then run: 
`npm run setup`

Different types of repo's can be defined. Each modular bit of code will be in the subfolder of the repo. Right now I have created two example repo's for testing this.  

The repositories, destination files, and relevant php files can be customized to your project's folder structure. 

```Javascript
const moduleDefs = {
  "repoUrl" : "git@github.com:nukage/wp-modules.git",
  "cloneDir" : "resources/repo/modules",
  "targetDir" : "resources/modules",
  "qntmFunctionsFile" : "resources/qntm-modules.php",
}
const blockDefs = {
  "repoUrl" : "git@github.com:nukage/wp-blocks.git",
  "cloneDir" : "resources/repo/blocks",
  "targetDir" : "resources/blocks",
  "qntmFunctionsFile" : "resources/qntm-blocks.php",
}
```

EXAMPLE FOLDER STRUCTURE

- /wp-content/themes
    - /nameOfTheme  
        - /resources
            - /qntm-blocks.php - Includes for blocks
            - /qntm-modules.php - Includes for modules
            - /blocks/
                - /block1/
                - /block2/
            - /modules/ - any re-usable code that is not a block
                - /module1/
                - /module2/ 
            - /repo/ - Repo's are cached here.
                - /blocks
                - /modules
    - /functions.php - On creation of qntm-blocks.php or qntm-modules.php, an include will be added here.
    - /.gitignore - The script will automatically add a line to ignore the repo folder
