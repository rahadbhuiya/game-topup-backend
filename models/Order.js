const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  game: String,
  playerId: String,
  package: String,
  paymentMethod: String,
  transactionId: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
