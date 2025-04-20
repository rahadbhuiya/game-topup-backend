
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Order = mongoose.model('Order', new mongoose.Schema({
  game: String,
  playerId: String,
  package: String,
  paymentMethod: String,
  transactionId: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
}));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
const io = socketIo(server);

app.put('/api/order/:id', async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status });
  io.emit('orderStatusUpdated', { orderId: req.params.id, status });
  res.json({ success: true, message: 'Order status updated!' });
});

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

let orders = [];

const socket = io('http://localhost:5000');

window.onload = async () => {
  const res = await fetch('http://localhost:5000/api/orders');
  orders = await res.json();
  renderOrders(orders);

  socket.on('orderStatusUpdated', (data) => {
    const updatedOrder = orders.find(order => order._id === data.orderId);
    if (updatedOrder) {
      updatedOrder.status = data.status;
      renderOrders(orders);
    }
  });

  document.getElementById('searchInput').addEventListener('input', () => applyFilters());
  document.getElementById('filterStatus').addEventListener('change', () => applyFilters());
}

function renderOrders(data) {
  const table = document.getElementById('orderTable');
  table.innerHTML = data.map(o => `
    <tr>
      <td class="p-2">${o.game}</td>
      <td class="p-2">${o.playerId}</td>
      <td class="p-2">${o.package}</td>
      <td class="p-2">${o.paymentMethod}</td>
      <td class="p-2">${o.transactionId}</td>
      <td class="p-2">${o.status}</td>
      <td class="p-2">
        <select onchange="updateStatus('${o._id}', this.value)" class="border rounded p-1">
          <option selected disabled>Update</option>
          <option value="Approved">Approved</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;

  const filtered = orders.filter(o =>
    (o.playerId.toLowerCase().includes(search) || o.transactionId.toLowerCase().includes(search)) &&
    (status === '' || o.status === status)
  );
  renderOrders(filtered);
}

async function updateStatus(id, status) {
  await fetch(`http://localhost:5000/api/order/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}
