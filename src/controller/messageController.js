// controller/messageController.js
const db = require("../../connections/mongo");
const Message = require("../models/message");
const User = require("../models/user");
const ReturnOrder = require("../models/returnOrder");
const RequestOrder = require("../models/requestOrder");
const ConversationTag = require("../models/conversationTag");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const moment = require('moment');
const mongoose = require('mongoose');
const { exit } = require("process");
const { sendMessageNotification } = require("../../email/MessageNotification/MessageNotification");
const { sendMessageNotificationToAdmin } = require("../../email/MessageNotification/MessageNotificationToAdmin");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/message';
        // Check if the destination folder exists
        fs.access(destinationFolder, (err) => {
            if (err) {
                // If the folder doesn't exist, create it
                fs.mkdir(destinationFolder, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating destination folder:', err);
                        cb(err, null);
                    } else {
                        cb(null, destinationFolder);
                    }
                });
            } else {
                // If the folder already exists, use it
                cb(null, destinationFolder);
            }
        });
    },
    filename: function (req, file, cb) {
        const timestamp = moment().format('YYYYMMDD_HHmmss_'); // Add timestamp
        const uniqueName = timestamp + file.originalname; // Append timestamp to the original filename
        console.log("Original filename:", file.originalname);
        cb(null, uniqueName); // Use the unique filename
    }
    
});


const uploadImage = multer({ storage: storage }).any();

