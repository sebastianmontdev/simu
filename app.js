const API_URL = "http://localhost:3000";

// --- SEGURIDAD Y SESIÓN ---
function checkRole(requiredRole) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
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
    // Manejo del Login (Sign In)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('email');
        if (!emailInput) return; // Seguridad por si el ID cambia

        const email = emailInput.value;

        try {
            // Buscamos al usuario solo por el email
            const resp = await fetch(`${API_URL}/users?email=${email}`);
            const users = await resp.json();

            if (users.length > 0) {
                const user = users[0];
                localStorage.setItem('user', JSON.stringify(user));
                
                // Redirección según rol
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'menu.html';
                }
            } else {
                alert("Este correo no está registrado. Dale a 'Sign Up' primero.");
            }
        } catch (error) {
            console.error("Error en login:", error);
            alert("¿Encendiste el JSON Server? No hay conexión.");
        }
    });

    // Manejo del Registro (Sign Up)
    const btnRegister = document.getElementById('btnRegister');
    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const role = document.getElementById('role').value;

            if (!fullName || !email) {
                return alert("Por favor rellena Nombre y Email para registrarte");
            }

            const newUser = {
                fullName,
                email,
                role,
                password: "123" // Password genérica interna
            };

            try {
                const checkResp = await fetch(`${API_URL}/users?email=${email}`);
                const existing = await checkResp.json();

                if (existing.length > 0) {
                    return alert("Este correo ya está registrado. Solo dale a 'Sign In'.");
                }

                await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser)
                });

                alert("¡Cuenta creada! Ahora dale al botón verde 'Sign In' para entrar.");
            } catch (error) {
                alert("Error al registrar. Revisa la consola.");
            }
        });
    }
}

// --- FUNCIONES DE CATERING / MENÚ (Siguen igual) ---
let cart = [];

async function loadProducts() {
    try {
        const resp = await fetch(`${API_URL}/products`);
        const products = await resp.json();
        const list = document.getElementById('productsList');
        if (list) {
            list.innerHTML = products.map(p => `
                <div class="col-md-4">
                    <div class="card card-product h-100 shadow-sm">
                        <img src="${p.image}" class="card-img-top product-img" alt="${p.name}">
                        <div class="card-body">
                            <h5 class="card-title">${p.name}</h5>
                            <p class="card-text text-primary fw-bold">$${p.price}</p>
                            <button class="btn btn-dark w-100" onclick="addToCart('${p.name}', ${p.price})">Agregar</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.log("Error cargando productos"); }
}

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!list) return;
    
    const total = cart.reduce((s, i) => s + i.price, 0);
    list.innerHTML = cart.map(i => `<li class="list-group-item d-flex justify-content-between"><span>${i.name}</span> <span>$${i.price}</span></li>`).join('');
    totalEl.innerText = total;
}

async function createOrder() {
    if (cart.length === 0) return alert("El carrito está vacío");
    const user = JSON.parse(localStorage.getItem('user'));
    
    const newOrder = {
        userId: user.email,
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

    alert("¡Pedido realizado!");
    cart = [];
    window.location.href = 'mis-pedidos.html';
}

// --- ADMIN DASHBOARD ---
async function loadAdminDashboard() {
    const resp = await fetch(`${API_URL}/orders`);
    const orders = await resp.json();
    const table = document.getElementById('adminOrdersTable');
    if (table) {
        table.innerHTML = orders.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.userId}</td>
                <td>$${o.total}</td>
                <td><span class="badge bg-warning">${o.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${o.id}', 'delivered')">✔</button>
                </td>
            </tr>
        `).join('');
    }
}