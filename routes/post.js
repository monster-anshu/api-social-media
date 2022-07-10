const Post = require('../models/Post');
const { body, validationResult } = require('express-validator');
const router = require('express').Router();
const authUser = require('../middleware/authUser');
const User = require('../models/User');
const uuid = require('uuid');
const multer = require('multer');
const {
  ref,
  getStorage,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} = require('firebase/storage');
const { firebaseApp } = require('../db');
const { default: mongoose } = require('mongoose');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1048576, //1048576
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == 'image/png' ||
      file.mimetype == 'image/jpg' ||
      file.mimetype == 'image/jpeg'
    ) {
      cb(null, true);
      return;
    }
    cb(null, false);
    return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  },
}).single('file');

router.use(authUser);

router.post(
  '/',
  (req, res, next) => {
    upload(req, res, async (err) => {
      if (err)
        return res.status(400).json({ err: err.toString(), success: false });
      next();
    });
  },
  body('description', 'Enter at least 3 character').isLength({ min: 3 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), success: false });
    }
    try {
      const { file, user } = req;
      const { description, tags } = req.body;
      let url, storageRef;

      try {
        if (file) {
          const imageByte = Uint8Array.from(file.buffer);

          const extention = file.originalname.split('.').pop();
          const FirebaseStorage = getStorage(
            firebaseApp,
            process.env.FIREBASE_BUCKET,
          );

          const RandomFile = `[${
            user['id']
          }]-[${new Date().toUTCString()}]-[${uuid.v4()}].${extention}`;
          storageRef = ref(FirebaseStorage, `posts/${RandomFile}`);
          await uploadBytes(storageRef, imageByte);
          url = await getDownloadURL(storageRef);
        }
      } catch (error) {
        return res.status(404).json({
          error: error.toString(),
          success: false,
        });
      }
      try {
        const create = await Post.create({
          userId: user['_id'],
          description,
          tags,
          image: url,
        });
        const post = (
          await Post.aggregate([
            { $match: { _id: create['_id'] } },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                pipeline: [
                  { $project: { name: 1, profilePicture: 1, username: 1 } },
                ],
                as: 'user',
              },
            },
            {
              $project: {
                postLikes: { $size: '$likes' },
                postComments: { $size: '$comments' },
                isAlreadyLiked: { $in: [user['_id'], '$likes'] },
                description: 1,
                tags: 1,
                _id: 1,
                createdAt: 1,
                updatedAt: 1,
                image: 1,
                isOwner: {
                  $eq: ['$userId', mongoose.Types.ObjectId(user['_id'])],
                },
                user: { $arrayElemAt: ['$user', 0] },
              },
            },
          ])
        )[0];

        res.json({ success: true, post });
      } catch (error) {
        if (storageRef)
          try {
            await deleteObject(storageRef);
          } catch (error) {}
        return res.status(404).json({
          error: error.toString(),
          success: false,
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error.toString(),
        msg: 'Server down',
        success: false,
      });
    }
  },
);

router.put('/postId/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const { likes, comments, createdAt, updatedAt, ...other } = req.body;

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
    let { page } = req.query;
    if (!page) page = 1;
    const { user } = req;
    const limit = 5;
    try {
      const fuser = await User.findById(id).select('id');
      if (!fuser)
        return res.status(400).json({ success: false, msg: 'User not found' });
      const post = await Post.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(fuser['id']) } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            pipeline: [
              { $project: { name: 1, profilePicture: 1, username: 1 } },
            ],
            as: 'user',
          },
        },
        {
          $project: {
            postLikes: { $size: '$likes' },
            postComments: { $size: '$comments' },
            isAlreadyLiked: { $in: [user['_id'], '$likes'] },
            description: 1,
            tags: 1,
            isOwner: { $eq: ['$userId', mongoose.Types.ObjectId(user['_id'])] },
            _id: 1,
            createdAt: 1,
            updatedAt: 1,
            image: 1,
            user: { $arrayElemAt: ['$user', 0] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: limit * (page - 1),
        },
        {
          $limit: limit,
        },
      ]);

      res.json({ success: true, post });
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
    const { user } = req;
    try {
      const post = await Post.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            pipeline: [
              { $project: { name: 1, profilePicture: 1, username: 1 } },
            ],
            as: 'user',
          },
        },
        {
          $project: {
            postLikes: { $size: '$likes' },
            postComments: { $size: '$comments' },
            isAlreadyLiked: { $in: [user['_id'], '$likes'] },
            description: 1,
            tags: 1,
            isOwner: { $eq: ['$userId', mongoose.Types.ObjectId(user['_id'])] },
            _id: 1,
            createdAt: 1,
            updatedAt: 1,
            image: 1,
            user: { $arrayElemAt: ['$user', 0] },
          },
        },
      ]);
      res.json({ success: true, post: post[0] });
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

