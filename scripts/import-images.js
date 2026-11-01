#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp', '.gif']);

async function* walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) yield* walk(fullPath);
        // Deliberately ignore symlinks so imports cannot escape the dataset mount.
        else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) yield fullPath;
    }
}
async function main() {
    const [projectId, subdirectory = '.'] = process.argv.slice(2);
    if (!projectId || !/^[a-f\d]{24}$/i.test(projectId)) {
        throw new Error('Usage: node scripts/import-images.js PROJECT_ID [DATASET_SUBDIRECTORY]');
    }
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
    const root = await fs.realpath(process.env.IMAGE_ROOT || '/data/images');
    const directory = await fs.realpath(path.resolve(root, subdirectory));
    if (directory !== root && !directory.startsWith(root + path.sep)) {
        throw new Error('The dataset subdirectory must be inside IMAGE_ROOT.');
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const projectOid = new mongoose.Types.ObjectId(projectId);
    if (!await mongoose.connection.db.collection('projects').findOne({ _id: projectOid })) {
        throw new Error('Project does not exist. Create it in VeraLabel first.');
    }
    const Image = mongoose.model('Image', new mongoose.Schema({
        projectId: mongoose.Schema.Types.ObjectId, filename: String, path: String,
        status: { type: String, default: 'pending' }, annotationCount: { type: Number, default: 0 },
    }, { timestamps: true }));
    Image.schema.index({ projectId: 1, filename: 1 }, { unique: true });
    await Image.init();
    let pending = [], found = 0, inserted = 0;
    const flush = async () => {
        if (!pending.length) return;
        const result = await Image.bulkWrite(pending, { ordered: false });
        inserted += result.upsertedCount;
        pending = [];
    };
    for await (const file of walk(directory)) {
        const relative = path.relative(root, file).split(path.sep).join('/');
        const imagePath = '/images/' + relative.split('/').map(encodeURIComponent).join('/');
        pending.push({ updateOne: {
            filter: { projectId: projectOid, filename: relative },
            update: { $setOnInsert: { projectId: projectOid, filename: relative,
                path: imagePath, status: 'pending', annotationCount: 0,
                createdAt: new Date(), updatedAt: new Date() } },
            upsert: true,
            // Re-imports must not modify existing image records or timestamps.
            timestamps: false,
        } });
        found++;
        if (pending.length >= 500) await flush();
    }
    await flush();
    console.log(`Found ${found} images; imported ${inserted}; already registered ${found - inserted}.`);
    if (!found) throw new Error('No supported images found. Check the mount and subdirectory.');
}
main().catch(error => {
    console.error('Image import failed:', error.message);
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
