const { Schema, model } = require('mongoose');
const { ObjectId, String, Date } = Schema.Types;
const Chat = new Schema(
  {
    person: [
      {
        type: ObjectId,
      },
    ],
    chats: {
      type: [
        {
          sender: {
            type: ObjectId,
            required: true,
          },
          text: {
            type: String,
            required: true,
            minlength: 1,
          },
          createdAt: {
            type: Date,
            required: true,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);
module.exports = model('Chat', Chat);
