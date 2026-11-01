#!/usr/bin/env node
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
    const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error('MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD are required.');
    }
    if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const User = mongoose.model('User', new mongoose.Schema({
        name: String, email: { type: String, unique: true }, password: String,
        role: String, isActive: Boolean,
    }, { timestamps: true }));
    await User.init();
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
        if (existing.role !== 'admin' || !existing.isActive) {
            throw new Error('ADMIN_EMAIL belongs to an inactive or non-admin user. Choose another email.');
        }
        console.log('Administrator already exists; credentials were not changed.');
        return;
    }
    await User.create({ name: 'System Administrator', email,
        password: await bcrypt.hash(ADMIN_PASSWORD, 12), role: 'admin', isActive: true });
    console.log('Initial administrator created.');
}
seed().catch(error => {
    console.error('Administrator setup failed:', error.message);
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
