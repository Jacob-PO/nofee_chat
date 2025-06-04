// 구매 신청 제출
    submitPurchase() {
        // Webflow 폼 필드 채우기
        const fillWebflowForm = () => {
            const phone = state.selectedPhone;
            const user = state.userData;
            
            // 상품 정보 필드 - Item 데이터 구조에 맞게 매핑
            document.getElementById('date').value = phone.Date || new Date().toISOString().split('T')[0];
            document.getElementById('carrier').value = phone.Carrier || '';
            document.getElementById('brand').value = phone.Brand || '';
            document.getElementById('model_name').value = phone.Model || '';
            document.getElementById('storage').value = phone.Storage || '';
            document.getElementById('dealer').value = phone.Dealer || '';
            document.getElementById('retail_price').value = phone['Retail Price'] || '';
            document.getElementById('plan_name').value = phone.Plan || '';
            document.getElementById('activation_type').value = phone['Activation Type'] || '';
            document.getElementById('contract_type').value = phone['Contract Type'] || '';
            document.getElementById('subsidy_type').value = phone['Contract Type'] || ''; // Contract Type과 동일
            
            // 지원금 정보
            document.getElementById('official_subsidy').value = phone['Official Subsidy'] || '';
            document.getElementById('dealer_subsidy').value = phone['Dealer Subsidy'] || '';
            document.getElementById('dealer_subsidy_high').value = phone['Dealer Subsidy high'] || '';
            
            // 월 납부 정보
            document.getElementById('device_monthly_payment').value = phone['Monthly Device Fee'] || '';
            document.getElementById('monthly_device_fee').value = phone['Monthly Device Fee'] || '';
            document.getElementById('plan_monthly_payment').value = phone['Plan Principal'] || '';
            document.getElementById('post_plan_monthly_payment').value = phone['Monthly Plan Fee'] || '';
            document.getElementById('total_monthly_payment').value = phone['Total Monthly Payment'] || '';
            
            // 추가 금액 정보
            document.getElementById('device_principal').value = phone['Installment Principal'] || '';
            document.getElementById('device_price_input').value = phone['Selling Price'] || '';
            document.getElementById('optional_discount_ratio').value = phone['Dealer Subsidy high'] || '';
            document.getElementById('margin').value = phone.Margin || '';
            document.getElementById('margin_amount').value = phone['Margin Amount'] || '';
            
            // 계약 기간 (기본값)
            document.getElementById('contract_months').value = '24';
            document.getElementById('plan_required_months').value = '24';
            document.getElementById('plan_effective_monthly_payment').value = phone['Monthly Plan Fee'] || '';
            
            // 고객 정보 필드
            document.getElementById('name').value = user.name || '';
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('message').value = user.message || '';
            document.getElementById('region').value = '서울'; // 기본값
            document.getElementById('city').value = '강남구'; // 기본값
            document.getElementById('consent').value = '동의함';
            
            console.log('Webflow 폼 필드 채우기 완료:', {
                model: phone.Model,
                carrier: phone.Carrier,
                totalPayment: phone['Total Monthly Payment'],
                customerName: user.name
            });
        };
        
        // 실제 구매 데이터 (서버 전송용)
        const purchaseData = {
            phone: state.selectedPhone,
            customer: state.userData,
            timestamp: new Date().toISOString()
        };
        
        console.log('구매 신청 데이터:', purchaseData);
        
        showTypingIndicator();
        
        // Webflow 폼 채우고 제출
        fillWebflowForm();
        
        setTimeout(() => {
            hideTypingIndicator();
            
            // Webflow 폼 제출
            const submitButton = document.getElementById('submit');
            const chatForm = document.getElementById('chat-form') || document.querySelector('form[name="chat"]');
            
            if (submitButton) {
                console.log('Submit 버튼 클릭');
                submitButton.click();
            } else if (chatForm) {
                console.log('Form 직접 제출');
                chatForm.submit();
            } else {
                console.error('제출 폼을 찾을 수 없습니다');
                chatUI.addBotMessage('죄송합니다. 제출 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }
            
            // 성공 메시지 표시
            let successMessage = `
                <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #48bb78;">✅ 구매 신청이 완료되었습니다!</h2>
                    <p style="margin: 15px 0;">
                        ${state.userData.name}님, ${state.selectedPhone.Model} 구매 신청이 정상적으로 접수되었습니다.
                    </p>
                    <p style="color: #718096;">
                        담당자가 곧 ${state.userData.phone}로 연락드릴 예정입니다.<br>
                        감사합니다! 😊
                    </p>
                </div>
            `;
            
            chatUI.addBotMessage(successMessage, 10, true);
            
            setTimeout(() => {
                chatUI.addBotMessage('다른 도움이 필요하신가요?');
                chatUI.showButtons(['처음으로', '종료'], (choice) => {
                    if (choice === '처음으로') {
                        // 상태 초기화
                        state.userData = {
                            priceRange: null,
                            carrier: null,
                            brand: null,
                            activationType: null,
                            name: '',
                            phone: '',
                            email: '',
                            message: ''
                        };
                        state.filteredData = [...state.phoneData];
                        state.selectedPhone = null;
                        chatFlow.start();
                    } else {
                        chatUI.addBotMessage('노피 챗봇을 이용해주셔서 감사합니다. 좋은 하루 되세요! 👋');
                    }
                }, false);
            }, 1500);
        }, 2000);
    },/**
 * 노피 스마트폰 챗봇 - Main JavaScript
 * 
 * GitHub 연동 가이드:
 * 1. 이 파일을 GitHub 저장소의 main.js로 업로드
 * 2. 상품 데이터를 item 파일로 업로드 (JSON 배열 형식)
 * 3. GitHub Pages를 활성화하거나 jsdelivr CDN 사용
 * 
 * 상품 데이터 URL: https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/item
 */

// 🎯 전역 상태 관리
const state = {
    // 챗봇 상태
    currentStep: 'greeting',
    chatHistory: [],
    isTyping: false,
    
    // 사용자 선택 데이터
    userData: {
        priceRange: null,
        carrier: null,
        brand: null,
        activationType: null,
        name: '',
        phone: '',
        email: '',
        message: ''
    },
    
    // 상품 데이터
    phoneData: [],
    filteredData: [],
    selectedPhone: null,
    
    // 필터
    activeFilters: {
        carrier: null,
        brand: null,
        price: null,
        activationType: null
    }
};

// 🎨 유틸리티 함수들
const utils = {
    formatPrice: (value) => {
        return Number(value).toLocaleString('ko-KR');
    },
    
    sanitizeInput: (input) => {
        return input.trim().replace(/<[^>]*>?/gm, '');
    },
    
    validatePhone: (phone) => {
        const phoneRegex = /^01[0-9]{8,9}$/;
        return phoneRegex.test(phone.replace(/-/g, ''));
    },
    
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// 📊 데이터 관리
const dataManager = {
    // GitHub에서 상품 데이터 불러오기
    async loadPhoneData() {
        try {
            showTypingIndicator();
            const response = await fetch('https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/item');
            if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');
            
            state.phoneData = await response.json();
            state.filteredData = [...state.phoneData];
            
            hideTypingIndicator();
            
            // 데이터 로드 성공 후 인사말
            setTimeout(() => {
                chatFlow.start();
            }, 500);
            
        } catch (error) {
            console.error('Error loading data:', error);
            hideTypingIndicator();
            addBotMessage('죄송합니다. 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    },
    
    // 필터링 함수들
    filterByPriceRange(min, max) {
        state.filteredData = state.phoneData.filter(phone => {
            const totalPayment = phone['Total Monthly Payment'];
            return totalPayment >= min && totalPayment <= max;
        });
    },
    
    filterByCarrier(carrier) {
        state.filteredData = state.filteredData.filter(phone => phone.Carrier === carrier);
    },
    
    filterByBrand(brand) {
        state.filteredData = state.filteredData.filter(phone => phone.Brand === brand);
    },
    
    filterByActivationType(type) {
        state.filteredData = state.filteredData.filter(phone => phone['Activation Type'] === type);
    },
    
    // 고유한 값들 추출
    getUniqueValues(field) {
        return [...new Set(state.filteredData.map(phone => phone[field]))].filter(Boolean);
    },
    
    // 검색 함수
    searchPhones(query) {
        const lowerQuery = query.toLowerCase();
        return state.phoneData.filter(phone => 
            phone.Model.toLowerCase().includes(lowerQuery) ||
            phone.Brand.toLowerCase().includes(lowerQuery) ||
            phone.Carrier.toLowerCase().includes(lowerQuery)
        );
    }
};

// 💬 채팅 UI 함수들
const chatUI = {
    // 봇 메시지 추가 (타이핑 애니메이션 포함)
    addBotMessage(msg, delay = 10, isHTML = false) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content"></div>
        `;
        chatMessages.appendChild(messageDiv);
        
        const contentDiv = messageDiv.querySelector('.message-content');
        
        if (isHTML) {
            contentDiv.innerHTML = msg;
            scrollToBottom();
        } else {
            // 타이핑 애니메이션
            let i = 0;
            function typeChar() {
                if (i <= msg.length) {
                    contentDiv.textContent = msg.slice(0, i++);
                    setTimeout(typeChar, delay);
                } else {
                    scrollToBottom();
                }
            }
            typeChar();
        }
    },
    
    // 사용자 메시지 추가
    addUserMessage(msg) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">${utils.sanitizeInput(msg)}</div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    },
    
    // 버튼 옵션 표시
    showButtons(options, callback, showBack = true) {
        const chatMessages = document.getElementById('chatMessages');
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-input quick-actions';
        wrapper.id = 'currentInput';
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            
            // 옵션이 객체인 경우 (label과 value 분리)
            if (typeof option === 'object') {
                btn.innerHTML = option.label;
                btn.onclick = () => {
                    wrapper.remove();
                    chatUI.addUserMessage(option.label);
                    callback(option.value || option.label);
                };
            } else {
                btn.textContent = option;
                btn.onclick = () => {
                    wrapper.remove();
                    chatUI.addUserMessage(option);
                    callback(option);
                };
            }
            wrapper.appendChild(btn);
        });
        
        if (showBack && state.currentStep !== 'greeting') {
            const backBtn = document.createElement('button');
            backBtn.className = 'quick-action-btn';
            backBtn.style.background = '#e53e3e';
            backBtn.textContent = '← 이전으로';
            backBtn.onclick = () => {
                wrapper.remove();
                chatFlow.goBack();
            };
            wrapper.appendChild(backBtn);
        }
        
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    },
    
    // 입력 필드 표시
    showInput(type, placeholder = '', showBack = true) {
        const chatMessages = document.getElementById('chatMessages');
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-input';
        wrapper.id = 'currentInput';
        
        const input = document.createElement('input');
        input.className = 'chat-input-field';
        input.type = type === 'email' ? 'email' : 'text';
        input.placeholder = placeholder;
        
        if (type === 'phone') {
            input.maxLength = 11;
            input.pattern = '[0-9]*';
        }
        
        const btn = document.createElement('button');
        btn.className = 'send-button';
        btn.innerHTML = '➤';
        btn.onclick = () => {
            const value = utils.sanitizeInput(input.value);
            
            // 유효성 검사
            if (type === 'phone' && !utils.validatePhone(value)) {
                input.style.borderColor = '#ff4444';
                input.placeholder = '올바른 전화번호를 입력해주세요';
                return;
            }
            
            if (type === 'email' && !utils.validateEmail(value)) {
                input.style.borderColor = '#ff4444';
                input.placeholder = '올바른 이메일을 입력해주세요';
                return;
            }
            
            if (value) {
                wrapper.remove();
                chatUI.addUserMessage(value);
                chatFlow.handleInput(value);
            }
        };
        
        // Enter 키 지원
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btn.click();
            }
        });
        
        wrapper.appendChild(input);
        wrapper.appendChild(btn);
        
        if (showBack && state.currentStep !== 'greeting') {
            const backBtn = document.createElement('button');
            backBtn.className = 'quick-action-btn';
            backBtn.style.background = '#e53e3e';
            backBtn.style.marginLeft = '10px';
            backBtn.textContent = '← 이전';
            backBtn.onclick = () => {
                wrapper.remove();
                chatFlow.goBack();
            };
            wrapper.appendChild(backBtn);
        }
        
        chatMessages.appendChild(wrapper);
        scrollToBottom();
        
        // 자동 포커스
        setTimeout(() => input.focus(), 100);
    },
    
    // 현재 입력 요소 제거
    removeCurrentInput() {
        const currentInput = document.getElementById('currentInput');
        if (currentInput) currentInput.remove();
    }
}

// 메시지 전송 함수 (호환성 유지)
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    chatUI.addUserMessage(message);
    input.value = '';
    
    showTypingIndicator();
    
    setTimeout(() => {
        processMessage(message);
        hideTypingIndicator();
    }, 1000);
}

// 빠른 메시지 전송
function sendQuickMessage(message) {
    chatUI.removeCurrentInput();
    chatUI.addUserMessage(message);
    
    showTypingIndicator();
    
    setTimeout(() => {
        processMessage(message);
        hideTypingIndicator();
    }, 1000);
}

// 엔터키 처리
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 타이핑 인디케이터
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message bot';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// 스크롤 맨 아래로
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 호환성을 위한 래퍼 함수들
function addBotMessage(message, isHTML = false) {
    chatUI.addBotMessage(message, 10, isHTML);
}

function addUserMessage(message) {
    chatUI.addUserMessage(message);
}

// 🔄 채팅 플로우 관리
const chatFlow = {
    // 채팅 시작
    start() {
        state.currentStep = 'initial';
        chatUI.addBotMessage('안녕하세요! 노피 스마트폰 챗봇입니다. 👋');
        
        setTimeout(() => {
            chatUI.addBotMessage('어떤 도움이 필요하신가요?');
            chatUI.showButtons([
                '스마트폰 추천받기',
                '최신 스마트폰 보기',
                '브랜드별 검색',
                '전체 목록 보기'
            ], (choice) => {
                switch(choice) {
                    case '스마트폰 추천받기':
                        chatFlow.askPriceRange();
                        break;
                    case '최신 스마트폰 보기':
                        chatFlow.showLatestPhones();
                        break;
                    case '브랜드별 검색':
                        chatFlow.askBrand();
                        break;
                    case '전체 목록 보기':
                        chatFlow.showAllPhones();
                        break;
                }
            }, false);
        }, 1500);
    },
    
    // 가격대 질문
    askPriceRange() {
        state.currentStep = 'priceRange';
        chatUI.addBotMessage('원하시는 월 납부금액대를 선택해주세요.');
        
        const priceRanges = [
            { label: '3만원 이하', value: { min: 0, max: 30000 } },
            { label: '3~5만원', value: { min: 30000, max: 50000 } },
            { label: '5~7만원', value: { min: 50000, max: 70000 } },
            { label: '7~10만원', value: { min: 70000, max: 100000 } },
            { label: '10만원 이상', value: { min: 100000, max: Infinity } }
        ];
        
        chatUI.showButtons(priceRanges, (range) => {
            state.userData.priceRange = range;
            dataManager.filterByPriceRange(range.min, range.max);
            
            if (state.filteredData.length === 0) {
                chatUI.addBotMessage('선택하신 가격대에 맞는 상품이 없습니다. 다른 가격대를 선택해주세요.');
                setTimeout(() => chatFlow.askPriceRange(), 1000);
                return;
            }
            
            chatFlow.askCarrier();
        });
    },
    
    // 통신사 질문
    askCarrier() {
        state.currentStep = 'carrier';
        const carriers = dataManager.getUniqueValues('Carrier');
        
        if (carriers.length === 0) {
            chatFlow.askBrand();
            return;
        }
        
        chatUI.addBotMessage('선호하시는 통신사를 선택해주세요.');
        chatUI.showButtons(['상관없음', ...carriers], (carrier) => {
            if (carrier !== '상관없음') {
                state.userData.carrier = carrier;
                dataManager.filterByCarrier(carrier);
            }
            chatFlow.askActivationType();
        });
    },
    
    // 가입 유형 질문
    askActivationType() {
        state.currentStep = 'activationType';
        const types = dataManager.getUniqueValues('Activation Type');
        
        if (types.length === 0) {
            chatFlow.askBrand();
            return;
        }
        
        chatUI.addBotMessage('가입 유형을 선택해주세요.');
        chatUI.showButtons(types, (type) => {
            state.userData.activationType = type;
            dataManager.filterByActivationType(type);
            chatFlow.askBrand();
        });
    },
    
    // 브랜드 질문
    askBrand() {
        state.currentStep = 'brand';
        const brands = dataManager.getUniqueValues('Brand');
        
        if (brands.length === 0) {
            chatUI.addBotMessage('조건에 맞는 상품이 없습니다. 처음부터 다시 시작합니다.');
            setTimeout(() => chatFlow.start(), 1500);
            return;
        }
        
        chatUI.addBotMessage('어떤 브랜드를 선호하시나요?');
        chatUI.showButtons(['상관없음', ...brands], (brand) => {
            if (brand !== '상관없음') {
                state.userData.brand = brand;
                dataManager.filterByBrand(brand);
            }
            chatFlow.showFilteredPhones();
        });
    },
    
    // 필터링된 폰 목록 표시
    showFilteredPhones() {
        state.currentStep = 'phoneList';
        
        if (state.filteredData.length === 0) {
            chatUI.addBotMessage('조건에 맞는 상품이 없습니다. 다시 검색해보시겠어요?');
            chatUI.showButtons(['예', '아니요'], (answer) => {
                if (answer === '예') {
                    state.filteredData = [...state.phoneData];
                    chatFlow.start();
                } else {
                    chatUI.addBotMessage('도움이 필요하시면 언제든 문의해주세요!');
                }
            });
            return;
        }
        
        let message = `조건에 맞는 스마트폰 ${state.filteredData.length}개를 찾았습니다.`;
        chatUI.addBotMessage(message);
        
        setTimeout(() => {
            const phonesToShow = state.filteredData.slice(0, 5);
            let html = createPhoneListHTML(phonesToShow);
            
            if (state.filteredData.length > 5) {
                html += `<br><button class="quick-action-btn" onclick="chatFlow.showMorePhones()">더 보기 (${state.filteredData.length - 5}개)</button>`;
            }
            
            chatUI.addBotMessage(html, 10, true);
        }, 500);
    },
    
    // 더 많은 폰 보기
    showMorePhones() {
        const startIndex = document.querySelectorAll('.phone-card').length;
        const phonesToShow = state.filteredData.slice(startIndex, startIndex + 5);
        let html = createPhoneListHTML(phonesToShow);
        
        if (startIndex + 5 < state.filteredData.length) {
            html += `<br><button class="quick-action-btn" onclick="chatFlow.showMorePhones()">더 보기</button>`;
        }
        
        chatUI.addBotMessage(html, 10, true);
    },
    
    // 폰 상세 정보 및 구매 신청
    showPhoneDetail(index) {
        state.currentStep = 'phoneDetail';
        const phone = state.phoneData[index];
        state.selectedPhone = phone;
        
        let html = `
            <h3 style="color: #667eea; margin-bottom: 15px;">${phone.Model} 상세 정보</h3>
            <div class="phone-card" style="border: 2px solid #667eea;">
                <div class="phone-details" style="grid-template-columns: 1fr;">
                    <div>📱 모델: ${phone.Model}</div>
                    <div>💾 저장용량: ${phone.Storage}</div>
                    <div>📡 통신사: ${phone.Carrier}</div>
                    <div>📋 요금제: ${phone.Plan}</div>
                    <div>🏪 판매점: ${phone.Dealer}</div>
                    <div>📅 가입유형: ${phone['Activation Type']}</div>
                    <div>📄 계약유형: ${phone['Contract Type']}</div>
                </div>
                <div class="price-info">
                    <h4 style="color: #667eea;">💰 가격 정보</h4>
                    <div>정가: ${formatPrice(phone['Retail Price'])}원</div>
                    <div>공시지원금: ${formatPrice(phone['Official Subsidy'])}원</div>
                    <div>판매점 추가지원금: ${formatPrice(phone['Dealer Subsidy'])}원</div>
                    <div>월 단말기 할부금: ${formatPrice(Math.abs(phone['Monthly Device Fee']))}원</div>
                    <div>월 요금제: ${formatPrice(phone['Monthly Plan Fee'])}원</div>
                    <div class="monthly-payment">총 월 납부금액: ${formatPrice(phone['Total Monthly Payment'])}원</div>
                </div>
            </div>
        `;
        
        chatUI.addBotMessage(html, 10, true);
        
        setTimeout(() => {
            chatUI.addBotMessage('이 상품을 구매 신청하시겠습니까?');
            chatUI.showButtons(['구매 신청하기', '다른 상품 보기'], (choice) => {
                if (choice === '구매 신청하기') {
                    chatFlow.startPurchase();
                } else {
                    chatFlow.showFilteredPhones();
                }
            });
        }, 1000);
    },
    
    // 구매 신청 시작
    startPurchase() {
        state.currentStep = 'purchaseName';
        chatUI.addBotMessage('구매 신청을 도와드리겠습니다. 먼저 성함을 입력해주세요.');
        chatUI.showInput('text', '홍길동');
    },
    
    // 입력 처리
    handleInput(value) {
        switch(state.currentStep) {
            case 'purchaseName':
                state.userData.name = value;
                state.currentStep = 'purchasePhone';
                chatUI.addBotMessage('연락 가능한 전화번호를 입력해주세요. (- 없이 숫자만)');
                chatUI.showInput('phone', '01012345678');
                break;
                
            case 'purchasePhone':
                state.userData.phone = value;
                state.currentStep = 'purchaseEmail';
                chatUI.addBotMessage('이메일 주소를 입력해주세요.');
                chatUI.showInput('email', 'example@email.com');
                break;
                
            case 'purchaseEmail':
                state.userData.email = value;
                state.currentStep = 'purchaseMessage';
                chatUI.addBotMessage('추가 요청사항이 있으시면 입력해주세요. (선택사항)');
                chatUI.showButtons(['없음', '직접 입력'], (choice) => {
                    if (choice === '없음') {
                        state.userData.message = '';
                        chatFlow.confirmPurchase();
                    } else {
                        chatUI.showInput('text', '요청사항을 입력하세요');
                    }
                });
                break;
                
            case 'purchaseMessage':
                state.userData.message = value;
                chatFlow.confirmPurchase();
                break;
        }
    },
    
    // 구매 확인
    confirmPurchase() {
        state.currentStep = 'confirm';
        const phone = state.selectedPhone;
        const user = state.userData;
        
        let html = `
            <h3 style="color: #667eea;">구매 신청 정보 확인</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0;">
                <h4>📱 상품 정보</h4>
                <p>모델: ${phone.Model}</p>
                <p>통신사: ${phone.Carrier}</p>
                <p>월 납부금액: ${formatPrice(phone['Total Monthly Payment'])}원</p>
                
                <h4 style="margin-top: 15px;">👤 고객 정보</h4>
                <p>이름: ${user.name}</p>
                <p>연락처: ${user.phone}</p>
                <p>이메일: ${user.email}</p>
                ${user.message ? `<p>요청사항: ${user.message}</p>` : ''}
            </div>
        `;
        
        chatUI.addBotMessage(html, 10, true);
        
        setTimeout(() => {
            chatUI.addBotMessage('위 정보가 맞으신가요?');
            chatUI.showButtons(['네, 신청합니다', '정보 수정'], (choice) => {
                if (choice === '네, 신청합니다') {
                    chatFlow.submitPurchase();
                } else {
                    chatFlow.startPurchase();
                }
            });
        }, 500);
    },
    
    // 구매 신청 제출
    submitPurchase() {
        // 실제로는 서버로 데이터 전송
        const purchaseData = {
            phone: state.selectedPhone,
            customer: state.userData,
            timestamp: new Date().toISOString()
        };
        
        console.log('구매 신청 데이터:', purchaseData);
        
        showTypingIndicator();
        
        // 실제 구현에서는 서버 API 호출
        setTimeout(() => {
            hideTypingIndicator();
            
            let successMessage = `
                <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #48bb78;">✅ 구매 신청이 완료되었습니다!</h2>
                    <p style="margin: 15px 0;">
                        ${state.userData.name}님, ${state.selectedPhone.Model} 구매 신청이 정상적으로 접수되었습니다.
                    </p>
                    <p style="color: #718096;">
                        담당자가 곧 ${state.userData.phone}로 연락드릴 예정입니다.<br>
                        감사합니다! 😊
                    </p>
                </div>
            `;
            
            chatUI.addBotMessage(successMessage, 10, true);
            
            setTimeout(() => {
                chatUI.addBotMessage('다른 도움이 필요하신가요?');
                chatUI.showButtons(['처음으로', '종료'], (choice) => {
                    if (choice === '처음으로') {
                        // 상태 초기화
                        state.userData = {
                            priceRange: null,
                            carrier: null,
                            brand: null,
                            activationType: null,
                            name: '',
                            phone: '',
                            email: '',
                            message: ''
                        };
                        state.filteredData = [...state.phoneData];
                        state.selectedPhone = null;
                        chatFlow.start();
                    } else {
                        chatUI.addBotMessage('노피 챗봇을 이용해주셔서 감사합니다. 좋은 하루 되세요! 👋');
                    }
                }, false);
            }, 1500);
        }, 2000);
    },
    
    // 최신 폰 표시
    showLatestPhones() {
        state.currentStep = 'latest';
        const latestPhones = state.phoneData
            .sort((a, b) => new Date(b.Date) - new Date(a.Date))
            .slice(0, 5);
        
        chatUI.addBotMessage('최신 등록된 스마트폰입니다:');
        
        setTimeout(() => {
            const html = createPhoneListHTML(latestPhones);
            chatUI.addBotMessage(html, 10, true);
            
            setTimeout(() => {
                chatUI.showButtons(['스마트폰 추천받기', '처음으로'], (choice) => {
                    if (choice === '스마트폰 추천받기') {
                        chatFlow.askPriceRange();
                    } else {
                        chatFlow.start();
                    }
                });
            }, 500);
        }, 500);
    },
    
    // 전체 폰 표시
    showAllPhones() {
        state.currentStep = 'all';
        document.getElementById('filters').style.display = 'block';
        
        chatUI.addBotMessage(`총 ${state.phoneData.length}개의 스마트폰을 찾았습니다.`);
        
        setTimeout(() => {
            const html = createPhoneListHTML(state.phoneData.slice(0, 5));
            chatUI.addBotMessage(html, 10, true);
            
            if (state.phoneData.length > 5) {
                setTimeout(() => {
                    chatUI.showButtons([
                        `더 보기 (${state.phoneData.length - 5}개)`,
                        '스마트폰 추천받기',
                        '처음으로'
                    ], (choice) => {
                        if (choice.includes('더 보기')) {
                            state.filteredData = [...state.phoneData];
                            chatFlow.showMorePhones();
                        } else if (choice === '스마트폰 추천받기') {
                            document.getElementById('filters').style.display = 'none';
                            chatFlow.askPriceRange();
                        } else {
                            document.getElementById('filters').style.display = 'none';
                            chatFlow.start();
                        }
                    });
                }, 500);
            }
        }, 500);
    },
    
    // 뒤로가기
    goBack() {
        const steps = ['initial', 'priceRange', 'carrier', 'activationType', 'brand', 'phoneList'];
        const currentIndex = steps.indexOf(state.currentStep);
        
        if (currentIndex > 0) {
            state.currentStep = steps[currentIndex - 1];
            
            // 마지막 사용자 메시지 제거
            const messages = document.querySelectorAll('.message.user');
            if (messages.length > 0) {
                messages[messages.length - 1].remove();
            }
            
            // 이전 단계로 이동
            switch(state.currentStep) {
                case 'initial':
                    chatFlow.start();
                    break;
                case 'priceRange':
                    state.filteredData = [...state.phoneData];
                    chatFlow.askPriceRange();
                    break;
                case 'carrier':
                    if (state.userData.priceRange) {
                        dataManager.filterByPriceRange(state.userData.priceRange.min, state.userData.priceRange.max);
                    }
                    chatFlow.askCarrier();
                    break;
                case 'activationType':
                    if (state.userData.carrier) {
                        dataManager.filterByCarrier(state.userData.carrier);
                    }
                    chatFlow.askActivationType();
                    break;
                case 'brand':
                    if (state.userData.activationType) {
                        dataManager.filterByActivationType(state.userData.activationType);
                    }
                    chatFlow.askBrand();
                    break;
            }
        }
    }
};

// 메시지 처리
function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // 인사말
    if (lowerMessage.includes('안녕') || lowerMessage.includes('하이') || lowerMessage.includes('hello')) {
        chatUI.addBotMessage('안녕하세요! 어떤 스마트폰을 찾고 계신가요? 😊');
        setTimeout(() => {
            chatUI.showButtons([
                '스마트폰 추천받기',
                '최신 스마트폰 보기',
                '브랜드별 검색',
                '전체 목록 보기'
            ], (choice) => {
                chatUI.removeCurrentInput();
                switch(choice) {
                    case '스마트폰 추천받기':
                        chatFlow.askPriceRange();
                        break;
                    case '최신 스마트폰 보기':
                        chatFlow.showLatestPhones();
                        break;
                    case '브랜드별 검색':
                        chatFlow.askBrand();
                        break;
                    case '전체 목록 보기':
                        chatFlow.showAllPhones();
                        break;
                }
            }, false);
        }, 500);
        return;
    }
    
    // 전체 목록
    if (lowerMessage.includes('전체') || lowerMessage.includes('모든') || lowerMessage.includes('목록')) {
        chatUI.removeCurrentInput();
        chatFlow.showAllPhones();
        return;
    }
    
    // 최신 스마트폰
    if (lowerMessage.includes('최신') || lowerMessage.includes('신상')) {
        chatUI.removeCurrentInput();
        chatFlow.showLatestPhones();
        return;
    }
    
    // 브랜드 검색
    if (lowerMessage.includes('삼성') || lowerMessage.includes('갤럭시')) {
        chatUI.removeCurrentInput();
        filterByBrand('삼성');
        return;
    }
    
    if (lowerMessage.includes('애플') || lowerMessage.includes('아이폰')) {
        chatUI.removeCurrentInput();
        filterByBrand('애플');
        return;
    }
    
    // 가격대 검색
    if (lowerMessage.includes('저렴') || lowerMessage.includes('싸게') || lowerMessage.includes('5만원 이하')) {
        chatUI.removeCurrentInput();
        filterByPrice('0-50000');
        return;
    }
    
    // 통신사 검색
    if (lowerMessage.includes('sk') || lowerMessage.includes('에스케이')) {
        chatUI.removeCurrentInput();
        filterByCarrier('SK');
        return;
    }
    
    if (lowerMessage.includes('kt') || lowerMessage.includes('케이티')) {
        chatUI.removeCurrentInput();
        filterByCarrier('KT');
        return;
    }
    
    if (lowerMessage.includes('lg') || lowerMessage.includes('엘지')) {
        chatUI.removeCurrentInput();
        filterByCarrier('LG');
        return;
    }
    
    // 도움말
    if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
        chatUI.removeCurrentInput();
        showHelp();
        return;
    }
    
    // 처음으로
    if (lowerMessage.includes('처음') || lowerMessage.includes('시작')) {
        chatUI.removeCurrentInput();
        state.filteredData = [...state.phoneData];
        chatFlow.start();
        return;
    }
    
    // 검색 기능
    const searchResults = dataManager.searchPhones(message);
    if (searchResults.length > 0) {
        chatUI.removeCurrentInput();
        state.filteredData = searchResults;
        chatUI.addBotMessage(`"${message}" 검색 결과 ${searchResults.length}개를 찾았습니다.`);
        setTimeout(() => {
            const html = createPhoneListHTML(searchResults.slice(0, 5));
            chatUI.addBotMessage(html, 10, true);
        }, 500);
        return;
    }
    
    // 기본 응답
    chatUI.addBotMessage('죄송합니다. 이해하지 못했습니다.');
    setTimeout(() => {
        showHelp();
    }, 500);
}

// 브랜드별 필터
function filterByBrand(brand) {
    state.filteredData = state.phoneData.filter(phone => phone.Brand === brand);
    
    if (state.filteredData.length === 0) {
        chatUI.addBotMessage(`${brand} 브랜드의 스마트폰을 찾을 수 없습니다.`);
        return;
    }
    
    let html = `${brand} 스마트폰 ${state.filteredData.length}개를 찾았습니다:<br><br>`;
    html += createPhoneListHTML(state.filteredData.slice(0, 5));
    
    if (state.filteredData.length > 5) {
        html += `<br><button class="quick-action-btn" onclick="chatFlow.showMorePhones()">더 보기</button>`;
    }
    
    chatUI.addBotMessage(html, 10, true);
}

// 통신사별 필터
function filterByCarrier(carrier) {
    state.filteredData = state.phoneData.filter(phone => phone.Carrier === carrier);
    
    if (state.filteredData.length === 0) {
        chatUI.addBotMessage(`${carrier} 통신사의 스마트폰을 찾을 수 없습니다.`);
        return;
    }
    
    let html = `${carrier} 통신사 스마트폰 ${state.filteredData.length}개를 찾았습니다:<br><br>`;
    html += createPhoneListHTML(state.filteredData.slice(0, 5));
    
    chatUI.addBotMessage(html, 10, true);
}

// 가격대별 필터
function filterByPrice(priceRange) {
    let min, max;
    
    switch(priceRange) {
        case '0-50000':
            min = 0; max = 50000;
            break;
        case '50000-70000':
            min = 50000; max = 70000;
            break;
        case '70000-100000':
            min = 70000; max = 100000;
            break;
        default:
            min = 0; max = Infinity;
    }
    
    state.filteredData = state.phoneData.filter(phone => 
        phone['Total Monthly Payment'] >= min && phone['Total Monthly Payment'] <= max
    );
    
    if (state.filteredData.length === 0) {
        chatUI.addBotMessage('해당 가격대의 스마트폰을 찾을 수 없습니다.');
        return;
    }
    
    let priceLabel = priceRange === '0-50000' ? '5만원 이하' : '해당 가격대';
    let html = `월 납부금액 ${priceLabel} 스마트폰 ${state.filteredData.length}개를 찾았습니다:<br><br>`;
    html += createPhoneListHTML(state.filteredData.slice(0, 5));
    
    chatUI.addBotMessage(html, 10, true);
}

// 폰 리스트 HTML 생성
function createPhoneListHTML(phones) {
    let html = '';
    
    phones.forEach((phone, index) => {
        const globalIndex = state.phoneData.indexOf(phone);
        html += `
            <div class="phone-card" onclick="chatFlow.showPhoneDetail(${globalIndex})" style="cursor: pointer;">
                <div class="phone-card-header">
                    <span class="phone-model">${phone.Model}</span>
                    <span class="carrier-badge ${phone.Carrier}">${phone.Carrier}</span>
                </div>
                <div class="phone-details">
                    <div>📱 ${phone.Storage}</div>
                    <div>📋 ${phone.Plan}요금제</div>
                    <div>🏪 ${phone.Dealer}</div>
                    <div>📅 ${phone['Activation Type']}</div>
                </div>
                <div class="price-info">
                    <div>정가: ${formatPrice(phone['Retail Price'])}원</div>
                    <div>공시지원금: ${formatPrice(phone['Official Subsidy'])}원</div>
                    <div>추가지원금: ${formatPrice(phone['Dealer Subsidy'])}원</div>
                    <div class="monthly-payment">월 ${formatPrice(phone['Total Monthly Payment'])}원</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// 가격 포맷
function formatPrice(price) {
    return utils.formatPrice(price);
}

// 필터 토글
function toggleFilter(type, value) {
    const filterOptions = document.querySelectorAll('.filter-option');
    let targetOption = null;
    
    // 해당 필터 찾기
    filterOptions.forEach(option => {
        if (option.textContent === value) {
            targetOption = option;
        }
    });
    
    if (targetOption) {
        // 같은 타입의 다른 필터들 비활성화
        filterOptions.forEach(option => {
            if (option !== targetOption && option.parentElement === targetOption.parentElement) {
                option.classList.remove('active');
            }
        });
        
        // 현재 필터 토글
        targetOption.classList.toggle('active');
        
        if (targetOption.classList.contains('active')) {
            state.activeFilters[type] = value;
        } else {
            state.activeFilters[type] = null;
        }
    }
    
    applyFilters();
}

// 필터 적용
function applyFilters() {
    state.filteredData = state.phoneData.filter(phone => {
        let match = true;
        
        if (state.activeFilters.carrier && phone.Carrier !== state.activeFilters.carrier) {
            match = false;
        }
        
        if (state.activeFilters.brand && phone.Brand !== state.activeFilters.brand) {
            match = false;
        }
        
        if (state.activeFilters.activationType && phone['Activation Type'] !== state.activeFilters.activationType) {
            match = false;
        }
        
        if (state.activeFilters.price) {
            const monthlyPayment = phone['Total Monthly Payment'];
            const [minStr, maxStr] = state.activeFilters.price.split('-');
            const min = parseInt(minStr);
            const max = parseInt(maxStr);
            
            if (monthlyPayment < min || monthlyPayment > max) {
                match = false;
            }
        }
        
        return match;
    });
    
    showFilteredResults();
}

// 필터링 결과 표시
function showFilteredResults() {
    chatUI.removeCurrentInput();
    
    if (state.filteredData.length === 0) {
        chatUI.addBotMessage('선택하신 조건에 맞는 스마트폰이 없습니다. 다른 조건으로 검색해보세요.');
        return;
    }
    
    let html = `필터링 결과: ${state.filteredData.length}개의 스마트폰을 찾았습니다.<br><br>`;
    html += createPhoneListHTML(state.filteredData.slice(0, 5));
    
    if (state.filteredData.length > 5) {
        html += `<br><button class="quick-action-btn" onclick="chatFlow.showMorePhones()">더 보기</button>`;
    }
    
    chatUI.addBotMessage(html, 10, true);
}

// 도움말 표시
function showHelp() {
    const helpMessage = `
        <h3 style="color: #667eea;">🤔 도움말</h3>
        <p>다음과 같이 물어보실 수 있습니다:</p>
        <div style="margin-left: 20px; line-height: 1.8;">
            <div>📱 "삼성 스마트폰 보여줘"</div>
            <div>💰 "5만원 이하 요금제"</div>
            <div>📡 "SK 통신사 폰"</div>
            <div>🆕 "최신 스마트폰"</div>
            <div>📋 "전체 목록 보기"</div>
            <div>🔍 특정 모델명으로 검색</div>
        </div>
        <p style="margin-top: 15px;">또는 아래 버튼을 클릭해주세요:</p>
    `;
    
    chatUI.addBotMessage(helpMessage, 10, true);
    
    setTimeout(() => {
        chatUI.showButtons([
            '스마트폰 추천받기',
            '최신 스마트폰 보기',
            '전체 목록 보기'
        ], (choice) => {
            switch(choice) {
                case '스마트폰 추천받기':
                    chatFlow.askPriceRange();
                    break;
                case '최신 스마트폰 보기':
                    chatFlow.showLatestPhones();
                    break;
                case '전체 목록 보기':
                    chatFlow.showAllPhones();
                    break;
            }
        }, false);
    }, 500);
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 초기 인사말
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        // 기존 초기 메시지 제거
        chatMessages.innerHTML = '';
        
        // 데이터 로드
        dataManager.loadPhoneData();
    } else {
        console.error('chatMessages 컨테이너를 찾을 수 없습니다.');
    }
});

// 전역 함수로 노출 (HTML에서 호출 가능하도록)
window.chatFlow = chatFlow;
window.toggleFilter = toggleFilter;
window.sendQuickMessage = sendQuickMessage;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
