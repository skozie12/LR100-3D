# LR100 3D Configuration Tool

An interactive 3D visualization tool for Taymer International LR100 product line, allowing customers to explore and configure cable winding and cutting equipment.

## Overview

This application provides customers with an interactive way to:
- View 3D models of the LR100 product line
- Configure different components (reel stands, counters, coilers, and cutters)
- See real-time pricing based on component selection
- Visualize rope/cable winding physics

## Requirements

- Node.js (v14+)
- npm or yarn
- Modern browser with WebGL support (Chrome, Firefox, Edge recommended)

## Project Structure

```
LR100-3D/
├── src/
│   ├── assets/         # 3D models (GLTF) and textures
│   ├── scripts/
│   │   └── js/         # JavaScript source files
│   └── styles/         # CSS files
├── index.html          # Main HTML entry point
└── README.md           # This documentation
```

## Development Setup

### Using Node.js

1. Set up Node.js environment:
   ```
   # In CMD (not PowerShell):
   set PATH=C:\Users\{YOUR_USERNAME}\Documents\node-v22.13.1-win-x64;%PATH%
   ```

2. Launch the development server:
   ```
   cd LR100-3D
   npx vite
   ```

3. Open the development server:
   - Press `o` in the terminal when prompted
   - Or navigate to the URL shown (typically http://localhost:5173)

### Development Notes

- The 3D environment is optimized for 16:9 aspect ratio
- Physics simulation using cannon.js
- 3D rendering with three.js
- GLTF models imported from CAD files

## Technical Details

### Libraries Used

- **three.js**: 3D rendering engine
- **cannon.js**: Physics engine for cable simulation
- **vite**: Frontend build tool and dev server

### Key Features

- **Physics-Based Cable Winding**: Realistic simulation of cable coiling
- **Dynamic Component Loading**: GLTF models loaded based on user selection
- **Interactive Controls**: Orbit camera, play/pause winding simulation
- **Real-time Pricing**: Dynamic price calculations based on component selection

## Production Deployment

Future plans include:

1. Converting to WordPress plugin
2. Integration with the Taymer International website
3. Optimization for different devices and browsers

## Troubleshooting

- If you encounter import errors with Vite, ensure all import statements are at the top of the file
- For physics glitches, try adjusting the parameters in the physics configuration
- WebGL performance issues may require reducing the complexity of the rope simulation

## License

Copyright © 2025 Taymer International. All rights reserved.
