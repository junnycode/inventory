const GAS_URL = 'https://script.google.com/macros/s/AKfycbzhsDxby4zDcXM9VpmkF4ldZwiJ3k2PFKKqz3X_DiWr4gINb72osMZa3sSTzChNai7dOA/exec'; 

let inventory = {}; 

// 데이터 로드
async function loadAndRender() {
    try {
        const response = await fetch(GAS_URL);
        inventory = await response.json() || {};
        renderInventory();
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
}

// 화면 그리기 (소수점 표시 대응)
function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow(); 
        
        // 시각적 강조: 0 혹은 1 이하 (소수점 포함)
        if (item.quantity === 0) {
            row.style.backgroundColor = '#fff1f0';
        } else if (item.quantity <= 1) {
            row.style.backgroundColor = '#fffbe6';
        }

        row.insertCell(0).textContent = name;

        // 수량 + 단위 (소수점이 있을 경우 그대로 표시)
        const cellQty = row.insertCell(1);
        const unitLabel = item.unit || "낱개";
        
        // 숫자가 소수점일 경우 너무 길어지지 않게 처리할 수도 있지만, 
        // 여기서는 입력한 그대로 보여주기 위해 Number()를 사용합니다.
        const displayQty = Number(item.quantity); 

        if (displayQty <= 1) {
            cellQty.innerHTML = `<span style="color:#d32f2f; font-weight:bold;">${displayQty} ${unitLabel}</span>`;
        } else {
            cellQty.textContent = `${displayQty} ${unitLabel}`;
        }
        
        cellQty.style.cursor = "pointer";
        cellQty.onclick = () => enableEdit(cellQty, name, displayQty, unitLabel);

        row.insertCell(2).textContent = item.lastUpdated || "-"; 
        
        const cellAction = row.insertCell(3);
        cellAction.innerHTML = `<button class="delete-btn" onclick="deleteItem('${name}')">삭제</button>`;
    }
    updateDatalist();
}

// 기록하기 (parseFloat 적용)
async function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value; 
    // [수정] parseInt -> parseFloat (소수점 허용)
    const qtyInput = parseFloat(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) {
        alert("이름과 수량을 정확히 입력하세요.");
        return;
    }

    const currentQty = inventory[name] ? Number(inventory[name].quantity) : 0;
    let newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

    // 소수점 연산 시 발생하는 미세한 오차 방지 (소수점 2자리까지 고정 예시)
    newQty = Math.round(newQty * 100) / 100;

    if (newQty < 0) {
        alert("재고가 부족합니다.");
        return;
    }

    if (await sendDataToGAS("ADD_UPDATE", name, newQty, unit)) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

// 수량 수정 (소수점 대응)
function enableEdit(cell, name, current, unit) {
    if (cell.querySelector('input')) return;
    // step="any" 추가로 수정 시에도 소수점 입력 가능하게 함
    cell.innerHTML = `<input type="number" style="width:70px" value="${current}" step="any">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = async () => {
        const nextVal = parseFloat(input.value);
        if(!isNaN(nextVal) && nextVal >= 0) {
            if (await sendDataToGAS("ADD_UPDATE", name, nextVal, unit)) await loadAndRender();
        } else {
            await loadAndRender();
        }
    };
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

// 나머지 함수들 (sendDataToGAS, filterInventory, deleteItem 등은 이전과 동일)
async function sendDataToGAS(action, itemName, quantity, unit) {
    const date = new Date().toLocaleDateString('ko-KR');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action, itemName, quantity, unit, date }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
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

async function deleteItem(name) {
    if (confirm(`[${name}]을 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) await loadAndRender();
    }
}

function updateDatalist() {
    const dl = document.getElementById('existingItems');
    dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
}

document.addEventListener('DOMContentLoaded', loadAndRender);
