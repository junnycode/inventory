// 구글시트 데이터 저장, 데이터 이전 & 수정, 필요시 개발자에게 문의 하기,
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxfbwnnzFQmySLoJzu_TSr2T1F4bY8YrNzZLh7YDIqk8PPr19At-7N7akGy3e5IE2c62w/exec'; 

let inventory = {}; 
let currentCategory = '전체'; // 현재 선택된 카테고리 상태

// [추가] 내가 사용할 카테고리 목록 (여기에 추가하면 버튼이 자동으로 생깁니다)
const categories = ["전체", "채소", "과일", "고기", "소스", "식료품", "비품", "주류"];

async function loadAndRender() {
    try {
        const response = await fetch(GAS_URL);
        inventory = await response.json() || {};
        renderCategoryButtons(); // 버튼 먼저 생성
        renderInventory();       // 리스트 출력
    } catch (e) { console.error(e); }
}

/**
 * [버튼 생성] 카테고리 버튼들을 화면에 그립니다.
 */
function renderCategoryButtons() {
    const container = document.getElementById('categoryButtons');
    container.innerHTML = ''; // 초기화

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.className = 'category-btn';
        if (cat === currentCategory) btn.classList.add('active');

        btn.onclick = () => {
            currentCategory = cat; // 상태 변경
            renderCategoryButtons(); // 버튼 활성화 상태 업데이트
            renderInventory();       // 목록 다시 그리기
        };
        container.appendChild(btn);
    });
}

/**
 * [화면 렌더링] 선택된 카테고리 버튼에 따라 필터링
 */
function renderInventory() {
    const list = document.getElementById('inventoryList');
    const fragment = document.createDocumentFragment();
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    list.innerHTML = ''; 

    const sortedNames = Object.keys(inventory).sort((a, b) => {
        const catA = inventory[a].category;
        const catB = inventory[b].category;
        if (catA !== catB) return catA.localeCompare(catB);
        return a.localeCompare(b);
    });

    sortedNames.forEach(name => {
        const item = inventory[name];
        const displayQty = Number(item.quantity);
        const itemCategory = item.category;

        // [핵심 필터 로직] 버튼 카테고리와 검색어 동시 체크
        const matchesCategory = (currentCategory === "전체" || itemCategory === currentCategory);
        const matchesSearch = name.toLowerCase().includes(searchQuery);

        if (matchesCategory && matchesSearch) {
            const row = document.createElement('tr'); 
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
 * [데이터 기록] 입고/출고 처리 (소수점 포함)
 */
async function addItem() {
    const category = document.getElementById('itemCategory').value;
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qtyInput = parseFloat(document.getElementById('itemQuantity').value);
    const type = document.getElementById('transactionType').value;

    if (!name || isNaN(qtyInput)) return alert("정보를 입력하세요.");

    const currentQty = inventory[name] ? Number(inventory[name].quantity) : 0;
    let newQty = (type === '입고') ? currentQty + qtyInput : currentQty - qtyInput;
    newQty = Math.round(newQty * 100) / 100;

    if (newQty < 0) return alert("재고가 부족합니다.");

    if (await sendDataToGAS("ADD_UPDATE", name, newQty, unit, category)) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        await loadAndRender();
    }
}

// (나머지 sendDataToGAS, enableEdit, deleteItem 함수는 이전과 동일)
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
    } catch (e) { return false; }
}

function enableEdit(cell, name, current, unit, category) {
    if (cell.querySelector('input')) return;
    cell.innerHTML = `<input type="number" style="width:70px" value="${current}" step="any">`;
    const input = cell.querySelector('input');
    input.focus();
    input.onblur = async () => {
        const val = parseFloat(input.value);
        if(!isNaN(val) && val >= 0) {
            if (await sendDataToGAS("ADD_UPDATE", name, Math.round(val*100)/100, unit, category)) await loadAndRender();
        } else { await loadAndRender(); }
    };
    input.onkeydown = (e) => { if(e.key === 'Enter') input.blur(); };
}

async function deleteItem(name) {
    if (confirm(`[${name}]을 삭제하시겠습니까?`)) {
        if (await sendDataToGAS("DELETE", name)) await loadAndRender();
    }
}

function updateDatalists() {
    const dl = document.getElementById('existingItems');
    if(dl) dl.innerHTML = Object.keys(inventory).map(n => `<option value="${n}">`).join('');
}

document.addEventListener('DOMContentLoaded', loadAndRender);



