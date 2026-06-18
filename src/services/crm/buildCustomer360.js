const mongoose = require('mongoose');
const User = require('../../models/user');
const Order = require('../../models/order');
const RequestOrder = require('../../models/requestOrder');
const ReturnOrder = require('../../models/returnOrder');
const CustomerNote = require('../../models/customerNote');

const EXCLUDED_ORDER_STATUSES = new Set([
  'Cancelled',
  'Failed',
  'deleted',
]);

function normalizeCart(cart) {
  if (!cart) return [];
  if (Array.isArray(cart)) return cart;
  if (typeof cart === 'object') return Object.values(cart);
  return [];
}

function isCountableOrder(order) {
  if (!order || order.isdeleted === true) return false;
  if (EXCLUDED_ORDER_STATUSES.has(order.status)) return false;
  return true;
}

function userIdMatchQuery(userId) {
  const idStr = String(userId);
  const clauses = [{ 'contactDetails.userId': idStr }];
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    clauses.push({ 'contactDetails.userId': new mongoose.Types.ObjectId(idStr) });
  }
  return { $or: clauses };
}

function flattenDevicesFromOrders(orders) {
  const devices = [];
  for (const order of orders) {
    const cart = normalizeCart(order.cart);
    for (const item of cart) {
      if (!item || item.isTradeIn === true) continue;
      devices.push({
        orderId: order._id,
        orderNumber: order.orderNumber || '',
        orderDate: order.createdAt,
        orderStatus: order.status,
        productId: item.productId || item._id || null,
        productName: item.productName || item.name || '',
        variantName: item.name || '',
        sku: item.SKU || item.sku || '',
        qty: item.qty || 1,
        price: item.salePrice ?? item.Price ?? item.price ?? null,
      });
    }
  }
  return devices;
}

function flattenTradeInsFromOrders(orders) {
  const tradeIns = [];
  for (const order of orders) {
    const cart = normalizeCart(order.cart);
    for (const item of cart) {
      if (!item || item.isTradeIn !== true) continue;
      const data = item.tradeInData || {};
      tradeIns.push({
        orderId: order._id,
        orderNumber: order.orderNumber || '',
        orderDate: order.createdAt,
        orderStatus: order.status,
        productName: item.productName || data.deviceName || '',
        brandName: data.brandName || '',
        storageName: data.storageName || data.storage || '',
        conditionName: data.conditionName || data.condition || '',
        network: data.network || '',
        tradeInValue: data.tradeInValue ?? item.salePrice ?? null,
        tradeInData: data,
      });
    }
  }
  return tradeIns;
}

function buildOrderStats(orders) {
  const countable = orders.filter(isCountableOrder);
  if (countable.length === 0) {
    return {
      totalOrders: 0,
      totalSpend: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    };
  }

  const dates = countable.map((o) => new Date(o.createdAt).getTime()).filter(Boolean);
  const totalSpend = countable.reduce(
    (sum, o) => sum + (Number(o.totalOrderValue) || 0),
    0
  );

  return {
    totalOrders: countable.length,
    totalSpend: Math.round(totalSpend * 100) / 100,
    firstOrderAt: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
    lastOrderAt: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
  };
}

function slimOrders(orders) {
  return orders.map((order) => ({
    _id: order._id,
    orderNumber: order.orderNumber || '',
    status: order.status,
    totalOrderValue: order.totalOrderValue ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    cartItemsCount: normalizeCart(order.cart).length,
    returnRequestInitiated: Boolean(order.returnRequestInitiated),
    returnOrderId: order.returnOrderId || null,
  }));
}

