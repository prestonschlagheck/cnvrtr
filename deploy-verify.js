#!/usr/bin/env node

/**
 * Railway Deployment Verification Script
 * This script checks all critical components before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Railway Deployment Verification\n');

// Check critical files
const criticalFiles = [
    'Dockerfile',
    'package.json',
    'server.js',
    'index.html',
    'app.html',
    'index.js',
    'script.js',
    'styles.css',
    'index.css',
    'railway.toml',
    '.dockerignore'
];

console.log('📁 Checking critical files...');
let allFilesExist = true;

criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
    requiredFields.forEach(field => {
        if (packageJson[field]) {
            console.log(`✅ ${field}: ${JSON.stringify(packageJson[field])}`);
        } else {
            console.log(`❌ ${field} - MISSING`);
            allFilesExist = false;
        }
    });
    
    // Check start script
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log(`✅ start script: ${packageJson.scripts.start}`);
    } else {
        console.log('❌ start script - MISSING');
        allFilesExist = false;
    }
    
} catch (error) {
    console.log('❌ package.json - INVALID JSON');
    allFilesExist = false;
}

// Check Dockerfile
console.log('\n🐳 Checking Dockerfile...');
try {
    const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
    
    const requiredDockerCommands = [
        'FROM node:18-slim',
        'WORKDIR /app',
        'COPY package*.json ./',
        'RUN npm ci',
        'COPY . .',
        'EXPOSE 3000',
        'CMD ["npm", "start"]'
    ];
    
    requiredDockerCommands.forEach(command => {
        if (dockerfile.includes(command)) {
            console.log(`✅ ${command}`);
        } else {
            console.log(`❌ ${command} - MISSING`);
            allFilesExist = false;
        }
    });
    
} catch (error) {
    console.log('❌ Dockerfile - CANNOT READ');
    allFilesExist = false;
}

// Check server.js
console.log('\n🖥️ Checking server.js...');
try {
    const serverJs = fs.readFileSync('server.js', 'utf8');
    
    const requiredServerFeatures = [
        'express',
        'app.listen',
        'process.env.PORT',
        '0.0.0.0',
        '/health',
        'cors'
    ];
    
    requiredServerFeatures.forEach(feature => {
        if (serverJs.includes(feature)) {
            console.log(`✅ ${feature}`);
        } else {
            console.log(`❌ ${feature} - MISSING`);
            allFilesExist = false;
        }
    });
    
} catch (error) {
    console.log('❌ server.js - CANNOT READ');
    allFilesExist = false;
}

// Check Railway config
console.log('\n🚂 Checking Railway configuration...');
try {
    const railwayToml = fs.readFileSync('railway.toml', 'utf8');
    
    const requiredRailwayConfig = [
        'builder = "DOCKERFILE"',
        'dockerfilePath = "Dockerfile"',
        'startCommand = "npm start"',
        'healthcheckPath = "/health"'
    ];
    
    requiredRailwayConfig.forEach(config => {
        if (railwayToml.includes(config)) {
            console.log(`✅ ${config}`);
        } else {
            console.log(`❌ ${config} - MISSING`);
            allFilesExist = false;
        }
    });
    
} catch (error) {
    console.log('❌ railway.toml - CANNOT READ');
    allFilesExist = false;
}

// Final summary
console.log('\n📊 Deployment Verification Summary');
console.log('=====================================');

if (allFilesExist) {
    console.log('✅ ALL CHECKS PASSED - Ready for Railway deployment!');
    console.log('\n🚀 Next steps:');
    console.log('1. Push to GitHub');
    console.log('2. Connect to Railway');
    console.log('3. Deploy automatically');
    console.log('4. Add custom domain');
} else {
    console.log('❌ SOME CHECKS FAILED - Please fix issues before deployment');
    process.exit(1);
}

console.log('\n🎉 Your Soundclouder app is ready for Railway!'); 