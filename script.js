// localStorage에서 현재 재고 데이터를 불러옵니다.
let inventory = JSON.parse(localStorage.getItem('inventoryData')) || {};

// 자동 완성 목록(datalist)을 업데이트하는 함수
function updateDatalist() {
    const datalist = document.getElementById('existingItems');
    datalist.innerHTML = ''; // 기존 옵션 초기화

    for (const name in inventory) {
        if (inventory.hasOwnProperty(name)) {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        }
    }
}

// **[추가] 재고 수량을 직접 수정하고 저장하는 함수**
function updateQuantity(itemName, newQuantity) {
    newQuantity = parseInt(newQuantity, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('유효한 0 이상의 수량을 입력해야 합니다.');
        renderInventory(); // 잘못된 입력 시 목록을 다시 그림
        return;
    }

    if (inventory[itemName]) {
        inventory[itemName].quantity = newQuantity;
        inventory[itemName].lastUpdated = new Date().toLocaleDateString('ko-KR'); // 수정일 업데이트

        if (newQuantity === 0) {
            // 재고가 0이 되면 '주문 필요' 메시지를 보여주기 위해 삭제하지 않고 유지합니다.
        }
        
        saveInventory();
        renderInventory(); // 목록 다시 그리기
    }
}

// 재고 목록을 화면에 렌더링하는 함수
function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = ''; 

    for (const name in inventory) {
        if (inventory.hasOwnProperty(name)) {
            const item = inventory[name];
            const row = list.insertRow(); 

            // 1. 물품 이름
            row.insertCell(0).textContent = name;

            // 2. 현재 수량 (갯수) - **[수정] 편집 가능하게 설정**
            const cellQuantity = row.insertCell(1);
            
            let quantityText = item.quantity;
            if (item.quantity === 0) {
                quantityText += ' (주문 필요)';
            }
            cellQuantity.textContent = quantityText;
            
            // 셀에 클릭 이벤트 리스너 추가 (편집 기능 핵심)
            cellQuantity.onclick = () => enableEdit(cellQuantity, name, item.quantity);

            // 3. 마지막 기록일
            row.insertCell(2).textContent = item.lastUpdated; 
            
            // 4. 삭제 버튼
            const cellAction = row.insertCell(3);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteItem(name);
            cellAction.appendChild(deleteBtn);
        }
    }
    
    updateDatalist();
}

// **[추가] 셀을 입력 필드로 바꾸는 함수 (편집 모드 활성화)**
function enableEdit(cell, itemName, currentValue) {
    // 이미 편집 모드라면 중복 실행 방지
    if (cell.querySelector('input')) return;

    // 텍스트를 비우고 입력 필드 생성
    cell.innerHTML = '';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'editable-input';
    input.value = currentValue;
    input.min = '0'; // 최소값 0 설정
    
    cell.appendChild(input);
    input.focus();
    
    // 입력 필드에서 포커스를 잃거나 (blur), Enter 키를 누르면 저장 실행
    const saveChanges = () => {
        updateQuantity(itemName, input.value);
    };

    input.onblur = saveChanges; // 포커스 잃을 때 저장
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Enter 키 입력 시 줄바꿈 방지
            input.blur(); // 포커스를 잃게 하여 saveChanges 실행
        }
    };
}

// 재고를 추가/갱신하는 함수 (이전 코드와 동일, 키보드 숨김 유지)
function addItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const quantityInput = document.getElementById('itemQuantity').value;
    const transactionType = document.getElementById('transactionType').value;
    const quantity = parseInt(quantityInput, 10);
    const currentDate = new Date().toLocaleDateString('ko-KR'); 

    if (!itemName || isNaN(quantity) || quantity <= 0) {
        alert('물품 이름과 1개 이상의 유효한 수량을 입력해 주세요.');
        return;
    }

    if (!inventory[itemName]) {
        inventory[itemName] = { quantity: 0, lastUpdated: currentDate };
    }

    if (transactionType === '입고') {
        inventory[itemName].quantity += quantity;
    } else if (transactionType === '출고') {
        if (inventory[itemName].quantity < quantity) {
             alert(`${itemName}의 현재 재고(${inventory[itemName].quantity})보다 출고 수량이 많습니다!`);
             return;
        }
        inventory[itemName].quantity -= quantity;
    }
    
    inventory[itemName].lastUpdated = currentDate;
    
    saveInventory();
    renderInventory();
    
    document.getElementById('itemName').value = '';
    document.getElementById('itemQuantity').value = '';
    document.activeElement.blur(); 
}

// 특정 물품을 재고 목록에서 완전히 삭제하는 함수
function deleteItem(name) {
    if (confirm(`정말로 물품 [${name}]의 재고 기록을 삭제하시겠습니까?`)) {
        delete inventory[name];
        saveInventory();
        renderInventory();
    }
}

// localStorage에 현재 inventory 데이터를 JSON 형태로 저장하는 함수
function saveInventory() {
    localStorage.setItem('inventoryData', JSON.stringify(inventory));
}

// 페이지 로드 시 재고 목록을 화면에 표시
document.addEventListener('DOMContentLoaded', renderInventory);