function buildActivityTimeline({
  user,
  orders,
  requestOrders,
  returnOrders,
  notes,
}) {
  const events = [];

  if (user?.createdAt) {
    events.push({
      type: 'account_created',
      title: 'Account created',
      detail: user.email || '',
      at: user.createdAt,
      meta: {},
    });
  }

  for (const order of orders) {
    events.push({
      type: 'order_placed',
      title: 'Order placed',
      detail: `${order.orderNumber || 'Order'} — £${Number(order.totalOrderValue || 0).toFixed(2)} (${order.status})`,
      at: order.createdAt,
      meta: { orderId: order._id, orderNumber: order.orderNumber },
    });

    const cart = normalizeCart(order.cart);
    const hasTradeIn = cart.some((item) => item?.isTradeIn === true);
    if (hasTradeIn) {
      events.push({
        type: 'trade_in_submitted',
        title: 'Trade-in submitted',
        detail: order.orderNumber || '',
        at: order.createdAt,
        meta: { orderId: order._id, orderNumber: order.orderNumber },
      });
    }
  }

  for (const req of requestOrders) {
    events.push({
      type: 'return_requested',
      title: 'Return requested',
      detail: `${req.requestOrderNumber || ''} — ${req.status || 'Pending'}`,
      at: req.createdAt,
      meta: { requestOrderId: req._id, requestOrderNumber: req.requestOrderNumber },
    });
  }

  for (const ret of returnOrders) {
    events.push({
      type: 'return_completed',
      title: 'Return order recorded',
      detail: `${ret.rma || ret.orderNumber || ''} — ${ret.status || 'Pending'}`,
      at: ret.createdAt || ret.updatedAt,
      meta: { returnOrderId: ret._id, rma: ret.rma },
    });
  }

  for (const note of notes) {
    events.push({
      type: 'note_added',
      title: 'Note added',
      detail: note.body?.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
      at: note.createdAt,
      meta: { noteId: note._id, authorName: note.authorName },
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

async function loadCustomerOrders(userId) {
  return Order.find({
    ...userIdMatchQuery(userId),
    isdeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function assertCustomerUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user id');
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId)
    .populate('pricingGroup', 'name')
    .lean();

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (String(user.role || '').toLowerCase() === 'admin') {
    const err = new Error('User is not a storefront customer');
    err.status = 400;
    throw err;
  }

  return user;
}

async function buildCustomer360(userId) {
  const user = await assertCustomerUser(userId);
  const userObjectId = user._id;

  const [orders, requestOrders, returnOrders, notes] = await Promise.all([
    loadCustomerOrders(userId),
    RequestOrder.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean(),
    ReturnOrder.find({
      $or: [{ userId: userObjectId }, { email: user.email }],
    })
      .sort({ createdAt: -1 })
      .lean(),
    CustomerNote.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean(),
  ]);

  const stats = buildOrderStats(orders);
  const pricingGroup =
    user.pricingGroup && typeof user.pricingGroup === 'object'
      ? { _id: user.pricingGroup._id, name: user.pricingGroup.name }
      : user.pricingGroup || null;

  return {
    profile: {
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
      email: user.email,
      phone: user.phoneNumber || '',
      address: user.address || null,
      companyname: user.companyname || null,
      pricingGroup,
      createdAt: user.createdAt,
    },
    stats,
    orders: slimOrders(orders),
    devicesPurchased: flattenDevicesFromOrders(orders),
    tradeIns: flattenTradeInsFromOrders(orders),
    activity: buildActivityTimeline({
      user,
      orders,
      requestOrders,
      returnOrders,
      notes,
    }),
    notes: notes.map((n) => ({
      _id: n._id,
      body: n.body,
      authorId: n.authorId,
      authorName: n.authorName,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  };
}

async function listCustomers({ page = 1, limit = 20, search = '' }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const match = { role: { $ne: 'admin' } };
  if (search.trim()) {
    const q = search.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [
      { firstname: regex },
      { lastname: regex },
      { email: regex },
      { phoneNumber: regex },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(match),
    User.find(match).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
  ]);

  const userIds = users.map((u) => String(u._id));
  const orderStatsByUser = {};

  if (userIds.length > 0) {
    const idClauses = userIds.flatMap((id) => {
      const clauses = [{ 'contactDetails.userId': id }];
      if (mongoose.Types.ObjectId.isValid(id)) {
        clauses.push({ 'contactDetails.userId': new mongoose.Types.ObjectId(id) });
      }
      return clauses;
    });

    const orderAgg = await Order.aggregate([
      {
        $match: {
          isdeleted: { $ne: true },
          status: { $nin: Array.from(EXCLUDED_ORDER_STATUSES) },
          $or: idClauses,
        },
      },
      {
        $addFields: {
          customerUserId: { $toString: '$contactDetails.userId' },
        },
      },
      {
        $group: {
          _id: '$customerUserId',
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
          lastOrderAt: { $max: '$createdAt' },
          firstOrderAt: { $min: '$createdAt' },
        },
      },
    ]);

    for (const row of orderAgg) {
      orderStatsByUser[row._id] = {
        totalOrders: row.totalOrders,
        totalSpend: Math.round(row.totalSpend * 100) / 100,
        lastOrderAt: row.lastOrderAt,
        firstOrderAt: row.firstOrderAt,
      };
    }
  }

  const customers = users.map((user) => {
    const uid = String(user._id);
    const stats = orderStatsByUser[uid] || {
      totalOrders: 0,
      totalSpend: 0,
      lastOrderAt: null,
      firstOrderAt: null,
    };
    return {
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
      email: user.email,
      phone: user.phoneNumber || '',
      createdAt: user.createdAt,
      ...stats,
    };
  });

  return {
    customers,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

module.exports = {
  buildCustomer360,
  listCustomers,
  assertCustomerUser,
  EXCLUDED_ORDER_STATUSES,
};
