const User = require("../records/user");

const getDashboard = async (req, res, next) => {
  try {
    const employees = await User.find()
      .select("-password")
      .sort({ name: 1 })
      .limit(10);

    const totalEmployees = await User.countDocuments();

    res.json({
      employees,
      stats: {
        totalEmployees,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};
