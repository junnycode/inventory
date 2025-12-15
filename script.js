// **구글 시트 불러오기 .** 구글 계정 rudtkdqnrehrnaltldnjsvudehd
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzIqr8_nmcYdhRmsm_TDidVjGafKCmHDr35LMUifU9DJgvMBqtKXBithsl4xSV2JGcMFw/exec'; 

let inventory = {}; 

// --- 데이터 통신 함수 ---

//  구글 GAS에서 재고 목록을 불러오는 함수 (GET 요청)
async function fetchInventory() {
    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();

        if (data.error) {
            console.error("GAS Error:", data.error);
            return {};
        }
        return data; 
    } catch (e) {
        console.error("Fetch Error:", e);
        return {};
    }
}

// GAS로 데이터 변경 요청을 보내는 함수 (POST 요청)
async function sendDataToGAS(action, itemName, quantity = 0) {
    const date = new Date().toLocaleDateString('ko-KR');
    
    const payload = {
        action: action, 
        itemName: itemName,
        quantity: quantity,
        date: date
    };

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
        });
        const result = await response.json();
        
        if (!result.success) {
            alert("데이터 저장 실패: " + (result.error || result.message));
        }
        return result.success;
    } catch (e) {
        console.error("POST Error:", e);
        alert("서버에 데이터를 전송하는 데 실패했습니다.");
        return false;
    }
}

// --- UI 및 로직 함수 ---

function updateDatalist() {
    const datalist = document.getElementById('existingItems');
    datalist.innerHTML = ''; 
    for (const name in inventory) {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    }
}

async function updateQuantity(itemName, newQuantity) {
    newQuantity = parseInt(newQuantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('유효한 0 이상의 수량을 입력해야 합니다.');
        loadAndRender(); 
        return;
    }
    
    const success = await sendDataToGAS("ADD_UPDATE", itemName, newQuantity);
    if (success) {
        loadAndRender();
    }
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        const item = inventory[name];
        const row = list.insertRow(); 
        row.insertCell(0).textContent = name;

        const cellQuantity = row.insertCell(1);
        let quantityText = item.quantity;
        if (item.quantity === 0) {
            quantityText += ' (주문 필요)';
        }
        cellQuantity.textContent = quantityText;
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

function enableEdit(cell, itemName, currentValue) {
    if (cell.querySelector('input')) return;

    cell.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'editable-input';
    input.value = currentValue;
    input.min = '0'; 
    cell.appendChild(input);
    input.focus();
    
    const saveChanges = () => { updateQuantity(itemName, input.value); };
    input.onblur = saveChanges; 
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            input.blur(); 
        }
    };
}

async function addItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const quantityInput = document.getElementById('itemQuantity').value;
    const transactionType = document.getElementById('transactionType').value;
    const inputQuantity = parseInt(quantityInput, 10);

    if (!itemName || isNaN(inputQuantity) || inputQuantity <= 0) {
        alert('물품 이름과 1개 이상의 유효한 수량을 입력해 주세요.');
        return;
    }
    
    const currentQuantity = inventory[itemName] ? inventory[itemName].quantity : 0;
    let newQuantity;
    
    if (transactionType === '입고') {
        newQuantity = currentQuantity + inputQuantity;
    } else { 
        if (currentQuantity < inputQuantity) {
             alert(`${itemName}의 현재 재고(${currentQuantity})보다 출고 수량이 많습니다!`);
             return;
        }
        newQuantity = currentQuantity - inputQuantity;
    }
    
    const success = await sendDataToGAS("ADD_UPDATE", itemName, newQuantity);

    if (success) {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        document.activeElement.blur(); 
        loadAndRender(); 
    }
}

async function deleteItem(name) {
    if (confirm(`정말로 물품 [${name}]의 재고 기록을 삭제하시겠습니까?`)) {
        const success = await sendDataToGAS("DELETE", name);
        if (success) {
            loadAndRender(); 
        }
    }
}

async function loadAndRender() {
    inventory = await fetchInventory(); 
    renderInventory(); 
}

document.addEventListener('DOMContentLoaded', loadAndRender);

// 오류 생성시 문의 :seojun
