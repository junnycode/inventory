// 구글시트 데이터 저장, 데이터 이전 & 수정, 필요시 개발자에게 문의 하기,
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzhsDxby4zDcXM9VpmkF4ldZwiJ3k2PFKKqz3X_DiWr4gINb72osMZa3sSTzChNai7dOA/exec'; 

let inventory = {}; 

/**
 * [데이터 로드] 서버에서 데이터를 가져옵니다.
 */
async function loadAndRender() {
    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        
        if (data.error) {
            alert("서버 오류: " + data.error);
            return;
        }
        
        inventory = data || {};
        renderInventory();
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
}

/**
 * [화면 렌더링] 성능 최적화를 위해 DocumentFragment를 사용합니다.
 */
function renderInventory() {
    const list = document.getElementById('inventoryList');
    const fragment = document.createDocumentFragment(); // 가상 바구니 생성
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = document.createElement('tr'); 
        
        // --- 1. 상태별 배경색 강조 (소수점 포함 1 이하 강조) ---
        const displayQty = Number(item.quantity);
        if (displayQty === 0) {
            row.style.backgroundColor = '#fff1f0'; // 품절: 빨강
        } else if (displayQty <= 1) {
            row.style.backgroundColor = '#fffbe6'; // 부족: 노랑
        }

        // --- 2. 내용 구성 (항상 단위 표시 + 소수점 대응) ---
        const unitLabel = item.unit || "낱개";
        
        // 수량 표시 부분 (1 이하일 경우 빨간색 강조)
        const qtyHtml = displayQty <= 1 
            ? `<span style="color:#d32f2f; font-weight:bold;">${displayQty} ${unitLabel}</span>`
            : `${displayQty} ${unitLabel}`;

        row.innerHTML = `
            <td>${name}</td>
            <td style="cursor:pointer; font-weight: 500;" onclick="enableEdit(this, '${name}', ${displayQty}, '${unitLabel}')">
                ${qtyHtml}
            </td>
            <td>${item.lastUpdated || "-"}</td>
            <td>
                <button class="delete-btn" onclick="deleteItem('${name}')">삭제</button>
            </td>
        `;
        
        fragment.appendChild(row); // 가상 바구니에 행 추가
    }
    
    list.appendChild(fragment); // 마지막에 한 번만 화면에 출력 (속도 향상 핵심)
    updateDatalist();
}

/**
 * [데이터 전송] 입고/출고/수정 데이터를 GAS로 보냅니다.
 */
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
        alert("통신 중 오류가 발생했습니다.");
        return false;
    }
}

/**
 * [입/출고 기록] 소수점 연산을 처리합니다.
 */
async function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qtyInput = parseFloat(document.getElementById('itemQuantity').value); // 소수점 허용
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) {
        alert("물품 이름과 수량을 정확히 입력하세요.");
        return;
    }

    const currentQty = inventory[name] ? Number(inventory[name].quantity) : 0;
    let newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

    // 부동 소수점 오차 방지 (소수점 2자리까지 반올림)
    newQty = Math.round(newQty * 100) / 100;

    if (newQty < 0) {
        alert("재고가 부족하여 출고할 수 없습니다.");
        return;
    }

    if (await sendDataToGAS("ADD_UPDATE", name, newQty, unit)) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

/**
 * [수량 직접 수정] 표의 수량을 클릭했을 때 실행됩니다.
 */
function enableEdit(cell, name, current, unit) {
    if (cell.querySelector('input')) return;
    
    // 소수점 입력을 위해 step="any" 추가
    cell.innerHTML = `<input type="number" style="width:70px; text-align:center;" value="${current}" step="any">`;
    const input = cell.querySelector('input');
    input.focus();
    
    input.onblur = async () => {
        const nextVal = parseFloat(input.value);
        if(!isNaN(nextVal) && nextVal >= 0) {
            const roundedVal = Math.round(nextVal * 100) / 100;
            if (await sendDataToGAS("ADD_UPDATE", name, roundedVal, unit)) {
                await loadAndRender();
            }
        } else {
            await loadAndRender(); // 잘못된 입력 시 원래대로 복구
        }
    };
    
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

/**
 * [검색 필터링]
 */
function filterInventory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryList tr');
    rows.forEach(row => {
        const itemName = row.cells[0].textContent.toLowerCase();
        row.style.display = itemName.includes(query) ? "" : "none";
    });
}

/**
 * [물품 삭제]
 */
async function deleteItem(name) {
    if (confirm(`[${name}] 물품을 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) {
            await loadAndRender();
        }
    }
}

/**
 * [자동완성 리스트 업데이트]
 */
function updateDatalist() {
    const dl = document.getElementById('existingItems');
    if (dl) {
        dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
    }
}

// 초기 로드
document.addEventListener('DOMContentLoaded', loadAndRender);

