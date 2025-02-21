3D Configuration Tool for Taymer International LR100 Products.

3D environment is designed to be native to 16:9, and may be unstable or unusable at different aspect ratios.

Developed using npx vite to view browser environment, and has yet to be integrated into a Wordpress plugin where it will eventually be made live.

Built in .js, using node.js, npm, three.js, and cannon.js

three.js: 3d environment to import .gltf CAD files and to deal with environment interactions, and animations
node.js: to run javascript application on the web
cannon.js: physics engine yet to be implemented, will be used for cable and collision physics

Wordpress Plugin Bullshit || post-dev
- Port to WP plugin: GHP
- Attempt to integrate into the Wordpress staging site
- Decide whether to just make it a full web-page, or a window-esque plugin

To Access and view the 3D Environment
- To launch node and npm: set PATH=C:\Users\{USER}\Documents\node-v22.13.1-win-x64;%PATH% // MUST BE IN CMD, NOT POWERSHELL
- 'npx vite' to launch web-dev server, must run command in \LR100-3D
- 'o' to launch the server
- DONE
