const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // image: { type: String, default: 'default-profile.webp' }, // Stores image URL or path
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});

// Create and export the user model
const User = mongoose.model('User', userSchema);
console.log("User model loaded"); // Debug log
module.exports = User;