router.put('/comment/:id', async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const update = await Post.updateOne(
      { _id: id },
      {
        $push: {
          comments: {
            user: user['_id'],
            comment: 'This is comment',
          },
        },
      },
    );

    res.send('ok');
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
      const check = await Post.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(id) } },
        {
          $project: {
            isAlreadyLiked: { $in: [user['_id'], '$likes'] },
          },
        },
      ]);

      const fpost = check[0];

      if (!fpost)
        return res.status(404).json({ success: false, msg: 'Post Not Found' });

      if (fpost.isAlreadyLiked)
        return res
          .status(409)
          .json({ success: false, msg: 'Post Already liked' });

      await Post.updateOne(
        { _id: id },
        {
          $push: {
            likes: user['_id'],
          },
        },
      );

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
      const deleted = await Post.findById(id).select('id userId image');

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

      const FirebaseStorage = getStorage(
        firebaseApp,
        process.env.FIREBASE_BUCKET,
      );

      const storageRef = ref(FirebaseStorage, deleted.image);
      try {
        await deleteObject(storageRef);
      } catch (error) {
        console.log(error.toString());
      }
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
    let { page } = req.query;
    if (!page) page = 1;

    const limit = 5;
    const post = await User.aggregate([
      { $match: { _id: user['_id'] } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'userId',
          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                pipeline: [
                  { $project: { name: 1, profilePicture: 1, username: 1 } },
                ],
                as: 'user',
              },
            },
            {
              $project: {
                postLikes: { $size: '$likes' },
                postComments: { $size: '$comments' },
                isAlreadyLiked: { $in: [user['_id'], '$likes'] },
                description: 1,
                tags: 1,
                _id: 1,
                createdAt: 1,
                updatedAt: 1,
                isOwner: {
                  $eq: ['$userId', mongoose.Types.ObjectId(user['_id'])],
                },
                image: 1,
                user: { $arrayElemAt: ['$user', 0] },
              },
            },
          ],
          as: 'my-post',
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'followers',
          foreignField: 'userId',

          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                pipeline: [
                  { $project: { name: 1, profilePicture: 1, username: 1 } },
                ],
                as: 'user',
              },
            },
            {
              $project: {
                postLikes: { $size: '$likes' },
                postComments: { $size: '$comments' },
                isAlreadyLiked: { $in: [user['_id'], '$likes'] },
                description: 1,
                tags: 1,
                _id: 1,
                createdAt: 1,
                isOwner: {
                  $eq: ['$userId', mongoose.Types.ObjectId(user['_id'])],
                },
                updatedAt: 1,
                image: 1,
                user: { $arrayElemAt: ['$user', 0] },
              },
            },
          ],
          as: 'follow-post',
        },
      },

      {
        $project: {
          posts: {
            $concatArrays: ['$my-post', '$follow-post'],
          },
        },
      },
      {
        $unwind: {
          path: '$posts',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { 'posts.createdAt': -1 },
      },
      {
        $group: {
          _id: '$_id',
          _posts: { $push: '$posts' },
        },
      },
      {
        $project: {
          totalPost: { $size: '$_posts' },
          posts: {
            $slice: ['$_posts', (page - 1) * limit, limit],
          },
        },
      },
    ]);
    res.json({
      success: true,
      total: post[0].totalPost,
      posts: post[0].posts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
});

module.exports = router;
