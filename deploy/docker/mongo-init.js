// Executed by the official MongoDB image only when /data/db is empty.
db = db.getSiblingDB('veralabel');
db.createUser({
    user: 'veralabel',
    pwd: process.env.MONGO_APP_PASSWORD,
    roles: [{ role: 'readWrite', db: 'veralabel' }],
});
