// controller/users.js

const Role = require("../models/roleAndPermissons");
const User = require("../models/user");


const roleAndPermissons = {
    createRole: async (req, res) => {
        try {
            const { name,description } = req.body;
        const role = new Role({ name, description });
        await role.save();
        return res.json({ message: 'Role created successfully', status: 201, role });
    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
    },
    deleteRole: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedRole = await Role.findByIdAndDelete(id);
            if (!deletedRole) {
                return res.status(404).json({ error: 'Role not found' });
            }
            return res.json({ message: 'Role deleted successfully', status: 201 });
        } catch (error) {
            console.error('Error deleting role:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    getRoleByID: async (req, res) =>{
        try {
            const { id } = req.params;
            const role = await Role.findById(id);
            if (!role) {
                return res.status(404).json({ error: 'Role not found' });
            }
            return res.json({ message: 'Role fetched successfully', status: 201, role });
        } catch (error) {
            console.error('Error getting role by ID:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    updateRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            const role = await Role.findById(id);
            if (!role) {
                return res.status(404).json({ error: 'Role not found' });
            }
            role.name = name;
            role.description = description;
            await role.save();
            return res.json({ 
                message: 'Role updated successfully',
                status: 201,
                role 
            });
        } catch (error) {
            console.error('Error updating role:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    getAllRole: async (req, res) => {
        try {
            const roles = await Role.find();

            // Get user count for each role
            const rolesWithCount = await Promise.all(
                roles.map(async (role) => {
                    const userCount = await User.countDocuments({ roleId: role._id });
                    return {
                        ...role.toObject(),
                        userCount
                    };
                })
            );

            return res.json({
                message: 'Role and permissions fetched successfully',
                status: 201,
                roles: rolesWithCount
            });
        } catch (error) {
            console.error('Error getting role and permissions:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    getUsersByRole: async (req, res) => {
        try {
            const { roleId } = req.params;

            // Verify role exists
            const role = await Role.findById(roleId);
            if (!role) {
                return res.status(404).json({ error: 'Role not found' });
            }

            // Get all users with this role
            const users = await User.find({ roleId: roleId }).select('-password');

            return res.json({
                message: 'Users fetched successfully',
                status: 200,
                role: {
                    _id: role._id,
                    name: role.name,
                    description: role.description
                },
                users,
                count: users.length
            });
        } catch (error) {
            console.error('Error getting users by role:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    implementPermissionOnRole: async (req, res) => {
        try {
            const { roleId, permissions } = req.body;
            const role = await Role.findById(roleId);
            if (!role) {
                return res.status(404).json({ error: 'Role not found' });
            }
            
            // Save permissions exactly as they come in the request - preserving the exact structure
            console.log('Permissions to be saved:', JSON.stringify(permissions, null, 2));
            
            // Use markModified to ensure Mongoose knows we're changing a Mixed type field
            // Save all permission categories from the request body
            role.permissions = permissions;
            
            // Mark the field as modified since we're using a Mixed type
            role.markModified('permissions');
            
            await role.save();
            
            return res.json({ 
                message: 'Permissions implemented successfully',
                status: 201,
                role 
            });
        } catch (error) {
            console.error('Error implementing permissions:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = roleAndPermissons;
