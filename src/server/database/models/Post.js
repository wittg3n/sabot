const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    imgFileId: {
        type: String,
        required: true
    },
    voiceFileId: {
        type: String,
        required: true
    },
    music: {
        title: {
            type: String,
            required: true
        },
        artist: {
            type: String,
            required: true
        },
        fileId: {
            type: String,
            required: true
        }
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
