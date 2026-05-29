const router = require('express').Router();
const ctrl   = require('../controllers/communityController');
const { authAny } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

router.get('/posts',               ctrl.getPosts);
router.post('/posts',              authAny, uploadImage.array('images', 5), ctrl.createPost);
router.post('/posts/:id/like',     authAny, ctrl.likePost);
router.post('/posts/:id/comment',  authAny, ctrl.addComment);
router.post('/posts/:id/share',    authAny, ctrl.sharePost);
router.delete('/posts/:id',        authAny, ctrl.deletePost);
router.post('/posts/:id/report',   authAny, ctrl.reportPost);
router.get('/stories',             ctrl.getStories);
router.post('/stories',            authAny, uploadImage.single('media'), ctrl.createStory);
router.post('/stories/:id/view',   authAny, ctrl.viewStory);

// ADD THIS ROUTE:
const { User } = require('../models/User'); // <-- adjust import to your app's user model

router.get('/members', authAny, async (req, res) => {
  try {
    // Exclude self from results
    const myId = req.user._id.toString();
    const members = await User.find(
      { _id: { $ne: myId } },
      'name avatar bio isVerified' // select fields as needed
    );
    res.json({ success: true, members });
  } catch (err) {
    console.error('community/members error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;