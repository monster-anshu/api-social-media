const authUser = require('../middleware/authUser');
const router = require('express').Router();
const { body, validationResult, param } = require('express-validator');
const { default: mongoose } = require('mongoose');
const Chat = require('../models/Chat');
const { getSocketId } = require('../helper/socketHelp');
router.use(authUser);

router.get('/getChat/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const personData = [mongoose.Types.ObjectId(id), user['_id']].sort();
    const result = await Chat.aggregate([
      {
        $match: {
          person: personData,
        },
      },
      {
        $unwind: '$chats',
      },
      {
        $sort: {
          'chats.createAt': -1,
        },
      },
      {
        $group: {
          _id: '$_id',
          chats: { $push: '$chats' },
        },
      },
    ]);

    res.json(result[0] ? result[0].chats : []);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.get('/getUser', async (req, res) => {
  try {
    const { user } = req;
    const result = await Chat.aggregate([
      {
        $match: {
          person: { $in: [user['_id']] },
        },
      },
      {
        $unwind: '$person',
      },
      {
        $group: {
          _id: '$_id',
          person: { $push: '$person' },
        },
      },
      {
        $project: {
          person: {
            $filter: {
              input: '$person',
              as: 'item',
              cond: { $ne: ['$$item', user['_id']] },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'person',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'posts',
                localField: '_id',
                foreignField: 'userId',
                as: 'userpost',
              },
            },
            {
              $project: {
                userFollowers: { $size: '$followers' },
                userFollowing: { $size: '$following' },
                amIFollowing: { $in: [user['_id'], '$followers'] },
                isHefollowing: { $in: [user['_id'], '$following'] },
                userPosts: { $size: '$userpost' },
                email: 1,
                name: 1,
                profilePicture: 1,
                coverPicture: 1,
                createdAt: 1,
                updatedAt: 1,
                username: 1,
              },
            },
          ],
          as: 'person',
        },
      },
    ]);
    res.json(result[0] ? result[0].person : []);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.post(
  '/:id',
  body('message', 'Message must be at least 1 character!').isLength({
    min: 1,
  }),
  param('id').custom((value, { req }) => {
    mongoose.Types.ObjectId(value);
    if (req.user['id'] === value) throw new Error("Can't send message to self");
    return true;
  }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { user, app } = req;
      const { message } = req.body;
      const { id } = req.params;
      const io = app.get('SocketIO');
      const newMessage = {
        _id: message._id,
        sender: user['_id'],
        text: message.text,
        createdAt: message.createdAt,
      };
      const reciver = await getSocketId(id);
      io.to(reciver.socketId).emit('reciveChat', newMessage);
      const personData = [mongoose.Types.ObjectId(id), user['_id']].sort();
      const result = await Chat.updateOne(
        {
          person: personData,
        },
        {
          $push: {
            chats: {
              text: message.text,
              sender: user['id'],
              createdAt: new Date().toISOString(),
            },
          },
        },
        {
          upsert: true,
        },
      );

      res.send('ok');
    } catch (error) {
      res
        .status(500)
        .json({ error: error.toString(), msg: 'Server down', success: false });
    }
  },
);

module.exports = router;
