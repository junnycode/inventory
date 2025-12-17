// **구글 시트 불러오기 .** 구글 계정 rudtkdqnrehrnaltldnjsvudehd
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzIqr8_nmcYdhRmsm_TDidVjGafKCmHDr35LMUifU9DJgvMBqtKXBithsl4xSV2JGcMFw/exec'; 

let inventory = {}; 

// --- [데이터 통신] ---

// 데이터 불러오기 (GET)
async function fetchInventory() {
    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        return data || {};
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        return {};
    }
}

// 데이터 저장/삭제 (POST)
async function sendDataToGAS(action, itemName, quantity = 0) {
    const date = new Date().toLocaleDateString('ko-KR');
    const payload = { action, itemName, quantity, date };

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        console.error("데이터 전송 실패:", e);
        alert("서버 통신 오류가 발생했습니다.");
        return false;
    }
}

// --- [UI 렌더링] ---

function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow(); 
        
        // [시각화] 수량에 따른 행 색상 변경
        if (item.quantity === 0) {
            row.style.backgroundColor = '#ffebee'; // 품절: 빨강
        } else if (item.quantity <= 1) {
            row.style.backgroundColor = '#fff9c4'; // 부족: 노랑
        }

        row.insertCell(0).textContent = name;

        const cellQuantity = row.insertCell(1);
        let qText = item.quantity;
        if (item.quantity === 0) qText += " (품절)";
        else if (item.quantity <= 5) qText += " (부족)";
        
        cellQuantity.textContent = qText;
        cellQuantity.style.cursor = "pointer";
        cellQuantity.style.fontWeight = "bold";
        cellQuantity.onclick = () => enableEdit(cellQuantity, name, item.quantity);

        row.insertCell(2).textContent = item.lastUpdated; 
        
        const cellAction = row.insertCell(3);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteItem(name);
        cellAction.appendChild(deleteBtn);
    }
    updateDatalist();
}

// --- [주요 기능] ---

// 실시간 검색 기능
function filterInventory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryList tr');

    rows.forEach(row => {
        const itemName = row.cells[0].textContent.toLowerCase();
        row.style.display = itemName.includes(query) ? "" : "none";
    });
}

// 입/출고 등록
async function addItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const inputQty = parseInt(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!itemName || isNaN(inputQty) || inputQty <= 0) {
        alert("올바른 이름과 수량을 입력하세요.");
        return;
    }

    const currentQty = inventory[itemName] ? inventory[itemName].quantity : 0;
    let newQty = (type === '입고') ? currentQty + inputQty : currentQty - inputQty;

    if (newQty < 0) {
        alert("재고가 부족하여 출고할 수 없습니다.");
        return;
    }

    if (await sendDataToGAS("ADD_UPDATE", itemName, newQty)) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

// 수량 직접 수정
async function updateQuantity(itemName, newQty) {
    newQty = parseInt(newQty);
    if (isNaN(newQty) || newQty < 0) {
        alert("0 이상의 숫자를 입력하세요.");
        await loadAndRender();
        return;
    }
    if (await sendDataToGAS("ADD_UPDATE", itemName, newQty)) {
        await loadAndRender();
    }
}

// 클릭 시 수정 모드
function enableEdit(cell, itemName, currentVal) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" class="editable-input" value="${currentVal}">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = () => updateQuantity(itemName, input.value);
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

async function deleteItem(name) {
    if (confirm(`[${name}]을 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) await loadAndRender();
    }
}

function updateDatalist() {
    const dl = document.getElementById('existingItems');
    dl.innerHTML = Object.keys(inventory).map(name => `<option value="${name}">`).join('');
}

async function loadAndRender() {
    inventory = await fetchInventory();
    renderInventory();
}

document.addEventListener('DOMContentLoaded', loadAndRender);
// 오류 생성시 문의 :seojun

