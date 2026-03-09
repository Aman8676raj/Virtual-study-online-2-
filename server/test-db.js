const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const uri = process.env.MONGO_URI;

console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password

mongoose.connect(uri)
    .then(() => {
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ ERROR: Could not connect to MongoDB Atlas.');
        console.error('Reason:', err.message);
        console.log('\nPossible fixes:');
        console.log('1. Go to MongoDB Atlas Dashboard -> Network Access.');
        console.log('2. Click "Add IP Address".');
        console.log('3. Select "Add Current IP Address" and confirm.');
        process.exit(1);
    });
