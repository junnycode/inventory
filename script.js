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

// 화면 그리기 (수량에 관계없이 단위 무조건 표기)
function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow(); 
        
        // [시각화] 재고 부족 알림 (배경색만 변경)
        if (item.quantity === 0) {
            row.style.backgroundColor = '#fff1f0'; // 품절
        } else if (item.quantity <= 1) {
            row.style.backgroundColor = '#fffbe6'; // 부족
        }

        // 1. 물품 이름
        row.insertCell(0).textContent = name;

        // 2. 수량 + 단위 (항상 함께 표시)
        const cellQty = row.insertCell(1);
        const unitLabel = item.unit || "낱개"; // 단위 데이터가 없으면 '낱개'로 기본값 설정
        
        // [핵심 수정] 수량 숫자와 단위를 무조건 합쳐서 표시합니다.
        // 1개 이하일 때는 빨간색 굵은 글씨로 강조, 그 외에는 일반 표시
        if (item.quantity <= 1) {
            cellQty.innerHTML = `<span style="color:#d32f2f; font-weight:bold;">${item.quantity} ${unitLabel}</span>`;
        } else {
            cellQty.textContent = `${item.quantity} ${unitLabel}`;
        }
        
        cellQty.style.cursor = "pointer";
        cellQty.onclick = () => enableEdit(cellQty, name, item.quantity, unitLabel);

        // 3. 마지막 기록일
        row.insertCell(2).textContent = item.lastUpdated || "-"; 
        
        // 4. 삭제 버튼
        const cellAction = row.insertCell(3);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteItem(name);
        cellAction.appendChild(deleteBtn);
    }
    updateDatalist();
}

// 데이터 전송 (action, name, quantity, unit, date 순서 유지)
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
    } catch (e) {
        alert("통신 오류가 발생했습니다.");
        return false;
    }
}

// 기록하기 (입고/출고 처리)
async function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value; 
    const qtyInput = parseInt(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) {
        alert("이름과 수량을 입력하세요.");
        return;
    }

    const currentQty = inventory[name] ? inventory[name].quantity : 0;
    const newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

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

// 실시간 검색
function filterInventory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryList tr');
    rows.forEach(row => {
        row.style.display = row.cells[0].textContent.toLowerCase().includes(query) ? "" : "none";
    });
}

// 수량 수정
function enableEdit(cell, name, current, unit) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" style="width:60px" value="${current}">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = async () => {
        const nextVal = parseInt(input.value);
        if(!isNaN(nextVal) && nextVal >= 0) {
            if (await sendDataToGAS("ADD_UPDATE", name, nextVal, unit)) await loadAndRender();
        } else {
            await loadAndRender();
        }
    };
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

// 삭제
async function deleteItem(name) {
    if (confirm(`[${name}]을 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) await loadAndRender();
    }
}

// 자동완성 목록 업데이트
function updateDatalist() {
    const dl = document.getElementById('existingItems');
    dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
}

document.addEventListener('DOMContentLoaded', loadAndRender);





