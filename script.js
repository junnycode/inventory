// 구글시트 데이터 저장, 데이터 이전 & 수정, 필요시 개발자에게 문의 하기,
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxfbwnnzFQmySLoJzu_TSr2T1F4bY8YrNzZLh7YDIqk8PPr19At-7N7akGy3e5IE2c62w/exec'; 

let inventory = {}; 

/**
 * [데이터 로드] 서버에서 최신 데이터를 가져옵니다.
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
 * [화면 렌더링] 검색 + 카테고리 필터 + 정렬 + 성능 최적화
 */
function renderInventory() {
    const list = document.getElementById('inventoryList');
    const fragment = document.createDocumentFragment();
    
    // 현재 필터링 조건
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    list.innerHTML = ''; 

    // 1. 카테고리순 -> 물품명순 정렬
    const sortedNames = Object.keys(inventory).sort((a, b) => {
        const catA = inventory[a].category;
        const catB = inventory[b].category;
        if (catA !== catB) return catA.localeCompare(catB);
        return a.localeCompare(b);
    });

    // 2. 필터링 및 행 생성
    sortedNames.forEach(name => {
        const item = inventory[name];
        const itemCategory = item.category || "미분류";
        const displayQty = Number(item.quantity);

        // 필터 조건 확인
        const matchesCategory = (categoryFilter === "전체" || itemCategory === categoryFilter);
        const matchesSearch = name.toLowerCase().includes(searchQuery);

        if (matchesCategory && matchesSearch) {
            const row = document.createElement('tr'); 
            
            // 재고 상태 강조 (0개 또는 1개 이하)
            if (displayQty === 0) row.style.backgroundColor = '#fff1f0';
            else if (displayQty <= 1) row.style.backgroundColor = '#fffbe6';

            const unitLabel = item.unit || "낱개";
            const qtyHtml = displayQty <= 1 
                ? `<span style="color:#d32f2f; font-weight:bold;">${displayQty} ${unitLabel}</span>`
                : `${displayQty} ${unitLabel}`;

            row.innerHTML = `
                <td style="color: #888; font-size: 0.85em;">${itemCategory}</td>
                <td style="font-weight: bold;">${name}</td>
                <td style="cursor:pointer" onclick="enableEdit(this, '${name}', ${displayQty}, '${unitLabel}', '${itemCategory}')">
                    ${qtyHtml}
                </td>
                <td>${item.lastUpdated || "-"}</td>
                <td><button class="delete-btn" onclick="deleteItem('${name}')">삭제</button></td>
            `;
            fragment.appendChild(row);
        }
    });
    
    list.appendChild(fragment);
    updateDatalists();
}

/**
 * [기록하기] 입고/출고 및 소수점 처리
 */
async function addItem() {
    const category = document.getElementById('itemCategory').value;
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qtyInput = parseFloat(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) {
        alert("이름과 수량을 정확히 입력하세요.");
        return;
    }

    const currentQty = inventory[name] ? Number(inventory[name].quantity) : 0;
    let newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;

    // 부동 소수점 오차 방지 (소수점 2자리 반올림)
    newQty = Math.round(newQty * 100) / 100;

    if (newQty < 0) {
        alert("재고가 부족합니다.");
        return;
    }

    if (await sendDataToGAS("ADD_UPDATE", name, newQty, unit, category)) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

/**
 * [수량 클릭 수정] 소수점 대응
 */
function enableEdit(cell, name, current, unit, category) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" style="width:70px; text-align:center;" value="${current}" step="any">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = async () => {
        const val = parseFloat(input.value);
        if(!isNaN(val) && val >= 0) {
            const rounded = Math.round(val * 100) / 100;
            if (await sendDataToGAS("ADD_UPDATE", name, rounded, unit, category)) await loadAndRender();
        } else {
            await loadAndRender();
        }
    };
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

/**
 * [데이터 전송]
 */
async function sendDataToGAS(action, itemName, quantity, unit, category) {
    const date = new Date().toLocaleDateString('ko-KR');
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action, itemName, quantity, unit, category, date }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        alert("전송 중 오류가 발생했습니다.");
        return false;
    }
}

/**
 * [삭제]
 */
async function deleteItem(name) {
    if (confirm(`[${name}] 물품을 완전히 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) await loadAndRender();
    }
}

/**
 * [자동완성 업데이트]
 */
function updateDatalists() {
    const dl = document.getElementById('existingItems');
    if (dl) {
        dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
    }
}

document.addEventListener('DOMContentLoaded', loadAndRender);


