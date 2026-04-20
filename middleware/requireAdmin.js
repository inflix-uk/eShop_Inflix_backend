module.exports = (req, res, next) => {
    try {
        const roleHeader = req.headers['x-user-role'] || req.headers['x-role'] || null;
        if (roleHeader && String(roleHeader).toLowerCase() === 'admin') {
            return next();
        }
        return res.status(403).json({ error: 'Forbidden: admin access required', status: 403 });
    } catch (error) {
        return res.status(403).json({ error: 'Forbidden: admin access required', status: 403 });
    }
};




