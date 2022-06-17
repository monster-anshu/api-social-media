const router = require('express').Router()
const User = require('../models/User')
const { body, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

router.post(
  '/register',

  body('username', 'Username must be at least 3 character!').isLength({
    min: 3,
  }),
  body('name', 'Name must be at least 3 character!').isLength({ min: 3 }),
  body('email', 'Enter a Valid Email !').isEmail(),
  body('password', 'Enter a Valid Password !').isLength({ min: 8 }),

  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const { username, password, name, email } = req.body

      try {
        const user = await User.create({
          username,
          password,
          name,
          email,
        })

        res.status(200).json({ username: user['username'], success: true })
      } catch (error) {
        res
          .status(409)
          .json({
            error: error.toString(),
            success: false,
            msg: 'Credatial Already Exists',
          })
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: error.toString(), msg: 'Server down', success: false })
    }
  },
)

router.post(
  '/login',
  body('email', 'Enter a Valid Email !').isEmail(),
  body('password', 'Enter a Valid Password !').isLength({ min: 8 }),
  async (req, res) => {
    try {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const { email, password } = req.body
      const user = await User.findOne({ email })
      if (!user)
        return res.status(404).json({ success: false, msg: 'User not foud' })
      const validate = await bcrypt.compare(password, user.password)
      //   const validate = user.password === password

      if (!validate)
        return res
          .status(401)
          .json({ sucess: false, msg: 'Password is incorrect' })
      try {
        const token = await jwt.sign(
          {
            id: user['_id'],
            email: user['email'],
            username: user['username'],
          },
          process.env.KEY,
        )
        // console.log(jwt.decode(token, process.env.KEY))
        res.json({ success: true, token })
      } catch (error) {
        res
          .status(500)
          .json({ error: error.toString(), msg: "Can't genrate auth token" })
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: error.toString(), msg: 'Server down', success: false })
    }
  },
)

module.exports = router
