<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Business Suite</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      min-height: 100vh;
    }
    .nav {
      background: #1a1a2e;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(79,70,229,0.3);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      color: white;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-btns { display: flex; gap: 8px; }
    .nav-btn {
      padding: 8px 20px;
      border-radius: 20px;
      border: 1px solid rgba(79,70,229,0.4);
      background: transparent;
      color: #a5b4fc;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav-btn.active {
      background: #4f46e5;
      color: white;
      border-color: #4f46e5;
    }
    .page { display: none; padding: 24px; }
    .page.active { display: block; }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat {
      background: #1e1e3f;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(79,70,229,0.2);
    }
    .stat-label { color: #64748b; font-size: 12px; margin-bottom: 8px; }
    .stat-value { color: white; font-size: 24px; font-weight: 700; }
    .stat-change { color: #22c55e; font-size: 11px; margin-top: 6px; }
    .stat-change.down { color: #ef4444; }

    /* Grid */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: #1e1e3f;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(79,70,229,0.2);
    }
    .card-title {
      color: #a5b4fc;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    /* Inventory */
    .inv-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(79,70,229,0.1);
    }
    .inv-item:last-child { border: none; }
    .inv-name { color: #e2e8f0; font-size: 13px; }
    .inv-badge {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 10px;
    }
    .low { background: rgba(239,68,68,0.2); color: #ef4444; }
    .ok { background: rgba(34,197,94,0.2); color: #22c55e; }
    .mid { background: rgba(234,179,8,0.2); color: #eab308; }

    /* Sales Input */
    .sales-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { color: #64748b; font-size: 12px; }
    .form-group input, .form-group select {
      background: #0f0c29;
      border: 1px solid rgba(79,70,229,0.4);
      border-radius: 8px;
      padding: 8px 12px;
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
    }
    .form-group input:focus { border-color: #4f46e5; }
    .add-btn {
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      width: 100%;
    }
    .add-btn:hover { background: #6366f1; }

    /* AI Prediction */
    .prediction {
      background: rgba(79,70,229,0.1);
      border: 1px solid rgba(79,70,229,0.3);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
    }
    .prediction-title { color: #a5b4fc; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .prediction-text { color: #e2e8f0; font-size: 13px; line-height: 1.6; }

    /* Chat */
    .chat-container {
      max-width: 600px;
      margin: 0 auto;
      background: #1a1a2e;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(79,70,229,0.3);
    }
    .chat-header {
      background: #4f46e5;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .header-text h3 { color: white; font-size: 16px; }
    .header-text p { color: #c7d2fe; font-size: 12px; }
    .online-dot {
      width: 8px; height: 8px;
      background: #22c55e;
      border-radius: 50%;
      display: inline-block;
      margin-right: 5px;
    }
    .chat-messages {
      height: 400px;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #0f0c29;
    }
    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
    .message {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
    }
    .bot-message {
      background: #1e1e3f;
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      border: 1px solid rgba(79,70,229,0.2);
    }
    .user-message {
      background: #4f46e5;
      color: white;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .typing {
      display: flex;
      gap: 5px;
      padding: 12px 16px;
      background: #1e1e3f;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .typing span {
      width: 8px; height: 8px;
      background: #4f46e5;
      border-radius: 50%;
      animation: bounce 1s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
    .chat-input {
      padding: 16px;
      display: flex;
      gap: 10px;
      background: #1a1a2e;
      border-top: 1px solid rgba(79,70,229,0.3);
    }
    .chat-input input {
      flex: 1;
      border: 1px solid rgba(79,70,229,0.4);
      border-radius: 25px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      background: #0f0c29;
      color: #e2e8f0;
    }
    .chat-input input::placeholder { color: #64748b; }
    .chat-input input:focus { border-color: #4f46e5; }
    .send-btn {
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      cursor: pointer;
      font-size: 18px;
    }
    .send-btn:hover { background: #6366f1; }
  </style>
</head>
<body>

  <div class="nav">
    <div class="logo">🤖 AI Business Suite</div>
    <div class="nav-btns">
      <button class="nav-btn active" onclick="showPage('dashboard', this)">📊 Dashboard</button>
      <button class="nav-btn" onclick="showPage('chat', this)">💬 Chat Bot</button>
    </div>
  </div>

  <!-- Dashboard Page -->
  <div class="page active" id="dashboard">

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Today's Sales</div>
        <div class="stat-value" id="todaySales">₹0</div>
        <div class="stat-change" id="salesChange">No data yet</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Orders</div>
        <div class="stat-value" id="totalOrders">0</div>
        <div class="stat-change">This week</div>
      </div>
      <div class="stat">
        <div class="stat-label">Best Seller</div>
        <div class="stat-value" id="bestSeller" style="font-size:16px">-</div>
        <div class="stat-change">Top product</div>
      </div>
      <div class="stat">
        <div class="stat-label">Monthly Revenue</div>
        <div class="stat-value" id="monthlyRev">₹0</div>
        <div class="stat-change">This month</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Add New Sale</div>
        <div class="sales-form">
          <div class="form-group">
            <label>Product Name</label>
            <input type="text" id="productName" placeholder="e.g. Shirt" />
          </div>
          <div class="form-group">
            <label>Amount (₹)</label>
            <input type="number" id="saleAmount" placeholder="e.g. 599" />
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" id="saleQty" placeholder="e.g. 2" value="1" />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="saleCategory">
              <option>Shirts</option>
              <option>Jeans</option>
              <option>Shoes</option>
              <option>Accessories</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <button class="add-btn" onclick="addSale()">+ Add Sale</button>
        <div class="prediction" id="prediction" style="display:none">
          <div class="prediction-title">🤖 AI Prediction</div>
          <div class="prediction-text" id="predictionText"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Inventory Status</div>
        <div class="inv-item"><span class="inv-name">Shirts</span><span class="inv-badge ok" id="inv-shirts">245 in stock</span></div>
        <div class="inv-item"><span class="inv-name">Jeans</span><span class="inv-badge mid" id="inv-jeans">32 in stock</span></div>
        <div class="inv-item"><span class="inv-name">Shoes</span><span class="inv-badge low" id="inv-shoes">⚠️ 8 left!</span></div>
        <div class="inv-item"><span class="inv-name">Accessories</span><span class="inv-badge low" id="inv-acc">⚠️ 5 left!</span></div>
        <div class="inv-item"><span class="inv-name">Jackets</span><span class="inv-badge ok" id="inv-jack">120 in stock</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Weekly Sales Chart</div>
      <canvas id="salesChart" height="80"></canvas>
    </div>

  </div>

  <!-- Chat Page -->
  <div class="page" id="chat">
    <div class="chat-container">
      <div class="chat-header">
        <div class="avatar">🤖</div>
        <div class="header-text">
          <h3>AI Support Bot</h3>
          <p><span class="online-dot"></span>Online • Always here to help</p>
        </div>
      </div>
      <div class="chat-messages" id="messages">
        <div class="message bot-message">
          👋 Hello! Welcome! How can I help you today?
        </div>
      </div>
      <div class="chat-input">
        <input type="text" id="userInput" placeholder="Type your message..." />
        <button class="send-btn" onclick="sendMessage()">➤</button>
      </div>
    </div>
  </div>

  <script>
    // Navigation
    function showPage(id, btn) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      btn.classList.add('active');
    }

    // Sales Data
    let sales = [];
    let weeklyData = [0, 0, 0, 0, 0, 0, 0];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    // Chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Sales (₹)',
          data: weeklyData,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(79,70,229,0.1)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(79,70,229,0.1)' } }
        }
      }
    });

    function addSale() {
      const name = document.getElementById('productName').value;
      const amount = parseFloat(document.getElementById('saleAmount').value);
      const qty = parseInt(document.getElementById('saleQty').value) || 1;
      const category = document.getElementById('saleCategory').value;

      if (!name || !amount) {
        alert('Please fill product name and amount!');
        return;
      }

      const total = amount * qty;
      sales.push({ name, amount: total, category, time: new Date() });

      weeklyData[todayIndex] += total;
      chart.data.datasets[0].data = [...weeklyData];
      chart.update();

      updateStats();
      showPrediction(category, total);

      document.getElementById('productName').value = '';
      document.getElementById('saleAmount').value = '';
      document.getElementById('saleQty').value = '1';
    }

    function updateStats() {
      const todayTotal = sales.reduce((s, i) => s + i.amount, 0);
      document.getElementById('todaySales').textContent = '₹' + Math.round(todayTotal).toLocaleString();
      document.getElementById('totalOrders').textContent = sales.length;
      document.getElementById('monthlyRev').textContent = '₹' + Math.round(todayTotal * 30).toLocaleString();
      document.getElementById('salesChange').textContent = '+' + sales.length + ' sales today';

      const counts = {};
      sales.forEach(s => counts[s.category] = (counts[s.category] || 0) + s.amount);
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (best) document.getElementById('bestSeller').textContent = best[0];
    }

    function showPrediction(category, amount) {
      const predictions = {
        'Shirts': 'Shirts are selling well! Stock up before weekend — expect 40% more sales on Saturday.',
        'Jeans': 'Jeans demand is rising! Consider restocking soon. Weekend sales usually peak 60% higher.',
        'Shoes': 'Low shoe stock detected! Reorder immediately — shoes sell out fast on weekends.',
        'Accessories': 'Accessories move fast! Bundle them with clothing for 25% higher revenue.',
        'Other': 'Sales are going well! Keep tracking daily to spot your best selling days.'
      };
      document.getElementById('predictionText').textContent = predictions[category] || predictions['Other'];
      document.getElementById('prediction').style.display = 'block';
    }

    // Chat Bot
    const messages = document.getElementById('messages');
    const input = document.getElementById('userInput');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'typing';
      div.id = 'typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMessage(text, 'user-message');
      showTyping();
      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        document.getElementById('typing')?.remove();
        addMessage(data.reply, 'bot-message');
      } catch (e) {
        document.getElementById('typing')?.remove();
        addMessage('Sorry, something went wrong!', 'bot-message');
      }
    }
  </script>
</body>
</html>