const GAS_URL = 'https://script.google.com/macros/s/AKfycbyEdKRb72dDIzI7Czps1DdyoNxm1DlH8C_ZQ7yhVgKgCDcuZ4Ot0EoUAUVOb3mz_9_6Rw/exec'; 

let inventory = {};

// [데이터 로드] 서버에서 데이터를 가져와 화면에 그립니다.
async function loadAndRender() {
    try {
        const response = await fetch(GAS_URL);
        // 서버 응답이 제대로 오지 않았을 경우를 대비해 빈 객체({}) 처리
        inventory = await response.json() || {};
        renderInventory();
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
}

// [화면 렌더링] 테이블을 생성하는 핵심 함수
function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; // 기존 목록 초기화

    // 데이터를 이름(name) 기준으로 한 줄씩 생성
    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow();
       
        // --- 1. 상태별 배경색 강조 ---
        // 수량이 0이면 연한 빨강, 1개 이하면 연한 노랑
        if (item.quantity === 0) {
            row.style.backgroundColor = '#fff1f0';
        } else if (item.quantity <= 1) {
            row.style.backgroundColor = '#fffbe6';
        }

        // --- 2. 열(Column) 생성 (정확히 4칸) ---
       
        // 첫 번째 칸: 물품명
        row.insertCell(0).textContent = name;

        // 두 번째 칸: 수량 (1개 이하일 때만 단위 표시)
        const cellQty = row.insertCell(1);
        if (item.quantity !== undefined && item.quantity <= 1) {
            // 수량이 1개 이하일 때 (단위 포함 표시)
            cellQty.innerHTML = `<span style="color:#d32f2f; font-weight:bold;">${item.quantity} (${item.unit || 'EA'})</span>`;
        } else {
            // 수량이 1개 초과일 때 (숫자만 표시)
            cellQty.textContent = item.quantity;
        }
        cellQty.style.cursor = "pointer";
        // 클릭 시 수량 수정 모드 진입
        cellQty.onclick = () => enableEdit(cellQty, name, item.quantity, item.unit);

        // 세 번째 칸: 마지막 기록일
        row.insertCell(2).textContent = item.lastUpdated || "-";
       
        // 네 번째 칸: 삭제 버튼
        const cellAction = row.insertCell(3);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteItem(name);
        cellAction.appendChild(deleteBtn);
    }
    updateDatalist(); // 자동완성 목록 업데이트
}

// [데이터 전송] 입고/출고/삭제 시 서버로 데이터 보냄
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
        console.error("전송 오류:", e);
        return false;
    }
}

// [물품 등록] '기록하기' 버튼 클릭 시 실행
async function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qtyInput = parseInt(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) {
        alert("물품 이름과 수량을 정확히 입력하세요.");
        return;
    }

    const currentQty = inventory[name] ? inventory[name].quantity : 0;
    const newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

    if (newQty < 0) {
        alert("재고가 부족하여 출고할 수 없습니다.");
        return;
    }

    const success = await sendDataToGAS("ADD_UPDATE", name, newQty, unit);
    if (success) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

// [검색 필터]
function filterInventory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryList tr');
    rows.forEach(row => {
        const nameText = row.cells[0].textContent.toLowerCase();
        row.style.display = nameText.includes(query) ? "" : "none";
    });
}

// [수정 모드] 수량 클릭 시 입력창으로 변환
function enableEdit(cell, name, current, unit) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" style="width:50px; text-align:center;" value="${current}">`;
    const input = cell.querySelector('input');
    input.focus();
   
    input.onblur = async () => {
        const newQty = parseInt(input.value);
        if (!isNaN(newQty) && newQty >= 0) {
            if (await sendDataToGAS("ADD_UPDATE", name, newQty, unit)) {
                await loadAndRender();
            }
        } else {
            await loadAndRender(); // 무효한 값이면 원래대로 복구
        }
    };
   
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

// [삭제 기능]
async function deleteItem(name) {
    if (confirm(`[${name}] 물품을 완전히 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) {
            await loadAndRender();
        }
    }
}

// [자동완성] 기존 물품 이름 리스트 업데이트
function updateDatalist() {
    const dl = document.getElementById('existingItems');
    dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', loadAndRender);





