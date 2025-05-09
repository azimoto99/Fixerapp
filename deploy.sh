#!/bin/bash
# Create a .npmrc file to use legacy-peer-deps
echo "legacy-peer-deps=true" > .npmrc

# Run the build script with the correct React versions
node build-for-production.js

# Create a simple start script for production
echo "#!/bin/bash
NODE_ENV=production node dist/index.js" > start.sh
chmod +x start.sh

echo "Deployment preparation completed!"
echo "Now you can deploy the application using the Replit deploy feature."