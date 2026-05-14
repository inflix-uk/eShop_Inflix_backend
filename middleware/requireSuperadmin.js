const User = require("../src/models/user");

module.exports = async (req, res, next) => {
  try {
    const roleHeader = req.headers["x-user-role"] || req.headers["x-role"] || null;
    if (roleHeader && String(roleHeader).toLowerCase() === "superadmin") {
      return next();
    }

    const userIdHeader = req.headers["x-user-id"] || req.headers["x-userid"] || null;
    if (userIdHeader) {
      const user = await User.findById(String(userIdHeader)).select("role");
      if (user && user.role === "superadmin") {
        return next();
      }
    }

    return res.status(403).json({ error: "Forbidden: superadmin access required", status: 403 });
  } catch (error) {
    return res.status(403).json({ error: "Forbidden: superadmin access required", status: 403 });
  }
};
