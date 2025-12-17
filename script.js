const GAS_URL = '여기에_새_배포_URL_붙여넣기'; 

let inventory = {}; 

async function loadAndRender() {
    try {
        const response = await fetch(GAS_URL);
        inventory = await response.json();
        renderInventory();
    } catch (e) { console.error("로드 실패"); }
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow(); 
        
        // 시각적 강조: 0개(빨강), 1개 이하(노랑)
        if (item.quantity === 0) row.style.backgroundColor = '#fff1f0';
        else if (item.quantity <= 1) row.style.backgroundColor = '#fffbe6';

        row.insertCell(0).textContent = name;

        // [핵심] 수량이 1개 이하일 때만 단위 표시
        const cellQty = row.insertCell(1);
        if (item.quantity <= 1) {
            cellQty.innerHTML = `<span style="color:#d32f2f; font-weight:bold;">${item.quantity} (${item.unit})</span>`;
        } else {
            cellQty.textContent = item.quantity;
        }
        cellQty.style.cursor = "pointer";
        cellQty.onclick = () => enableEdit(cellQty, name, item.quantity, item.unit);

        row.insertCell(2).textContent = item.lastUpdated; 
        
        const cellAction = row.insertCell(3);
        cellAction.innerHTML = `<button class="delete-btn" onclick="deleteItem('${name}')">삭제</button>`;
    }
    updateDatalist();
}

async function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qtyInput = parseInt(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) return alert("입력값을 확인하세요.");

    const currentQty = inventory[name] ? inventory[name].quantity : 0;
    const newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

    if (newQty < 0) return alert("재고가 부족합니다.");

    const success = await sendDataToGAS("ADD_UPDATE", name, newQty, unit);
    if (success) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        loadAndRender();
    }
}

async function sendDataToGAS(action, itemName, quantity, unit) {
    const date = new Date().toLocaleDateString('ko-KR');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action, itemName, quantity, unit, date })
        });
        const result = await response.json();
        return result.success;
    } catch (e) { return false; }
}

function filterInventory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryList tr');
    rows.forEach(row => {
        row.style.display = row.cells[0].textContent.toLowerCase().includes(query) ? "" : "none";
    });
}

function enableEdit(cell, name, current, unit) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" style="width:50px" value="${current}">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = async () => {
        if (await sendDataToGAS("ADD_UPDATE", name, input.value, unit)) loadAndRender();
    };
}

async function deleteItem(name) {
    if (confirm(`[${name}]을 삭제할까요?`)) {
        if (await sendDataToGAS("DELETE", name)) loadAndRender();
    }
}

function updateDatalist() {
    const dl = document.getElementById('existingItems');
    dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
}

document.addEventListener('DOMContentLoaded', loadAndRender);
