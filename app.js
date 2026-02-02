const API_URL = "http://localhost:3000";

// --- SEGURIDAD Y SESIÓN ---
function checkRole(requiredRole) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) window.location.href = 'index.html';
    if (requiredRole && user.role !== requiredRole) {
        alert("Acceso denegado");
        window.location.href = user.role === 'admin' ? 'admin.html' : 'menu.html';
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// --- LOGIN Y REGISTRO ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const resp = await fetch(`${API_URL}/users?email=${email}&password=${password}`);
        const users = await resp.json();

        if (users.length > 0) {
            localStorage.setItem('user', JSON.stringify(users[0]));
            window.location.href = users[0].role === 'admin' ? 'admin.html' : 'menu.html';
        } else {
            alert("Credenciales incorrectas");
        }
    });

    document.getElementById('btnRegister').addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if(!email || !password) return alert("Completa los datos");

        const newUser = { email, password, role: 'user' }; // Rol automático [cite: 50]
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newUser)
        });
        alert("Registro exitoso. Ya puedes iniciar sesión.");
    });
}

// --- LÓGICA ADMIN ---
async function loadAdminDashboard() {
    const resp = await fetch(`${API_URL}/orders`);
    const orders = await resp.json();
    
    // Métricas [cite: 72, 73, 74]
    document.getElementById('totalOrders').innerText = orders.length;
    document.getElementById('pendingOrders').innerText = orders.filter(o => o.status === 'pending').length;
    const total = orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('todaySales').innerText = `$${total}`;

    const table = document.getElementById('adminOrdersTable');
    table.innerHTML = orders.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>User ID: ${o.userId}</td>
            <td>$${o.total}</td>
            <td><span class="badge bg-info">${o.status}</span></td>
            <td>
                <select onchange="updateOrderStatus('${o.id}', this.value)" class="form-select form-select-sm">
                    <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
                    <option value="preparing" ${o.status==='preparing'?'selected':''}>Preparing</option>
                    <option value="delivered" ${o.status==='delivered'?'selected':''}>Delivered</option>
                    <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Cancelled</option>
                </select>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(id, newStatus) {
    await fetch(`${API_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: newStatus })
    });
    loadAdminDashboard();
}
let cart = [];

// Cargar productos en el menú [cite: 56]
async function loadProducts() {
    const resp = await fetch(`${API_URL}/products`);
    const products = await resp.json();
    const container = document.getElementById('productsList');
    
    container.innerHTML = products.map(p => `
        <div class="col-md-4">
            <div class="card card-product h-100">
                <img src="${p.image}" class="product-img" alt="${p.name}">
                <div class="card-body">
                    <h5>${p.name}</h5>
                    <p class="text-primary fw-bold">$${p.price}</p>
                    <button class="btn btn-outline-primary w-100" onclick="addToCart('${p.name}', ${p.price})">Agregar</button>
                </div>
            </div>
        </div>
    `).join('');
}

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const total = cart.reduce((s, i) => s + i.price, 0);
    
    list.innerHTML = cart.map(i => `<li class="list-group-item">${i.name} - $${i.price}</li>`).join('');
    totalEl.innerText = total;
}

// Crear orden en el servidor [cite: 58, 59]
async function createOrder() {
    if (cart.length === 0) return alert("El carrito está vacío");
    const user = JSON.parse(localStorage.getItem('user'));
    
    const newOrder = {
        userId: user.id,
        items: cart,
        total: cart.reduce((s, i) => s + i.price, 0),
        status: 'pending',
        date: new Date().toISOString().split('T')[0]
    };

    await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newOrder)
    });

    alert("¡Pedido realizado con éxito!");
    cart = [];
    window.location.href = 'mis-pedidos.html';
}

// Cargar pedidos solo del usuario actual [cite: 62]
async function loadUserOrders() {
    const user = JSON.parse(localStorage.getItem('user'));
    const resp = await fetch(`${API_URL}/orders?userId=${user.id}`);
    const orders = await resp.json();
    
    document.getElementById('userOrdersTable').innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.date}</td>
            <td>$${o.total}</td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
        </tr>
    `).join('');
}