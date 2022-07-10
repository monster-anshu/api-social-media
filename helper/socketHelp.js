const User = require('../models/User');
const addUsers = async (userId, socketId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        socketId,
        isOnline: true,
      },
    });
  } catch (error) {
    console.log(error.toString());
  }
};
const getOnline = async () => {
  try {
    const users = await User.find(
      {
        isOnline: true,
      },
      {
        userId: '$_id',
      },
    )
      .select('id socketId isOnline')
      .limit(40);
    return users;
  } catch (error) {
    console.log(error.toString());
  }
};

const removeUser = async (socketId) => {
  try {
    await User.updateOne(
      { socketId },
      {
        $set: {
          socketId: null,
          isOnline: false,
        },
      },
    );
  } catch (error) {
    console.log(error.toString());
  }
};
const getSocketId = async (userId) => {
  try {
    const user = await User.findById(userId).select('socketId');
    return user;
  } catch (error) {
    console.log(error.toString());
  }
};

module.exports = { addUsers, removeUser, getSocketId, getOnline };
