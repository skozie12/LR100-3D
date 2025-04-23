# LR100 3D Viewer WordPress Plugin

This plugin integrates the LR100 3D viewer application into WordPress using a simple shortcode.

## Installation

1. After running \
pm run build\ in your LR100-3D project, copy the contents of the \dist\ folder into the \dist\ folder of this plugin.

2. Upload the entire \lr100-3d-viewer\ plugin folder to the \/wp-content/plugins/\ directory of your WordPress site.

3. Activate the plugin through the 'Plugins' menu in WordPress.

## Usage

Use the shortcode \[lr100_3d]\ in any post or page where you want to display the 3D viewer.

You can customize the size of the viewer using width and height parameters:

\\\
[lr100_3d width=\
800px\ height=\500px\]
\\\

## File Structure

Make sure your dist folder contains:

- index.html (this won't be directly used but contains important references)
- assets/ folder with all necessary JS, CSS, and model files

## Troubleshooting

If the 3D viewer is not displaying correctly:

1. Check browser console for any JavaScript errors
2. Verify that all required assets were properly copied to the dist folder
3. Make sure the plugin is properly activated 
in WordPress


