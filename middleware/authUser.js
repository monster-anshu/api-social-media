const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    try {
      const validate = jwt.decode(token, process.env.KEY);
      if (!validate)
        return res.status(401).json({ success: false, msg: 'Not Authorized' });
      const user = await User.findById(validate.id).select(
        '-password -followers -following',
      );

      if (!user)
        return res.status(401).json({ success: false, msg: 'Not Authorized' });
      req.user = user;
      next();
    } catch (error) {}
    if (!token)
      return res.status(401).json({ success: false, msg: 'Not Authorized' });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.toString(), msg: 'Server down', success: false });
  }
};
module.exports = authUser;
