const Post = require('../models/Post');
const { body, validationResult } = require('express-validator');
const router = require('express').Router();
const authUser = require('../middleware/authUser');
const User = require('../models/User');

router.use(authUser);

router.post(
  '/',
  body('description', 'Enter at least 3 character').isLength({ min: 3 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), success: false });
    }
    try {
      const { description, image, tags } = req.body;
      const { user } = req;
      const newPost = await Post.create({
        userId: user['_id'],
        description,
        image,
        tags,
      });

      res.json({ success: true, newPost });
    } catch (error) {
      res
        .status(500)
        .json({ error: error.toString(), msg: 'Server down', success: false });
    }
  },
);

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const { likes, createdAt, updatedAt, ...other } = req.body;

    try {
      const post = await Post.findById(id).select('userId id');
      if (!post)
        return res.status(404).json({ success: false, msg: 'Post not found' });

      if (
        !(
          user['_id'].toString() === post['userId'].toString() ||
          user['isAdmin']
        )
      )
        return res
          .status(403)
          .json({ success: false, msg: "You can't access post" });
      await post.updateOne({
        $set: other,
      });
      res.json({ success: true, post });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.toString(),
        msg: "Can't update post",
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.get('/userId/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const user = await User.findById(id).select('id').select('id');
      if (!user)
        return res.status(400).json({ success: false, msg: 'User not found' });
      const post = await Post.find({ userId: user['id'] });
      res.json(post);
    } catch (error) {
      res
        .status(400)
        .json({ success: false, error: error.toString(), msg: 'Invalid Id' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.get('/postId/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const post = await Post.findById(id);
      res.json(post);
    } catch (error) {
      res
        .status(400)
        .json({ success: false, error: error.toString(), msg: 'Invalid Id' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.put('/like/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { user } = req;
    try {
      const check = await Post.findOne({
        _id: id,
        likes: { $in: user['id'] },
      }).select('id');

      if (check)
        return res
          .status(409)
          .json({ success: false, msg: 'Post Already liked' });
      const post = await Post.updateOne(
        { _id: id },
        {
          $push: {
            likes: user['_id'],
          },
        },
      );
      if (!post.matchedCount)
        return res.json({
          success: false,
          msg: 'Post not found',
        });
      res.json({ success: true, msg: 'Post liked' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, error: error.toString(), msg: 'Invalid Id' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.put('/unlike/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    try {
      const check = await Post.updateOne(
        { _id: id, likes: { $in: user['id'] } },
        {
          $pull: {
            likes: user['_id'],
          },
        },
      );

      if (!check.matchedCount)
        return res
          .status(404)
          .json({ success: false, msg: 'Post not liked or not found' });

      res.json({ success: true, msg: 'Post unliked' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, error: error.toString(), msg: 'Invalid Id' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    try {
      const deleted = await Post.findById(id).select('id userId');

      if (!deleted)
        return res.status(404).json({ msg: 'Post not found', success: false });

      if (
        !(
          user['_id'].toString() === deleted['userId'].toString() ||
          user['isAdmin']
        )
      )
        return res
          .status(403)
          .json({ success: false, msg: "You can't access post" });

      await deleted.deleteOne();
      res.json({ msg: 'Post Deleted', success: true });
    } catch (error) {
      res.status(400).json({
        error: error.toString(),
        msg: 'Invalid id',
        success: false,
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

router.get('/', async (req, res) => {
  try {
    const { user } = req;
    const currentUserPost = await Post.find({ userId: user['id'] });
    const friendPost = await Promise.all(
      user.following.map((friend) => Post.find({ userId: friend })),
    );
    const allPost = [...friendPost.flat(), ...currentUserPost];
    allPost.sort(function (pre, curr) {
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      console.log(new Date(pre['createdAt']).getHours());
      return new Date(curr['createdAt']) - new Date(pre['createdAt']);
    });

    res.json({
      success: true,
      post: allPost,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

module.exports = router;
