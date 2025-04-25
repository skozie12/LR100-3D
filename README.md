# LR100-3D: Interactive Rope Length Measurement Configurator

## Overview
LR100-3D is a high-performance browser-based 3D simulator for Taymer's line of rope coiling equipment. This interactive visualization allows users to configure and visualize different coiler models, reels, counters, and cutters in a physically accurate 3D environment. The simulator features real-time rope physics and seamless integration with WooCommerce for e-commerce functionality.

![LR100-3D Simulator](src/assets/taymer_small_logo.jpeg)

## Features

- **Interactive 3D Visualization**: Real-time rendering of rope coiling equipment with WebGL
- **Physics-Based Rope Simulation**: Realistic rope physics powered by Cannon.js
- **Equipment Configuration**: Mix and match different reels, counters, cutters, and coilers
- **Real-time Pricing**: Dynamic price calculations based on selected components
- **High Performance**: Optimized physics and rendering for smooth operation even on lower-end devices
- **Responsive Design**: Adapts to different screen sizes
- **WooCommerce Integration**: Add configured products directly to cart
- **WordPress Plugin**: Easy installation as a WordPress plugin
- **Asset Path Management**: Smart handling of asset paths for both development and production environments

## Technical Details

### Technologies Used
- **Three.js**: For 3D rendering and scene management
- **Cannon.js**: For physics simulation
- **Node.js & Vite**: For development and bundling
- **WebGL**: For hardware-accelerated rendering
- **WordPress & WooCommerce**: For CMS and e-commerce integration

### Architecture
The simulator uses optimized main thread rendering with performance settings that adapt to the user's device capabilities. Physics calculations are simplified for better performance while maintaining visual fidelity.

### Performance Optimizations
- **Adaptive Quality Settings**: Automatically adjusts rendering quality based on device performance
- **Fixed Timestep Physics**: More stable and efficient physics calculations
- **Simplified Collision Detection**: Optimized for rope-coiler interactions
- **Smart Asset Loading**: Path correction system ensures assets load correctly in any environment
- **Texture Optimization**: Reduced texture resolution and complexity for lower-end devices
- **Web Worker Implementation**: Physics calculations run in a separate thread for smoother UI experience

### Rope Physics
The rope is modeled as a series of connected spherical bodies with distance constraints between them. The physics simulation handles:
- Collision detection between rope and coiler
- Realistic coiling behavior based on coiler geometry
- Dynamic segment addition as the rope coils
- Smooth visual representation with optimized tube geometry

### Coiler Models
Each coiler model has unique physical properties:
- **LR100-10**: Radius 0.189, optimized for larger diameter cables
- **LR100-99**: Radius 0.155, balanced for medium diameter cables
- **LR100-200**: Radius 0.105, designed for smaller diameter cables

## WordPress Integration

### Installation as a Plugin
1. Download the `lr100-3d-viewer.zip` file
2. In your WordPress admin panel, navigate to Plugins > Add New > Upload Plugin
3. Upload the zip file and activate the plugin
4. Use the shortcode `[lr100_3d]` to add the configurator to any page or post

### WooCommerce Integration
The plugin integrates with WooCommerce to:
- Display real-time product pricing based on your WooCommerce products
- Add configured products directly to the WooCommerce cart
- Store configuration details with order line items
- Display product information and images from your WooCommerce store

### Configuration
1. Ensure your WooCommerce products have SKUs that match the component IDs:
   - Coilers: `100-10`, `100-99`, `100-200`
   - Counters: `1410`, `1420`, `1410UR`, `1420UR`
   - Reels: `100-284`
   - Cutters: `100-C`
2. The plugin will automatically link the 3D models with your WooCommerce products

## Usage

### End User Guide
1. Select a Reel Stand from the dropdown menu
2. Select a Counter model
3. Select a Coiler model
4. Optionally, select a Cutter (requires a Counter to be selected)
5. Watch the simulation run automatically
6. View the total price calculated based on your selections
7. Click "Add to Cart" to add all selected components to your WooCommerce cart

### Admin Settings
The plugin settings can be found in the WordPress admin panel under LR100-3D Settings:
- Asset path configuration
- Performance settings
- Product mapping
- Animation speed controls
- Physics simulation parameters

## Browser Compatibility

This application utilizes modern web technologies and requires:
- WebGL 2.0 support
- Modern browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- JavaScript enabled
- Minimum 4GB RAM recommended for optimal performance

## Development Setup

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`
5. Generate plugin zip: `npm run create-zip`

### File Structure
- `src/scripts/js/main.js`: Main application logic and Three.js initialization
- `src/scripts/js/physicsWorker.js`: Web Worker for physics calculations
- `src/scripts/js/woocommerce-integration.js`: WooCommerce cart integration
- `src/styles/styles.css`: Core styles for the 3D viewer
- `lr100-3d-viewer/lr100-3d-viewer.php`: Main WordPress plugin file
- `lr100-3d-viewer/woocommerce-integration.php`: WooCommerce integration handlers
- `public/assets/`: Production-ready 3D models and textures
- `src/assets/`: Source 3D models and textures for development

### Asset Management
The project uses both development assets (`src/assets/`) and production assets (`public/assets/`). The build process automatically handles the correct paths for each environment:
- During development: Assets are loaded from the `src/assets/` directory
- In production: Assets are loaded from the WordPress plugin's `assets/` directory

### Deployment
Run `npm run deploy` to:
1. Build the project
2. Create a zip file of the WordPress plugin
3. The plugin zip will be ready for installation on any WordPress site

You can also modify the deployment settings in `scripts/deploy.js` to automatically upload to your development server.

## Troubleshooting

### Common Issues
- **Assets not loading**: Check that the asset path is correctly configured in the WordPress admin
- **Low performance**: Try enabling the performance mode in settings or reduce the rope segment count
- **Add to cart not working**: Verify that your WooCommerce products have the correct SKUs
- **Physics glitches**: Increase the physics iteration count in the admin settings

### Debug Mode
Add `?debug=true` to the URL to enable debug mode, which will show:
- FPS counter
- Physics debug information
- Asset loading paths
- Memory usage statistics
- Web Worker communication logs

### Browser Console Commands
The following commands can be run in the browser console for debugging:
```javascript
LR100.debug.showPhysics(); // Show physics wireframes
LR100.debug.logPerformance(); // Log performance metrics
LR100.debug.resetSimulation(); // Reset the entire simulation
```

## Recent Updates

### Version 2.0.0 (April 2025)
- **WooCommerce Integration**: Added seamless e-commerce integration
- **Physics Improvements**: Optimized rope physics for more realistic coiling
- **Web Worker Implementation**: Moved physics calculations to a separate thread
- **Performance Mode**: Added adaptive quality settings for lower-end devices
- **New Models**: Added support for 1410C counter and additional rope materials

### Version 1.5.0 (January 2025)
- **Asset Path Management**: Improved handling of asset paths across environments
- **Mobile Optimization**: Better touch controls and responsive layout
- **Memory Usage**: Reduced memory footprint for better performance

## Contributing

We welcome contributions to improve the LR100-3D simulator:
1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Credits and License

Developed by Duncan Smith for Taymer.

Copyright © 2025 Taymer. All rights reserved.

## Contact

For support, feature requests, or bug reports, please contact:
- **Email**: support@taymer.com
- **Website**: https://www.taymer.com
