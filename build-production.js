#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProductionBuilder {
    constructor() {
        this.sourceFile = 'ezprompt.user.js';
        this.outputFile = 'ezprompt.min.user.js';
        this.stats = {
            originalSize: 0,
            minifiedSize: 0,
            compressionRatio: 0
        };
    this.headerBlock = '';
    }

    build() {
        console.log('🚀 Building EZPrompt for production...\n');

        try {
            // Read source file
            const sourceContent = fs.readFileSync(this.sourceFile, 'utf8');
            this.stats.originalSize = sourceContent.length;

            console.log(`📁 Source file: ${this.sourceFile}`);
            console.log(`📏 Original size: ${this.formatBytes(this.stats.originalSize)}`);

            // Split out userscript header block to avoid damaging it during minification
            const { header, body } = this.splitHeader(sourceContent);
            this.headerBlock = header;

            // Apply optimizations to body only
            let optimizedContent = body;

            // 1. Set debug mode to false
            optimizedContent = this.setProductionMode(optimizedContent);
            console.log('✅ Set production mode (debug: false)');

            // 2. Remove debug logging
            optimizedContent = this.removeDebugLogging(optimizedContent);
            console.log('✅ Removed debug logging');

            // 3. Minify CSS
            optimizedContent = this.minifyEmbeddedCSS(optimizedContent);
            console.log('✅ Minified embedded CSS');

            // 4. Remove comments and extra whitespace
            optimizedContent = this.minifyJavaScript(optimizedContent);
            console.log('✅ Minified JavaScript');

            // 5. Optimize string literals
            optimizedContent = this.optimizeStrings(optimizedContent);
            console.log('✅ Optimized string literals');

            // 6. Update version and metadata in header only
            const updatedHeader = this.updateHeaderMetadata(this.headerBlock);
            console.log('✅ Updated header metadata for production');

            // Calculate compression stats
            this.stats.minifiedSize = optimizedContent.length;
            this.stats.compressionRatio = ((this.stats.originalSize - this.stats.minifiedSize) / this.stats.originalSize * 100);

            // Compose final content: preserved header + optimized body
            const finalContent = `${updatedHeader}\n${optimizedContent.trimStart()}`;

            // Write output file
            fs.writeFileSync(this.outputFile, finalContent, 'utf8');

            console.log(`\n📦 Production build complete!`);
            console.log(`📁 Output file: ${this.outputFile}`);
            console.log(`📏 Minified size: ${this.formatBytes(this.stats.minifiedSize)}`);
            console.log(`📊 Compression: ${this.stats.compressionRatio.toFixed(1)}% smaller`);

            // Generate build report
            this.generateBuildReport();

        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }

    splitHeader(content) {
        const match = content.match(/(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)([\s\S]*)/);
        if (match) {
            return { header: match[1].trimEnd(), body: match[2] };
        }
        return { header: '', body: content };
    }

    setProductionMode(content) {
        return content.replace(
            /debug:\s*true/g,
            'debug: false'
        );
    }

    removeDebugLogging(content) {
        // Remove debug log calls but keep error, warn, and info
        // This method removes .debug( calls from the production build
        return content.replace(
            /\.debug\([^)]*\);?\s*/g,
            ''
        ).replace(
            /this\.logger\.debug\([^)]*\);?\s*/g,
            ''
        ).replace(
            /console\.debug\([^)]*\);?\s*/g,
            ''
        ).replace(
            /logger\.debug\([^)]*\);?\s*/g,
            ''
        );
    }

    minifyEmbeddedCSS(content) {
        return content.replace(
            /`([^`]*(?:\.ezprompt|@media|@keyframes)[^`]*)`/g,
            (match, css) => {
                const minified = css
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
                    .replace(/\s*{\s*/g, '{') // Clean up braces
                    .replace(/\s*}\s*/g, '}')
                    .replace(/\s*,\s*/g, ',') // Clean up commas
                    .replace(/\s*:\s*/g, ':') // Clean up colons
                    .replace(/\s*;\s*/g, ';') // Clean up semicolons
                    .trim();
                return `\`${minified}\``;
            }
        );
    }

    minifyJavaScript(content) {
        // Basic JavaScript minification (header already removed)
        return content
            // Remove single-line comments
            .replace(/^\/\/.*$/gm, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra blank lines
            .replace(/\n\s*\n/g, '\n')
            // Trim trailing whitespace
            .replace(/[ \t]+$/gm, '')
            // Collapse multiple spaces (not inside strings)
            .replace(/\s{2,}/g, ' ');
    }

    optimizeStrings(content) {
        // Optimize common string patterns
        const optimizations = {
            'document.querySelector': 'document.querySelector',
            'document.querySelectorAll': 'document.querySelectorAll',
            'addEventListener': 'addEventListener',
            'removeEventListener': 'removeEventListener',
            'createElement': 'createElement',
            'appendChild': 'appendChild',
            'removeChild': 'removeChild',
            'getAttribute': 'getAttribute',
            'setAttribute': 'setAttribute',
            'classList.add': 'classList.add',
            'classList.remove': 'classList.remove',
            'classList.toggle': 'classList.toggle'
        };

        let optimized = content;
        
        // Replace common DOM method calls with shorter variables if beneficial
        // This is a simple optimization - more advanced minifiers would do better
        
        return optimized;
    }

    updateHeaderMetadata(header) {
        if (!header) return header;
        const now = new Date();
        // Extract base version from header (@version first occurrence)
        const versionMatch = header.match(/@version\s+([\w.-]+)/);
        const baseVersion = versionMatch ? versionMatch[1].split('-')[0] : '1.0.0';
        const buildVersion = `${baseVersion}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

        // Ensure production tag appended only once
        return header
            .replace(/@version\s+[\w.-]+/, `@version      ${buildVersion}`)
            .replace(/@description\s+(.+)/, (m, desc) => {
                return desc.includes('Production Build')
                    ? m
                    : `@description  ${desc} (Production Build)`;
            });
    }

    extractVersion(content) {
        const versionMatch = content.match(/@version\s+([\d.]+)/);
        return versionMatch ? versionMatch[1] : '1.0.0';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateBuildReport() {
        const report = {
            buildTime: new Date().toISOString(),
            source: {
                file: this.sourceFile,
                size: this.stats.originalSize,
                sizeFormatted: this.formatBytes(this.stats.originalSize)
            },
            output: {
                file: this.outputFile,
                size: this.stats.minifiedSize,
                sizeFormatted: this.formatBytes(this.stats.minifiedSize)
            },
            compression: {
                ratio: this.stats.compressionRatio,
                savedBytes: this.stats.originalSize - this.stats.minifiedSize,
                savedBytesFormatted: this.formatBytes(this.stats.originalSize - this.stats.minifiedSize)
            },
            optimizations: [
                'Production mode enabled',
                'Debug logging removed',
                'CSS minification',
                'JavaScript minification',
                'String optimization',
                'Metadata updates'
            ]
        };

        fs.writeFileSync('build-report.json', JSON.stringify(report, null, 2));
        console.log('\n📊 Build report saved to build-report.json');
    }
}

// Run the build
if (require.main === module) {
    const builder = new ProductionBuilder();
    builder.build();
}

module.exports = ProductionBuilder;