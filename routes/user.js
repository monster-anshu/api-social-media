const router = require('express').Router();
const authUser = require('../middleware/authUser');
const User = require('../models/User');
const Post = require('../models/Post');
router.use(authUser);

router.get('/me', (req, res) => {
  try {
    const { password, ...other } = req.user;
    res.json({ success: true, user: other['_doc'] });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const gotUser = await User.findById(id).select('-password');

      if (!gotUser)
        return res.status(404).json({
          success: false,
          msg: 'User not found',
          error: error.toString(),
        });
      res.json({ success: true, user: gotUser });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to find',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    try {
      const gotUser = await User.findOne({ username }).select('-password');
      if (!gotUser)
        return res.status(404).json({
          success: false,
          msg: 'User not found',
        });
      res.json({ success: true, user: gotUser });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to find',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { isAdmin, updatedAt, createdAt, followers, _id, ...other } =
      req.body;

    if (!(user['id'] === id || user['isAdmin']))
      return res.status(401).json({ success: false, msg: 'Not Authorized' });
    try {
      const fetchedUser = await User.findById(id).select('id');
      if (!fetchedUser)
        return res.status(404).json({ success: false, msg: 'User not found' });
      await fetchedUser.updateOne({
        $set: other,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to update',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    if (!(user['id'] === id || user['isAdmin']))
      return res.status(401).json({ success: false, msg: 'Not Authorized' });
    try {
      const fetchedUser = await User.findById(id).select('id');
      if (!fetchedUser)
        return res.status(404).json({ success: false, msg: 'User not found' });
      await User.updateMany({
        $pull: {
          followers: id,
          following: id,
        },
      });

      await Post.updateMany({
        $pull: {
          likes: id,
        },
      });
      await fetchedUser.deleteOne();
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to delete',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.put('/follow/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    if (user['id'] === id)
      return res.status(403).json({ success: false, msg: "Can't follow self" });
    try {
      const toBeFollowed = await User.findOne({
        _id: id,
        followers: { $in: user['_id'] },
      }).select('id');

      if (toBeFollowed)
        return res
          .status(409)
          .json({ success: false, msg: 'Already following' });

      const follow = await User.updateOne(
        {
          _id: id,
        },
        {
          $push: {
            followers: user['_id'],
          },
        },
      );
      const following = await User.updateOne(
        {
          _id: user['_id'],
        },
        {
          $push: {
            following: id,
          },
        },
      );
      if (!follow.matchedCount || !following.matchedCount)
        return res
          .status(403)
          .json({ success: false, msg: 'Unable to follow' });

      res.json({ success: true, msg: 'Followed' });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to follow',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});
router.put('/unfollow/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    if (user['id'] === id)
      return res.status(403).json({ success: false, msg: "Can't follow self" });
    try {
      const toBeunFollowed = await User.findOne({
        _id: id,
        followers: { $in: user['_id'] },
      }).select('id');

      if (!toBeunFollowed)
        return res
          .status(400)
          .json({ success: false, msg: 'not following or user not found' });

      const follow = await User.updateOne(
        {
          _id: id,
        },
        {
          $pull: {
            followers: user['_id'],
          },
        },
      );
      const following = await User.updateOne(
        {
          _id: user['_id'],
        },
        {
          $pull: {
            following: id,
          },
        },
      );
      if (!follow.matchedCount || !following.matchedCount)
        return res
          .status(403)
          .json({ success: false, msg: 'Unable to unfollow' });

      res.json({ success: true, msg: 'Unfollowed' });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: 'Unable to follow',
        error: error.toString(),
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

module.exports = router;
