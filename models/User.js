const { default: mongoose, model } = require('mongoose');
const bcrypt = require('bcrypt');
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 3,
      max: 2,
    },
    username: {
      type: String,
      required: true,
      min: 3,
      max: 20,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      min: 3,
      max: 50,
      unique: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    coverPicture: {
      type: String,
      default: '',
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    isAdmin: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      max: 50,
    },
    city: {
      type: String,
      max: 20,
    },
    from: {
      type: String,
      max: 50,
    },
    relationShip: {
      type: Number,
      enum: [1, 2, 3],
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.pre('updateOne', async function (next) {
  const password = this.getUpdate().$set.password;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    this.getUpdate().$set.password = await bcrypt.hash(password, salt);
  }
  next();
});

UserSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', UserSchema);
