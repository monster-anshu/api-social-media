const mongoose = require('mongoose');

const Post = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    description: {
      type: String,
      required: true,
      min: 5,
      max: 500,
    },
    image: {
      type: String,
    },
    tags: [
      {
        type: String,
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    comments: [
      {
        user: mongoose.Schema.Types.ObjectId,
        comment: String,
      },
    ],
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Post', Post);
