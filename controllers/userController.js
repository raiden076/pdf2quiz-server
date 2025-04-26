const getUSerProfile = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('API: Error getting user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting user profile',
    });
  }
};

module.exports = { getUSerProfile };
