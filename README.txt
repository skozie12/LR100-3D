3D Configuration Tool for Taymer International LR100 Products.

3D environment is designed to be native to 16:9, and may be unstable or unusable at different aspect ratios.

Developed using npx vite, and has yet to be integrated into a Wordpress plugin where it will eventually be made live.

Todo List:

Price Bullshit || Only Relevant post-dev
- Make LR100 bundle proposition document 
- Figure out price structure with increase of individual components
- Show discount when buying all 3 components together
- Raise individual prices 3-5%

JS/THREE/HTML Bullshit
- Deal with window resizing issue - shrinks but doesnt center, and then doesnt grow again
- Fix issue related to graying out the cutter functionality - line 80-92 in main.js
- Potentially try to animate it. Super Potentially animate a wire too, seperate stand and coiler, and stand and reel stand
- Maybe add background..??
- POTENTIALLY add a wire that goes throught the whole thing to display functionality

Wordpress Plugin Bullshit || post-dev
- Port to WP plugin: GHP
- Attempt to integrate into the Wordpress staging site
- Decide whether to just make it a full web-page, or a window-esque plugin

Dev Environment Bullshit
- To launch node and npm: set PATH=C:\Users\DuncanSmith_5zboqyf\Documents\node-v22.13.1-win-x64;%PATH%
- npx vite to launch web-dev serve