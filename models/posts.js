const mongoose = require('mongoose')

postSchema = new mongoose.Schema({
    content: {type:String, required:true},
    // images: [String], // URLs of images
    // videos: [String], // URLs of videos
    createdAt: { type: Date, default: Date.now },
    image: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  });
const Post = mongoose.model('Post', postSchema);
module.exports = Post;