// 673743357202e69d0964d0db
const messageController = { 

    sendMessagesFromAdmin: async (req, res) => {
        uploadImage(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: 'Error uploading files', status: 400 });
            } else if (err) {
                console.error('Error uploading files:', err);
                return res.status(500).json({ message: 'Failed to upload files', status: 500 });
            }

        try {
            const { receiver } = req.params;
            const { message, orderId } = req.body;
             console.log(req.body);
             console.log(req.params);
             console.log(req.files);

            let attachments = [];
            if (req.files && req.files.length > 0) {
                attachments = req.files.map(file => ({
                    filename: file.filename,
                    path: file.path,
                    mimetype: file.mimetype
                }));
            }
            console.log(attachments);

            const adminId = "66cdf5f6dec61c826428d298";

            // Check if this is a return order conversation
            const isReturnOrder = orderId && orderId.startsWith('return_');
            const actualOrderId = isReturnOrder ? null : (orderId || null);
            const actualReturnOrderId = isReturnOrder ? orderId.replace('return_', '') : null;

            // Check if this is the first message between admin and this user
            const existingMessages = await Message.findOne({
                participants: { $all: [receiver, adminId] }
            });

            console.log("Existing messages:", existingMessages);

            // If no existing messages, create an initial blank message
            if (!existingMessages) {
                const initialMessage = new Message({
                    sender: receiver,
                    receiver: adminId,
                    participants: [ adminId,receiver],
                    message: "",
                    attachments: [],
                    readStatus: true,
                    orderId: actualOrderId,
                    returnOrderId: actualReturnOrderId
                });
                await initialMessage.save();
                console.log("Initial blank message created");
            }

            // Mark all messages between admin and this receiver as read
            await Message.updateMany(
                {
                    participants: { $all: [receiver, adminId] },
                    readStatus: false
                },
                { readStatus: true }
            );

            const newMessage = new Message({
                    receiver: receiver,
                    sender: adminId,
                    participants: [receiver, adminId],
                    message: message || "",
                    attachments: attachments,
                    orderId: actualOrderId,
                    returnOrderId: actualReturnOrderId
            });
            await newMessage.save();

            // Emit socket event for real-time message delivery
            if (global.io) {
                const BACKEND_URL_SOCKET = process.env.BACKEND_URL ;
                // Ensure proper URL construction
                const baseUrlSocket = BACKEND_URL_SOCKET.endsWith('/') ? BACKEND_URL_SOCKET.slice(0, -1) : BACKEND_URL_SOCKET;
                const messageData = {
                    ...newMessage.toObject(),
                    // Transform attachments to files array with full URLs (matching getMessagesByConversation format)
                    files: attachments.map(att => {
                        const filePath = att.path.startsWith('/') ? att.path : `/${att.path}`;
                        return `${baseUrlSocket}${filePath}`;
                    })
                };

                // Emit to customer's user room
                global.io.to(`user:${receiver}`).emit('new-message', messageData);

                // Emit to conversation room
                const conversationRoom = orderId && orderId !== 'general'
                    ? `conversation:${receiver}:${orderId}`
                    : `conversation:${receiver}:general`;
                global.io.to(conversationRoom).emit('new-message', messageData);

                console.log(`📤 Socket event emitted to user:${receiver} and ${conversationRoom}`);
            }

            // Email notification removed - now triggered manually via sendEmailNotification endpoint

            // Transform newMessage to include files array with full URLs
            const BACKEND_URL_RESPONSE = process.env.BACKEND_URL;
            // Ensure proper URL construction
            const baseUrl = BACKEND_URL_RESPONSE.endsWith('/') ? BACKEND_URL_RESPONSE.slice(0, -1) : BACKEND_URL_RESPONSE;
            const responseMessage = {
                ...newMessage.toObject(),
                files: attachments.map(att => {
                    const filePath = att.path.startsWith('/') ? att.path : `/${att.path}`;
                    return `${baseUrl}${filePath}`;
                })
            };

            res.status(200).json({
                success: true,
                message: "Message sent successfully and all previous messages marked as read",
                newMessage: responseMessage
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: "Error sending message"
            });
        }
        });
    },
    sendMessage: async (req, res) => {
        uploadImage(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error("Multer error:", err);
                return res.status(400).json({ message: "Error uploading files", status: 400 });
            } else if (err) {
                console.error("Error uploading files:", err);
                return res.status(500).json({ message: "Failed to upload files", status: 500 });
            }

            try {
                const { senderId } = req.params;
                let { message, requestOrder, orderId } = req.body;

                console.log("Received request body:", req.body);
                console.log("Received params:", req.params);
                // Allow message if it has text OR files
                if (!message && (!req.files || req.files.length === 0)) {
                    return res.status(400).json({
                        success: false,
                        message: "Message or attachment is required"
                    });
                }

                // Ensure `requestOrder` is stored as an object
                if (typeof requestOrder === "string") {
                    try {
                        requestOrder = JSON.parse(requestOrder); // Convert string to JSON object
                    } catch (error) {
                        console.error("Error parsing requestOrder:", error);
                        return res.status(400).json({ success: false, message: "Invalid requestOrder format" });
                    }
                }

                // Construct file attachments
                let attachments = [];
                if (req.files && req.files.length > 0) {
                    attachments = req.files.map((file) => ({
                        filename: file.filename,
                        path: file.path,
                        mimetype: file.mimetype,
                    }));
                }

                // Check if this is a return order conversation
                const isReturnOrder = orderId && orderId.startsWith('return_');
                const actualOrderId = isReturnOrder ? null : (orderId || null);
                const actualReturnOrderId = isReturnOrder ? orderId.replace('return_', '') : null;

                // Create new message
                const newMessage = new Message({
                    sender: senderId,
                    receiver: "66cdf5f6dec61c826428d298",
                    participants: ["66cdf5f6dec61c826428d298", senderId],
                    message: message || "",
                    attachments: attachments,
                    requestOrder: requestOrder, // Now correctly storing as an object
                    orderId: actualOrderId,
                    returnOrderId: actualReturnOrderId
                });

                await newMessage.save();

                // Emit socket event for real-time message delivery
                if (global.io) {
                    const adminId = "66cdf5f6dec61c826428d298";
                    const BACKEND_URL_SOCKET = process.env.BACKEND_URL || 'http://localhost:8080/';
                    const baseUrlSocket = BACKEND_URL_SOCKET.endsWith('/') ? BACKEND_URL_SOCKET.slice(0, -1) : BACKEND_URL_SOCKET;
                    const messageData = {
                        ...newMessage.toObject(),
                        files: attachments.map(att => {
                            const filePath = att.path.startsWith('/') ? att.path : `/${att.path}`;
                            return `${baseUrlSocket}${filePath}`;
                        })
                    };

                    // Emit to admin's user room
                    global.io.to(`user:${adminId}`).emit('new-message', messageData);

                    // Emit to conversation room (from admin's perspective)
                    const conversationRoom = orderId && orderId !== 'general'
                        ? `conversation:${senderId}:${orderId}`
                        : `conversation:${senderId}:general`;
                    global.io.to(conversationRoom).emit('new-message', messageData);

                    console.log(`📤 Socket event emitted to user:${adminId} and ${conversationRoom}`);
                }

                const userDetails = await User.findById(senderId);
                if (userDetails && userDetails.email) {
                    // Send email notification
                    const emailData = {
                        user: {
                            firstname: userDetails.firstname || '',
                            lastname: userDetails.lastname || '',
                            email: userDetails.email
                        },
                    };
                    
                    try {
                        await sendMessageNotificationToAdmin(emailData);
                        console.log(`Email notification sent to ${userDetails.email}`);
                    } catch (emailError) {
                        console.error('Failed to send email notification:', emailError);
                        // Continue with the response even if email fails
                    }
                }
            
                
                res.status(200).json({
                    success: true,
                    message: "Message sent successfully",
                    newMessage,
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Error sending message",
                });
            }
        });
    },    
    getMessages: async (req, res) => {
        try {
            const { sender } = req.params;
            console.log(req.params);
            const messages = await Message.find({
                $or: [{ sender }, { receiver: sender }],
                message: { $ne: "" }
            });
            console.log(messages);
            res.status(200).json({
                success: true,
                messages
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: "Error getting messages"
            });
        }
    },
    getUsersWhoSendMessage: async (req, res) => {
        try {
            const adminId = "66cdf5f6dec61c826428d298";
            const senderIds = await Message.distinct("sender");
            const users = await User.find({ _id: { $in: senderIds } }, { firstname: 1, lastname: 1, email: 1, phoneNumber: 1 });

            // Filter out admin user
            const filteredUsers = users.filter(user => user._id.toString() !== adminId);

            // Get unread message count and tags for each user
            const usersWithReadStatus = await Promise.all(
                filteredUsers.map(async (user) => {
                    // Get unread count (messages sent TO admin that are unread)
                    const unreadCount = await Message.countDocuments({
                        sender: user._id,        // Message from this user
                        receiver: adminId,       // Sent TO admin
                        readStatus: false,       // Unread by admin
                        message: { $ne: "" }     // Exclude empty placeholder messages
                    });

                    // Get all tags from user's conversations
                    const conversationTags = await ConversationTag.find({
                        userId: user._id
                    });

                    // Collect all unique tags from all conversations
                    const allTags = [];
                    const tagNames = new Set();

                    for (const convTag of conversationTags) {
                        for (const tag of convTag.tags) {
                            if (!tagNames.has(tag.name)) {
                                tagNames.add(tag.name);
                                allTags.push({
                                    name: tag.name,
                                    color: tag.color
                                });
                            }
                        }
                    }

                    return {
                        ...user.toObject(),
                        unreadCount,
                        tags: allTags
                    };
                })
            );

            res.status(200).json({
                success: true,
                filteredUsers: usersWithReadStatus
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: "Error getting users"
            });
        }
    },
    deleteMessage: async (req, res) => {
        try {
            const { messageId } = req.params;
            console.log("Deleting message with ID:", messageId);
    
            // Check if the message exists first
            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: "Message not found"
                });
            }
    
            // Proceed with deleting the message
            await Message.findByIdAndDelete(messageId);

            // Emit socket event for real-time deletion
            if (global.io) {
                const adminId = "66cdf5f6dec61c826428d298";
                const senderId = message.sender.toString();
                const receiverId = message.receiver.toString();
                const userId = senderId === adminId ? receiverId : senderId;

                const deleteData = {
                    messageId: messageId,
                    orderId: message.orderId
                };

                // Emit to both user rooms
                global.io.to(`user:${userId}`).emit('message-deleted', deleteData);
                global.io.to(`user:${adminId}`).emit('message-deleted', deleteData);

                // Emit to conversation room
                const orderId = message.orderId;
                const conversationRoom = orderId && orderId !== 'general'
                    ? `conversation:${userId}:${orderId}`
                    : `conversation:${userId}:general`;
                global.io.to(conversationRoom).emit('message-deleted', deleteData);

                console.log(`🗑️ Message deleted event emitted for message ${messageId} to user:${userId}`);
            }

            res.status(200).json({
                success: true,
                message: "Message deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting message:", error);
            res.status(500).json({
                success: false,
                message: "Error deleting message"
            });
        }
    },
    
    updateMessage: async (req, res) => {
        try {
            const { messageId } = req.params;
            const { message } = req.body;

            // Check if message exists
            const existingMessage = await Message.findById(messageId);
            if (!existingMessage) {
                return res.status(404).json({
                    success: false,
                    message: "Message not found"
                });
            }

            // Update the message and add edited flag
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                {
                    message,
                    edited: true,
                    editedAt: new Date()
                },
                { new: true }
            );

            // Emit socket event for real-time update
            console.log('🔍 Checking global.io:', !!global.io);
            if (global.io) {
                const adminId = "66cdf5f6dec61c826428d298";
                // Convert ObjectId to string for comparison
                const senderId = existingMessage.sender.toString();
                const receiverId = existingMessage.receiver.toString();
                const userId = senderId === adminId ? receiverId : senderId;

                const messageData = {
                    ...updatedMessage.toObject(),
                    files: (updatedMessage.attachments || []).map(att => ({
                        url: `/${att.path}`,
                        name: att.filename,
                        type: att.mimetype
                    }))
                };

                // Emit to both user rooms
                global.io.to(`user:${userId}`).emit('message-updated', messageData);
                global.io.to(`user:${adminId}`).emit('message-updated', messageData);

                // Emit to conversation room
                const orderId = existingMessage.orderId;
                const conversationRoom = orderId && orderId !== 'general'
                    ? `conversation:${userId}:${orderId}`
                    : `conversation:${userId}:general`;
                global.io.to(conversationRoom).emit('message-updated', messageData);

                console.log(`📝 Message updated event emitted for message ${messageId} to user:${userId}`);
            }

            res.status(200).json({
                success: true,
                message: "Message updated successfully",
                data: updatedMessage
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: "Error updating message"
            });
        }
    },
    deleteAllMessageOfThisUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const specificUserId = "66cdf5f6dec61c826428d298";
            
            await Message.deleteMany({ participants: { $all: [specificUserId, userId] } });
            
            res.status(200).json({
                success: true,
                message: "All messages between these users deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting messages:", error);
            res.status(500).json({
                success: false,
                message: "Error deleting messages"
            });
        }
    },
    getTotalMessagesCount: async (req, res) => {
        try {
            const adminId = "66cdf5f6dec61c826428d298";

            // Get all users who have sent messages (same logic as getUsersWhoSendMessage)
            const senderIds = await Message.distinct("sender");
            const users = await User.find({ _id: { $in: senderIds } }, { _id: 1 });

            // Filter out admin user
            const validUserIds = users
                .filter(user => user._id.toString() !== adminId)
                .map(user => user._id);

            // Count only unread messages FROM valid customers TO admin
            const unreadMessagesCount = await Message.countDocuments({
                sender: { $in: validUserIds }, // Only from existing users
                receiver: adminId,             // Messages sent TO admin
                readStatus: false,             // That are unread
                message: { $ne: "" }           // Exclude empty placeholder messages
            });

            res.status(200).json({
                success: true,
                unreadMessagesCount,
                message: 'Successfully retrieved count of unread messages'
            });
        } catch (error) {
            console.error("Error getting unread messages count:", error);
            res.status(500).json({
                success: false,
                message: "Error getting unread messages count"
            });
        }
    },
    getConversations: async (req, res) => {
        try {
            const { userId } = req.params;
            const adminId = "66cdf5f6dec61c826428d298";

            console.log("Getting conversations for user:", userId);

            // Get all messages for this user (include messages with text OR attachments)
            const messages = await Message.find({
                participants: { $all: [adminId, userId] },
                $or: [
                    { message: { $ne: "" } },
                    { attachments: { $exists: true, $ne: [] } }
                ]
            }).sort({ createdAt: -1 });

            // Group messages by orderId OR returnOrderId
            const conversationsMap = new Map();

            for (const message of messages) {
                // Determine conversation key based on orderId or returnOrderId
                let conversationKey;
                let isReturnOrder = false;

                if (message.returnOrderId) {
                    conversationKey = `return_${message.returnOrderId.toString()}`;
                    isReturnOrder = true;
                } else if (message.orderId) {
                    conversationKey = message.orderId.toString();
                } else {
                    conversationKey = 'general';
                }

                if (!conversationsMap.has(conversationKey)) {
                    // Get unread count
                    const unreadQuery = {
                        participants: { $all: [adminId, userId] },
                        receiver: userId,
                        readStatus: false
                    };

                    if (isReturnOrder) {
                        unreadQuery.returnOrderId = message.returnOrderId;
                    } else if (message.orderId) {
                        unreadQuery.orderId = message.orderId;
                    } else {
                        unreadQuery.orderId = null;
                        unreadQuery.returnOrderId = null;
                    }

                    const unreadCount = await Message.countDocuments(unreadQuery);

                    conversationsMap.set(conversationKey, {
                        conversationId: conversationKey,
                        orderId: message.orderId,
                        returnOrderId: message.returnOrderId,
                        isReturnOrder: isReturnOrder,
                        lastMessage: message.message,
                        lastMessageTime: message.createdAt,
                        unreadCount: unreadCount,
                        hasAttachments: message.attachments && message.attachments.length > 0
                    });
                }
            }

            // Convert map to array
            const conversations = Array.from(conversationsMap.values());

            // Populate order/return order details and tags for conversations
            const Order = require("../models/order");
            for (const conversation of conversations) {
                // Populate order details
                if (conversation.orderId) {
                    const order = await Order.findById(conversation.orderId);
                    if (order) {
                        conversation.orderNumber = order.orderNumber;
                        conversation.orderStatus = order.status;
                    }
                }

                // Populate return order details
                if (conversation.returnOrderId) {
                    const returnOrder = await ReturnOrder.findById(conversation.returnOrderId);
                    if (returnOrder) {
                        conversation.returnOrderNumber = returnOrder.rma || `RO-${conversation.returnOrderId.toString().slice(-6)}`;
                        conversation.returnOrderStatus = returnOrder.status;
                    }
                }

                // Populate tags
                const conversationTags = await ConversationTag.findOne({
                    userId,
                    conversationId: conversation.conversationId
                });
                conversation.tags = conversationTags ? conversationTags.tags : [];
            }

            // Sort by last message time (most recent first)
            conversations.sort((a, b) =>
                new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
            );

            res.status(200).json({
                success: true,
                conversations
            });
        } catch (error) {
            console.error("Error getting conversations:", error);
            res.status(500).json({
                success: false,
                message: "Error getting conversations"
            });
        }
    },
    getConversationsForAdmin: async (req, res) => {
        try {
            const { userId } = req.params;
            const adminId = "66cdf5f6dec61c826428d298";

            console.log("Admin getting conversations for customer:", userId);

            // Get all messages between admin and this customer
            const messages = await Message.find({
                participants: { $all: [adminId, userId] },
                message: { $ne: "" }
            }).sort({ createdAt: -1 });

            // Group messages by orderId or returnOrderId
            const conversationsMap = new Map();

            for (const message of messages) {
                // Determine conversation key: return_<id>, <orderId>, or 'general'
                let conversationKey;
                let isReturnOrder = false;

                if (message.returnOrderId) {
                    conversationKey = `return_${message.returnOrderId.toString()}`;
                    isReturnOrder = true;
                } else if (message.orderId) {
                    conversationKey = message.orderId.toString();
                } else {
                    conversationKey = 'general';
                }

                if (!conversationsMap.has(conversationKey)) {
                    // Build query for unread count
                    const unreadQuery = {
                        participants: { $all: [adminId, userId] },
                        sender: userId,      // From customer
                        receiver: adminId,   // To admin
                        readStatus: false,   // Unread by admin
                        message: { $ne: "" } // Exclude empty placeholder messages
                    };

                    if (isReturnOrder) {
                        unreadQuery.returnOrderId = message.returnOrderId;
                    } else {
                        unreadQuery.orderId = message.orderId;
                    }

                    const unreadCount = await Message.countDocuments(unreadQuery);

                    conversationsMap.set(conversationKey, {
                        conversationId: conversationKey,
                        orderId: message.orderId,
                        returnOrderId: message.returnOrderId,
                        isReturnOrder: isReturnOrder,
                        lastMessage: message.message,
                        lastMessageTime: message.createdAt,
                        unreadCount: unreadCount,
                        hasAttachments: message.attachments && message.attachments.length > 0
                    });
                }
            }

            // Convert map to array
            const conversations = Array.from(conversationsMap.values());

            // Populate order/return order details and tags for conversations
            const Order = require("../models/order");
            for (const conversation of conversations) {
                // Populate order details
                if (conversation.orderId) {
                    const order = await Order.findById(conversation.orderId);
                    if (order) {
                        conversation.orderNumber = order.orderNumber;
                        conversation.orderStatus = order.status;
                    }
                }

                // Populate return order details
                if (conversation.returnOrderId) {
                    const returnOrder = await ReturnOrder.findById(conversation.returnOrderId);
                    if (returnOrder) {
                        conversation.returnOrderNumber = returnOrder.rma || `RO-${conversation.returnOrderId.toString().slice(-6)}`;
                        conversation.returnOrderStatus = returnOrder.status;
                    }
                }

                // Populate tags
                const conversationTags = await ConversationTag.findOne({
                    userId,
                    conversationId: conversation.conversationId
                });
                conversation.tags = conversationTags ? conversationTags.tags : [];
            }

            // Sort by last message time (most recent first)
            conversations.sort((a, b) =>
                new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
            );

            res.status(200).json({
                success: true,
                conversations
            });
        } catch (error) {
            console.error("Error getting admin conversations:", error);
            res.status(500).json({
                success: false,
                message: "Error getting conversations for admin"
            });
        }
    },
    getMessagesByConversation: async (req, res) => {
        try {
            const { userId, orderId } = req.params;
            const adminId = "66cdf5f6dec61c826428d298";

            console.log("Getting messages for user:", userId, "orderId:", orderId);

            const query = {
                participants: { $all: [adminId, userId] },
                // Include messages with text OR attachments (not empty placeholder messages)
                $or: [
                    { message: { $ne: "" } },
                    { attachments: { $exists: true, $ne: [] } }
                ]
            };

            // Check if this is a return order conversation
            const isReturnOrder = orderId && orderId.startsWith('return_');
            const actualId = isReturnOrder ? orderId.replace('return_', '') : orderId;

            // Add orderId/returnOrderId filter
            if (orderId && orderId !== 'general') {
                if (isReturnOrder) {
                    query.returnOrderId = actualId;
                    query.orderId = null; // Ensure we only get return order messages
                } else {
                    query.orderId = orderId;
                    query.returnOrderId = null; // Ensure we only get regular order messages
                }
            } else if (orderId === 'general') {
                query.orderId = null;
                query.returnOrderId = null;
            }

            const messagesRaw = await Message.find(query).sort({ createdAt: 1 });

            // Transform attachments to files array with full URLs
            const BACKEND_URL = process.env.BACKEND_URL;
            // Ensure proper URL construction
            const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
            const messages = messagesRaw.map(msg => {
                const msgObj = msg.toObject();
                // Transform attachments to files array with full URLs
                if (msgObj.attachments && msgObj.attachments.length > 0) {
                    msgObj.files = msgObj.attachments.map(att => {
                        // Build full URL for the file
                        const filePath = att.path.startsWith('/') ? att.path : `/${att.path}`;
                        return `${baseUrl}${filePath}`;
                    });
                } else {
                    msgObj.files = [];
                }
                return msgObj;
            });

            // Mark all messages TO this user in this conversation as read
            const updateQuery = {
                participants: { $all: [adminId, userId] },
                receiver: userId,  // Mark messages TO the user as read (not FROM)
                readStatus: false
            };

            // Add orderId/returnOrderId filter for marking as read
            if (orderId && orderId !== 'general') {
                if (isReturnOrder) {
                    updateQuery.returnOrderId = actualId;
                } else {
                    updateQuery.orderId = orderId;
                }
            } else if (orderId === 'general') {
                updateQuery.orderId = null;
                updateQuery.returnOrderId = null;
            }

            const updateResult = await Message.updateMany(updateQuery, { readStatus: true });

            // Emit socket event to notify admin that messages were read
            if (global.io && updateResult.modifiedCount > 0) {
                global.io.to(`user:${adminId}`).emit('messages-read', {
                    userId,
                    orderId: orderId || 'general',
                    readAt: new Date().toISOString(),
                    count: updateResult.modifiedCount
                });
                console.log(`📖 Read receipt sent to admin for user:${userId}, order:${orderId || 'general'}`);
            }

            res.status(200).json({
                success: true,
                messages
            });
        } catch (error) {
            console.error("Error getting messages by conversation:", error);
            res.status(500).json({
                success: false,
                message: "Error getting messages"
            });
        }
    },

    // Tag Management
    addTagToConversation: async (req, res) => {
        try {
            const { userId, conversationId } = req.params;
            const { tagName, tagColor, orderId } = req.body;

            if (!tagName) {
                return res.status(400).json({
                    success: false,
                    message: "Tag name is required"
                });
            }

            // Find or create conversation tags document
            let conversationTags = await ConversationTag.findOne({
                userId,
                conversationId
            });

            if (!conversationTags) {
                conversationTags = new ConversationTag({
                    userId,
                    conversationId,
                    orderId: orderId || null,
                    tags: []
                });
            }

            // Check if tag already exists
            const tagExists = conversationTags.tags.some(tag => tag.name === tagName);
            if (tagExists) {
                return res.status(400).json({
                    success: false,
                    message: "Tag already exists for this conversation"
                });
            }

            // Add new tag
            conversationTags.tags.push({
                name: tagName,
                color: tagColor || '#3B82F6',
                createdAt: new Date()
            });

            await conversationTags.save();

            res.status(200).json({
                success: true,
                message: "Tag added successfully",
                tags: conversationTags.tags
            });
        } catch (error) {
            console.error("Error adding tag:", error);
            res.status(500).json({
                success: false,
                message: "Error adding tag"
            });
        }
    },

    removeTagFromConversation: async (req, res) => {
        try {
            const { userId, conversationId, tagName } = req.params;

            const conversationTags = await ConversationTag.findOne({
                userId,
                conversationId
            });

            if (!conversationTags) {
                return res.status(404).json({
                    success: false,
                    message: "No tags found for this conversation"
                });
            }

            // Remove the tag
            conversationTags.tags = conversationTags.tags.filter(tag => tag.name !== tagName);
            await conversationTags.save();

            res.status(200).json({
                success: true,
                message: "Tag removed successfully",
                tags: conversationTags.tags
            });
        } catch (error) {
            console.error("Error removing tag:", error);
            res.status(500).json({
                success: false,
                message: "Error removing tag"
            });
        }
    },

    getConversationTags: async (req, res) => {
        try {
            const { userId, conversationId } = req.params;

            const conversationTags = await ConversationTag.findOne({
                userId,
                conversationId
            });

            res.status(200).json({
                success: true,
                tags: conversationTags ? conversationTags.tags : []
            });
        } catch (error) {
            console.error("Error getting tags:", error);
            res.status(500).json({
                success: false,
                message: "Error getting tags"
            });
        }
    },

    getAllPredefinedTags: async (req, res) => {
        try {
            // Predefined tags with colors
            const predefinedTags = [
                { name: 'Urgent', color: '#EF4444' },          // Red
                { name: 'Follow-up', color: '#F59E0B' },       // Amber
                { name: 'Complaint', color: '#DC2626' },       // Dark Red
                { name: 'Refund', color: '#8B5CF6' },          // Purple
                { name: 'Return', color: '#6366F1' },          // Indigo
                { name: 'Shipping Issue', color: '#EC4899' },  // Pink
                { name: 'Product Question', color: '#3B82F6' },// Blue
                { name: 'Payment Issue', color: '#F97316' },   // Orange
                { name: 'VIP Customer', color: '#FBBF24' },    // Yellow
                { name: 'Resolved', color: '#10B981' },        // Green
                { name: 'Pending', color: '#6B7280' },         // Gray
                { name: 'In Progress', color: '#14B8A6' }      // Teal
            ];

            res.status(200).json({
                success: true,
                tags: predefinedTags
            });
        } catch (error) {
            console.error("Error getting predefined tags:", error);
            res.status(500).json({
                success: false,
                message: "Error getting predefined tags"
            });
        }
    },

    /**
     * Toggle read status of ALL messages in a conversation (from customer to admin)
     * PATCH /toggle/message/read-status/:userId/:orderId
     */
    toggleLastMessageReadStatus: async (req, res) => {
        try {
            const { userId, orderId } = req.params;
            const adminId = "66cdf5f6dec61c826428d298";

            console.log("Toggling read status for user:", userId, "orderId:", orderId);

            // Build query to find messages FROM customer TO admin in this conversation
            const query = {
                participants: { $all: [adminId, userId] },
                sender: userId,      // From customer
                receiver: adminId,   // To admin
                message: { $ne: "" }
            };

            // Add orderId filter
            if (orderId && orderId !== 'general') {
                query.orderId = orderId;
            } else if (orderId === 'general') {
                query.orderId = null;
            }

            // Find the last message to determine current status
            const lastMessage = await Message.findOne(query).sort({ createdAt: -1 });

            if (!lastMessage) {
                return res.status(404).json({
                    success: false,
                    message: "No messages found in this conversation"
                });
            }

            // Toggle: if last message is read, mark all as unread; if unread, mark all as read
            const newReadStatus = !lastMessage.readStatus;

            // Update ALL messages in this conversation
            const updateResult = await Message.updateMany(query, { readStatus: newReadStatus });

            console.log(`Updated ${updateResult.modifiedCount} messages to readStatus: ${newReadStatus}`);

            // Emit socket event for real-time update
            if (global.io) {
                const statusData = {
                    userId,
                    orderId: orderId || 'general',
                    readStatus: newReadStatus,
                    modifiedCount: updateResult.modifiedCount,
                    updatedAt: new Date().toISOString()
                };

                // Emit to admin
                global.io.to(`user:${adminId}`).emit('message-read-status-toggled', statusData);

                console.log(`🔄 Read status toggled for ${updateResult.modifiedCount} messages: ${newReadStatus}`);
            }

            res.status(200).json({
                success: true,
                message: `${updateResult.modifiedCount} message(s) marked as ${newReadStatus ? 'read' : 'unread'}`,
                readStatus: newReadStatus,
                modifiedCount: updateResult.modifiedCount
            });
        } catch (error) {
            console.error("Error toggling read status:", error);
            res.status(500).json({
                success: false,
                message: "Error toggling read status"
            });
        }
    },

    /**
     * Assign all general chat messages to a specific order
     * POST /assign/general-chat-to-order/:userId/:orderId
     */
    assignGeneralChatToOrder: async (req, res) => {
        try {
            const { userId, orderId } = req.params;
            const adminId = "66cdf5f6dec61c826428d298";

            console.log("Assigning general chat messages to order:", orderId, "for user:", userId);

            // Find all general chat messages (orderId is null) between admin and this user
            const query = {
                participants: { $all: [adminId, userId] },
                orderId: null,
                message: { $ne: "" }
            };

            // Count messages before update
            const messageCount = await Message.countDocuments(query);

            if (messageCount === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No general chat messages to assign",
                    assignedCount: 0
                });
            }

            // Update all general chat messages to the new orderId
            const updateResult = await Message.updateMany(
                query,
                { orderId: orderId }
            );

            console.log(`Assigned ${updateResult.modifiedCount} messages from general chat to order ${orderId}`);

            // Emit socket event for real-time update
            if (global.io) {
                const assignmentData = {
                    userId,
                    fromOrderId: 'general',
                    toOrderId: orderId,
                    assignedCount: updateResult.modifiedCount,
                    assignedAt: new Date().toISOString()
                };

                // Emit to admin
                global.io.to(`user:${adminId}`).emit('general-chat-assigned', assignmentData);
                // Emit to user
                global.io.to(`user:${userId}`).emit('general-chat-assigned', assignmentData);

                console.log(`📦 General chat assigned to order ${orderId} for user ${userId}`);
            }

            res.status(200).json({
                success: true,
                message: `${updateResult.modifiedCount} message(s) assigned to order successfully`,
                assignedCount: updateResult.modifiedCount,
                orderId: orderId
            });
        } catch (error) {
            console.error("Error assigning general chat to order:", error);
            res.status(500).json({
                success: false,
                message: "Error assigning general chat to order"
            });
        }
    },

    /**
     * Send email notification to a user manually
     * POST /send/email-notification/:userId
     */
    sendEmailNotificationToUser: async (req, res) => {
        try {
            const { userId } = req.params;

            // Get user details
            const userDetails = await User.findById(userId);
            if (!userDetails) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            if (!userDetails.email) {
                return res.status(400).json({
                    success: false,
                    message: "User does not have an email address"
                });
            }

            // Send email notification
            const emailData = {
                user: {
                    firstname: userDetails.firstname || '',
                    lastname: userDetails.lastname || '',
                    email: userDetails.email
                },
                portalUrl: 'https://zextons.co.uk/login'
            };

            await sendMessageNotification(emailData);
            console.log(`📧 Email notification manually sent to ${userDetails.email}`);

            res.status(200).json({
                success: true,
                message: `Email notification sent to ${userDetails.email}`,
                email: userDetails.email
            });
        } catch (error) {
            console.error("Error sending email notification:", error);
            res.status(500).json({
                success: false,
                message: "Error sending email notification"
            });
        }
    },

    /**
     * Get all conversations across all users (for Chat List view)
     * GET /messages/all-conversations
     * OPTIMIZED: Uses aggregation + batch fetching
     * Supports both regular orders and return orders
     */
    getAllConversations: async (req, res) => {
        try {
            const adminId = "66cdf5f6dec61c826428d298";
            const adminObjectId = new mongoose.Types.ObjectId(adminId);
            const Order = require("../models/order");

            // STEP 1: Use aggregation to get all conversations
            // Group by userId + orderId + returnOrderId to handle both order types
            const conversationsAgg = await Message.aggregate([
                // Match messages with admin participant and non-empty message
                {
                    $match: {
                        participants: adminId,
                        message: { $ne: "" }
                    }
                },
                // Extract the non-admin user from participants array
                {
                    $addFields: {
                        extractedUserId: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$participants",
                                        cond: { $ne: ["$$this", adminId] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                // Filter out messages without a valid user
                {
                    $match: {
                        extractedUserId: { $ne: null }
                    }
                },
                // Sort by date first (for $first to get latest)
                { $sort: { createdAt: -1 } },
                // Group by userId + orderId + returnOrderId
                {
                    $group: {
                        _id: {
                            userId: "$extractedUserId",
                            orderId: "$orderId",
                            returnOrderId: "$returnOrderId"
                        },
                        lastMessage: { $first: "$message" },
                        lastMessageTime: { $first: "$createdAt" },
                        hasAttachments: { $first: { $gt: [{ $size: { $ifNull: ["$attachments", []] } }, 0] } }
                    }
                }
            ]);

            if (conversationsAgg.length === 0) {
                return res.status(200).json({
                    success: true,
                    conversations: []
                });
            }

            // STEP 2: Collect unique IDs for batch fetching
            const userIds = [...new Set(conversationsAgg.map(c => c._id.userId))];
            const orderIds = conversationsAgg
                .filter(c => c._id.orderId)
                .map(c => c._id.orderId.toString());
            const uniqueOrderIds = [...new Set(orderIds)];

            // Collect return order IDs
            const returnOrderIds = conversationsAgg
                .filter(c => c._id.returnOrderId)
                .map(c => c._id.returnOrderId.toString());
            const uniqueReturnOrderIds = [...new Set(returnOrderIds)];

            // STEP 3: Batch fetch all related data IN PARALLEL
            const [users, orders, returnOrders, unreadCounts, allTags] = await Promise.all([
                // Query 1: Fetch all users at once
                User.find(
                    { _id: { $in: userIds } },
                    { firstname: 1, lastname: 1, email: 1, phoneNumber: 1 }
                ).lean(),

                // Query 2: Fetch all orders at once
                uniqueOrderIds.length > 0
                    ? Order.find(
                        { _id: { $in: uniqueOrderIds } },
                        { orderNumber: 1, status: 1 }
                    ).lean()
                    : Promise.resolve([]),

                // Query 3: Fetch all return orders at once
                uniqueReturnOrderIds.length > 0
                    ? ReturnOrder.find(
                        { _id: { $in: uniqueReturnOrderIds } },
                        { rma: 1, status: 1 }
                    ).lean()
                    : Promise.resolve([]),

                // Query 4: Get unread counts using aggregation (for both orderId and returnOrderId)
                Message.aggregate([
                    {
                        $match: {
                            receiver: adminObjectId,
                            readStatus: false,
                            message: { $ne: "" }
                        }
                    },
                    {
                        $group: {
                            _id: { sender: "$sender", orderId: "$orderId", returnOrderId: "$returnOrderId" },
                            count: { $sum: 1 }
                        }
                    }
                ]),

                // Query 5: Fetch all tags at once
                ConversationTag.find({
                    userId: { $in: userIds }
                }).lean()
            ]);

            // STEP 4: Create lookup maps for O(1) access
            const usersMap = new Map(users.map(u => [
                u._id.toString(),
                {
                    _id: u._id,
                    name: `${u.firstname || ''} ${u.lastname || ''}`.trim(),
                    email: u.email,
                    phoneNumber: u.phoneNumber
                }
            ]));

            const ordersMap = new Map(orders.map(o => [o._id.toString(), o]));
            const returnOrdersMap = new Map(returnOrders.map(ro => [ro._id.toString(), ro]));

            // Build unread map with support for return orders
            const unreadMap = new Map();
            unreadCounts.forEach(u => {
                let key;
                if (u._id.returnOrderId) {
                    key = `${u._id.sender.toString()}-return_${u._id.returnOrderId.toString()}`;
                } else if (u._id.orderId) {
                    key = `${u._id.sender.toString()}-${u._id.orderId.toString()}`;
                } else {
                    key = `${u._id.sender.toString()}-general`;
                }
                unreadMap.set(key, u.count);
            });

            const tagsMap = new Map();
            allTags.forEach(t => {
                const key = `${t.userId.toString()}-${t.conversationId}`;
                tagsMap.set(key, t.tags);
            });

            // STEP 5: Build final response (no more DB queries!)
            const allConversations = conversationsAgg.map(conv => {
                const orderId = conv._id.orderId;
                const returnOrderId = conv._id.returnOrderId;
                const userId = conv._id.userId;

                // Determine conversation key and type
                let conversationKey;
                let isReturnOrder = false;

                if (returnOrderId) {
                    conversationKey = `return_${returnOrderId.toString()}`;
                    isReturnOrder = true;
                } else if (orderId) {
                    conversationKey = orderId.toString();
                } else {
                    conversationKey = 'general';
                }

                const user = usersMap.get(userId);
                if (!user) return null;

                const order = orderId ? ordersMap.get(orderId.toString()) : null;
                const returnOrder = returnOrderId ? returnOrdersMap.get(returnOrderId.toString()) : null;
                const unreadKey = `${userId}-${conversationKey}`;
                const tagsKey = `${userId}-${conversationKey}`;

                const conversationData = {
                    conversationId: conversationKey,
                    orderId: orderId,
                    orderNumber: order?.orderNumber || null,
                    orderStatus: order?.status || null,
                    returnOrderId: returnOrderId,
                    returnOrderNumber: returnOrder?.rma || (returnOrderId ? `RO-${returnOrderId.toString().slice(-6)}` : null),
                    returnOrderStatus: returnOrder?.status || null,
                    isReturnOrder: isReturnOrder,
                    lastMessage: conv.lastMessage,
                    lastMessageTime: conv.lastMessageTime,
                    unreadCount: unreadMap.get(unreadKey) || 0,
                    hasAttachments: conv.hasAttachments,
                    user: user,
                    tags: tagsMap.get(tagsKey) || []
                };

                return conversationData;
            }).filter(Boolean);

            // Sort by last message time (most recent first)
            allConversations.sort((a, b) =>
                new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
            );

            res.status(200).json({
                success: true,
                conversations: allConversations
            });
        } catch (error) {
            console.error("Error getting all conversations:", error);
            res.status(500).json({
                success: false,
                message: "Error getting all conversations"
            });
        }
    },

    /**
     * Get unread message counts for multiple orders
     * POST /messages/orders/unread-counts
     * Body: { orderIds: ["orderId1", "orderId2", ...] }
     * Returns: { unreadCounts: { "orderId1": 2, "orderId2": 0, ... } }
     */
    getUnreadCountsForOrders: async (req, res) => {
        try {
            const { orderIds } = req.body;
            const adminId = "66cdf5f6dec61c826428d298";
            const adminObjectId = new mongoose.Types.ObjectId(adminId);

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "orderIds array is required"
                });
            }

            // Convert string orderIds to ObjectIds (filter out invalid ones)
            const orderObjectIds = orderIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));

            // Aggregate unread counts grouped by orderId
            const unreadCounts = await Message.aggregate([
                {
                    $match: {
                        receiver: adminObjectId,
                        readStatus: false,
                        message: { $ne: "" },
                        orderId: { $in: orderObjectIds }
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Build response object with orderId as key
            const unreadCountsMap = {};

            // Initialize all orderIds with 0
            orderIds.forEach(id => {
                unreadCountsMap[id] = 0;
            });

            // Fill in actual counts
            unreadCounts.forEach(item => {
                if (item._id) {
                    unreadCountsMap[item._id.toString()] = item.count;
                }
            });

            res.status(200).json({
                success: true,
                unreadCounts: unreadCountsMap
            });
        } catch (error) {
            console.error("Error getting unread counts for orders:", error);
            res.status(500).json({
                success: false,
                message: "Error getting unread counts for orders"
            });
        }
    }
}

module.exports = messageController