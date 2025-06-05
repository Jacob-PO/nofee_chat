// 노피 AI 챗봇 - main.js
console.log('Nofee AI main.js 실행 시작');

// 전역 NofeeAI 객체
window.NofeeAI = {
    // 상태 관리
    state: {
        currentStep: 'intro',
        messages: [],
        userData: {
            name: '',
            phone: '',
            dataUsage: '',
            priceRange: '',
            brand: '',
            preference: '',
            region: '',
            district: ''
        },
        isTyping: false,
        phoneData: [],
        regionData: [],
        selectedProduct: null
    },

    // 설정
    config: {
        GITHUB_BASE: 'https://cdn.jsdelivr.net/gh/Jacob-PO/nofee_chat@main/',
        BACKUP_BASE: 'https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/'
    },

    // 채팅 컨테이너
    chatContainer: null,

    // 초기화
    init: async function() {
        console.log('NofeeAI 초기화 시작');
        
        // DOM 요소 찾기
        this.chatContainer = document.getElementById('nofee-chat-container');
        if (!this.chatContainer) {
            console.error('채팅 컨테이너를 찾을 수 없습니다');
            return;
        }

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 데이터 로드 및 시작
        this.showLoading();
        await this.loadData();
        this.hideLoading();
        this.showIntro();
    },

    // 이벤트 리스너 설정
    setupEventListeners: function() {
        const resetBtn = document.getElementById('nofee-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetChat();
        }
    },

    // 로딩 표시
    showLoading: function() {
        const loadingHTML = `
            <div class="nofee-message-group" id="nofee-loading-message">
                <div class="nofee-loading">
                    <div class="nofee-typing-indicator">
                        <div class="nofee-typing-dot"></div>
                        <div class="nofee-typing-dot"></div>
                        <div class="nofee-typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        this.chatContainer.innerHTML = loadingHTML;
    },

    hideLoading: function() {
        const loading = document.getElementById('nofee-loading-message');
        if (loading) loading.remove();
    },

    // 데이터 로드
    loadData: async function() {
        try {
            // 먼저 CDN에서 시도
            let itemRes = await fetch(this.config.GITHUB_BASE + 'item.json');
            let regionRes = await fetch(this.config.GITHUB_BASE + 'regions.json');
            
            // CDN 실패시 백업 URL 시도
            if (!itemRes.ok || !regionRes.ok) {
                itemRes = await fetch(this.config.BACKUP_BASE + 'item.json');
                regionRes = await fetch(this.config.BACKUP_BASE + 'regions.json');
            }
            
            const itemData = await itemRes.json();
            const regionData = await regionRes.json();
            
            // 데이터 변환 및 저장
            this.state.phoneData = this.transformPhoneData(itemData);
            this.state.regionData = regionData;
            
            console.log('데이터 로드 성공:', this.state.phoneData.length + '개 상품');
            
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            this.showError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    // 상품 데이터 변환
    transformPhoneData: function(rawData) {
        return rawData.map(item => ({
            ...item,
            model: item.Model,
            brand: item.Brand === '삼성' ? 'samsung' : item.Brand === '애플' ? 'apple' : 'other',
            activation: item['Activation Type'],
            carrier: item.Carrier,
            contract: item['Contract Type'],
            total: item['Total Monthly Payment'],
            deviceFee: item['Monthly Device Fee'],
            planFee: item['Monthly Plan Fee'],
            retailPrice: item['Retail Price'],
            hasDiscount: item['Monthly Device Fee'] < 0,
            discount: Math.abs(Math.min(0, item['Monthly Device Fee']))
        }));
    },

    // 인트로 화면 표시
    showIntro: function() {
        const introHTML = `
            <div class="nofee-message-group">
                <div class="nofee-manager-card">
                    <div class="nofee-manager-avatar">AI</div>
                    <div class="nofee-manager-name">노피 AI 매니저</div>
                    <div class="nofee-manager-info">운영시간: 24시간</div>
                    <div class="nofee-manager-info" style="margin-top: 12px; color: #5D5FEF;">
                        <strong>✨ 맞춤 휴대폰 추천 서비스</strong>
                    </div>
                </div>
                
                <div class="nofee-choice-cards">
                    <div class="nofee-choice-card primary" onclick="window.NofeeAI.startConsultation()">
                        <div class="nofee-choice-icon">🤖</div>
                        <div class="nofee-choice-title">AI 상담</div>
                        <div class="nofee-choice-desc">맞춤 추천받기</div>
                    </div>
                    <div class="nofee-choice-card secondary" onclick="window.NofeeAI.showAllProducts()">
                        <div class="nofee-choice-icon">📱</div>
                        <div class="nofee-choice-title">상품 보기</div>
                        <div class="nofee-choice-desc">전체 상품 확인</div>
                    </div>
                </div>
            </div>
        `;
        
        this.addToChat(introHTML);
    },

    // 상담 시작
    startConsultation: function() {
        this.state.currentStep = 'greeting';
        this.clearChat();
        this.addBotMessage('안녕하세요! 휴대폰 AI 상담사입니다 🙌');
        setTimeout(() => {
            this.addBotMessage('고객님께 딱 맞는 휴대폰을 찾아드릴게요!');
            setTimeout(() => {
                this.askDataUsage();
            }, 1000);
        }, 1000);
    },

    // 데이터 사용량 질문
    askDataUsage: function() {
        this.state.currentStep = 'dataUsage';
        this.addBotMessage('평소 데이터를 얼마나 사용하시나요?');
        
        const optionsHTML = `
            <div class="nofee-button-options">
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleDataUsage('high')">
                    <span class="emoji">📺</span>
                    <span>많이 써요 (무제한 필요)</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleDataUsage('medium')">
                    <span class="emoji">📱</span>
                    <span>보통이에요</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleDataUsage('low')">
                    <span class="emoji">💬</span>
                    <span>적게 써요 (SNS 정도)</span>
                </button>
            </div>
        `;
        
        this.addToChat(optionsHTML);
    },

    // 데이터 사용량 처리
    handleDataUsage: function(level) {
        this.state.userData.dataUsage = level;
        const messages = {
            'high': '무제한 요금제가 필요하시군요! 🚀',
            'medium': '적절한 데이터 요금제로 추천드릴게요! 👍',
            'low': '알뜰한 요금제로 추천드릴게요! 💰'
        };
        
        this.clearOptions();
        this.addUserMessage(level === 'high' ? '많이 써요' : level === 'medium' ? '보통이에요' : '적게 써요');
        this.addBotMessage(messages[level]);
        
        setTimeout(() => {
            this.askPriceRange();
        }, 1000);
    },

    // 가격대 질문
    askPriceRange: function() {
        this.state.currentStep = 'price';
        this.addBotMessage('희망하시는 월 납부 금액대를 선택해주세요');
        
        const optionsHTML = `
            <div class="nofee-button-options">
                <button class="nofee-option-btn" onclick="window.NofeeAI.handlePrice('30000-50000')">
                    <span class="emoji">💵</span>
                    <span>3~5만원</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handlePrice('50000-70000')">
                    <span class="emoji">💵</span>
                    <span>5~7만원</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handlePrice('70000-90000')">
                    <span class="emoji">💵</span>
                    <span>7~9만원</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handlePrice('90000-100000')">
                    <span class="emoji">💵</span>
                    <span>9~10만원</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handlePrice('100000-200000')">
                    <span class="emoji">💵</span>
                    <span>10만원 이상</span>
                </button>
            </div>
        `;
        
        this.addToChat(optionsHTML);
    },

    // 가격 처리
    handlePrice: function(range) {
        this.state.userData.priceRange = range;
        this.clearOptions();
        const [min, max] = range.split('-');
        let displayPrice;
        if (parseInt(min) >= 100000) {
            displayPrice = '10만원 이상';
        } else {
            displayPrice = `${parseInt(min)/10000}~${parseInt(max)/10000}만원`;
        }
        this.addUserMessage(displayPrice);
        this.addBotMessage('좋습니다! 다음 질문으로 넘어갈게요.');
        
        setTimeout(() => {
            this.askBrand();
        }, 1000);
    },

    // 브랜드 질문
    askBrand: function() {
        this.state.currentStep = 'brand';
        this.addBotMessage('선호하시는 브랜드가 있으신가요?');
        
        const optionsHTML = `
            <div class="nofee-button-options">
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleBrand('apple')">
                    <span class="emoji">🍎</span>
                    <span>애플</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleBrand('samsung')">
                    <span class="emoji">🤖</span>
                    <span>삼성</span>
                </button>
                <button class="nofee-option-btn" onclick="window.NofeeAI.handleBrand('other')">
                    <span class="emoji">🌟</span>
                    <span>상관없어요</span>
                </button>
            </div>
        `;
        
        this.addToChat(optionsHTML);
    },

    // 브랜드 처리
    handleBrand: function(brand) {
        this.state.userData.brand = brand;
        this.clearOptions();
        const brandNames = {
            'apple': '애플',
            'samsung': '삼성',
            'other': '상관없어요'
        };
        this.addUserMessage(brandNames[brand]);
        
        // 타이핑 인디케이터 표시
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            this.showRecommendations();
        }, 2000);
    },

    // 추천 결과 표시
    showRecommendations: function() {
        this.addBotMessage('고객님께 딱 맞는 상품을 찾았어요! ✨');
        
        // 필터링
        let filtered = [...this.state.phoneData];
        
        // 가격 필터
        if (this.state.userData.priceRange) {
            const [min, max] = this.state.userData.priceRange.split('-').map(Number);
            filtered = filtered.filter(p => p.total >= min && p.total <= max);
        }
        
        // 브랜드 필터
        if (this.state.userData.brand !== 'other') {
            filtered = filtered.filter(p => p.brand === this.state.userData.brand);
        }
        
        // 중복 제거 (모델명, 통신사 기준)
        const seen = new Set();
        filtered = filtered.filter(p => {
            const key = `${p.model}-${p.carrier}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        // 정렬 (할인이 큰 순서로)
        filtered.sort((a, b) => {
            const scoreA = a.hasDiscount ? a.discount : 0;
            const scoreB = b.hasDiscount ? b.discount : 0;
            return scoreB - scoreA;
        });
        
        // 상위 5개만 표시
        const recommendations = filtered.slice(0, 5);
        
        if (recommendations.length === 0) {
            this.addBotMessage('조건에 맞는 상품이 없어요 😢 다른 조건으로 다시 찾아볼까요?');
            this.showRetryButton();
            return;
        }
        
        // 상품 카드 표시
        setTimeout(() => {
            const productsHTML = `
                <div class="nofee-message-group">
                    ${recommendations.map((phone, index) => `
                        <div class="nofee-product-card" onclick="window.NofeeAI.selectProduct(${index})">
                            <div class="nofee-product-header">
                                <div class="nofee-product-title">${phone.model}</div>
                                ${phone.hasDiscount ? '<div class="nofee-product-badge">특가</div>' : ''}
                            </div>
                            <div class="nofee-product-details">${phone.activation} · ${phone.carrier} · ${phone.contract}</div>
                            <div class="nofee-product-price">월 ${this.formatPrice(phone.total)}원</div>
                            ${phone.hasDiscount ? `<div class="nofee-product-discount">🎉 ${this.formatPrice(phone.discount)}원 추가 할인!</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            
            // 전역 변수에 저장
            window.NofeeAI.currentRecommendations = recommendations;
            
            this.addToChat(productsHTML);
        }, 1000);
    },

    // 상품 선택
    selectProduct: function(index) {
        const product = this.currentRecommendations[index];
        this.state.selectedProduct = product;
        
        this.clearOptions();
        this.addUserMessage(product.model + ' 선택');
        
        let message = `좋은 선택이세요! 👍\n\n`;
        message += `📱 ${product.model}\n`;
        message += `📝 ${product.activation} · ${product.carrier} · ${product.contract}\n`;
        message += `💰 월 ${this.formatPrice(product.total)}원`;
        if (product.hasDiscount) {
            message += `\n🎉 추가 할인 ${this.formatPrice(product.discount)}원 적용!`;
        }
        
        this.addBotMessage(message);
        
        setTimeout(() => {
            this.addBotMessage('지금 바로 신청하시겠어요?');
            const optionsHTML = `
                <div class="nofee-button-options">
                    <button class="nofee-option-btn" onclick="window.NofeeAI.startPurchase()">
                        <span class="emoji">✅</span>
                        <span>네, 신청할게요</span>
                    </button>
                    <button class="nofee-option-btn" onclick="window.NofeeAI.showMoreProducts()">
                        <span class="emoji">🔄</span>
                        <span>다른 상품 보기</span>
                    </button>
                </div>
            `;
            this.addToChat(optionsHTML);
        }, 1000);
    },

    // 구매 시작
    startPurchase: function() {
        this.clearOptions();
        this.addUserMessage('네, 신청할게요');
        this.addBotMessage('좋습니다! 신청을 위해 몇 가지 정보가 필요해요.');
        
        setTimeout(() => {
            this.askCustomerName();
        }, 1000);
    },

    // 고객 이름 요청
    askCustomerName: function() {
        this.addBotMessage('먼저 성함을 알려주세요.');
        this.showInputField('text', '홍길동', (value) => {
            if (value.length < 2) {
                alert('정확한 성함을 입력해주세요.');
                return false;
            }
            this.state.userData.name = value;
            this.handleCustomerName();
        });
    },

    // 고객 이름 처리
    handleCustomerName: function() {
        this.clearOptions();
        this.addUserMessage(this.state.userData.name);
        this.askCustomerPhone();
    },

    // 전화번호 요청
    askCustomerPhone: function() {
        this.addBotMessage('연락 가능한 휴대폰 번호를 입력해주세요.\n(\'-\' 없이 숫자만)');
        this.showInputField('tel', '01012345678', (value) => {
            if (!/^01[0-9]{8,9}$/.test(value)) {
                alert('올바른 전화번호 형식이 아니에요.');
                return false;
            }
            this.state.userData.phone = value;
            this.handleCustomerPhone();
        });
    },

    // 전화번호 처리
    handleCustomerPhone: function() {
        this.clearOptions();
        this.addUserMessage(this.state.userData.phone);
        this.askRegion();
    },

    // 지역 선택
    askRegion: function() {
        this.addBotMessage('거주하시는 지역(시/도)을 선택해주세요.');
        
        const regions = this.state.regionData.map(r => r.name);
        const optionsHTML = `
            <div class="nofee-button-options" style="max-height: 300px; overflow-y: auto;">
                ${regions.map(region => `
                    <button class="nofee-option-btn" onclick="window.NofeeAI.handleRegion('${region}')">
                        <span>${region}</span>
                    </button>
                `).join('')}
            </div>
        `;
        this.addToChat(optionsHTML);
    },

    // 지역 처리
    handleRegion: function(region) {
        this.state.userData.region = region;
        this.clearOptions();
        this.addUserMessage(region);
        
        const regionData = this.state.regionData.find(r => r.name === region);
        if (regionData && regionData.districts.length > 0) {
            this.askDistrict(regionData.districts);
        } else {
            this.state.userData.district = region;
            this.askConsent();
        }
    },

    // 구/군 선택
    askDistrict: function(districts) {
        this.addBotMessage('세부 지역(구/군)을 선택해주세요.');
        
        const optionsHTML = `
            <div class="nofee-button-options" style="max-height: 300px; overflow-y: auto;">
                ${districts.map(district => `
                    <button class="nofee-option-btn" onclick="window.NofeeAI.handleDistrict('${district}')">
                        <span>${district}</span>
                    </button>
                `).join('')}
            </div>
        `;
        this.addToChat(optionsHTML);
    },

    // 구/군 처리
    handleDistrict: function(district) {
        this.state.userData.district = district;
        this.clearOptions();
        this.addUserMessage(district);
        this.askConsent();
    },

    // 개인정보 동의
    askConsent: function() {
        this.addBotMessage('마지막으로 개인정보 수집·이용에 동의해주세요.');
        
        const consentHTML = `
            <div class="nofee-message-group">
                <div class="nofee-consent-box">
                    <a href="https://nofee.team/policy" target="_blank" class="nofee-consent-link">
                        📄 개인정보 처리방침 확인하기
                    </a>
                    <div class="nofee-consent-details">
                        <strong>수집 항목:</strong> 성명, 휴대폰 번호, 지역<br>
                        <strong>수집 목적:</strong> 휴대폰 구매 상담 및 계약 진행<br>
                        <strong>보유기간:</strong> 서비스 제공 완료 후 1년
                    </div>
                </div>
                <div class="nofee-button-options">
                    <button class="nofee-option-btn" onclick="window.NofeeAI.handleConsent(true)">
                        <span class="emoji">✅</span>
                        <span>동의합니다</span>
                    </button>
                    <button class="nofee-option-btn" onclick="window.NofeeAI.handleConsent(false)">
                        <span class="emoji">❌</span>
                        <span>동의하지 않습니다</span>
                    </button>
                </div>
            </div>
        `;
        this.addToChat(consentHTML);
    },

    // 동의 처리
    handleConsent: function(agreed) {
        this.clearOptions();
        this.addUserMessage(agreed ? '동의합니다' : '동의하지 않습니다');
        
        if (agreed) {
            this.showTypingIndicator();
            setTimeout(() => {
                this.hideTypingIndicator();
                this.addBotMessage('감사합니다! 신청이 완료되었습니다 🎉');
                setTimeout(() => {
                    this.addBotMessage('곧 전문 상담사가 연락드릴 예정이에요.\n노피를 이용해주셔서 감사합니다! 💙');
                    this.showCompleteButtons();
                }, 1000);
            }, 2000);
            
            // 여기서 실제 폼 제출 로직 실행
            this.submitApplication();
        } else {
            this.addBotMessage('개인정보 동의 없이는 진행이 어려워요.\n다음에 다시 이용해주세요!');
            this.showRetryButton();
        }
    },

    // 신청 제출
    submitApplication: function() {
        const product = this.state.selectedProduct;
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 폼 필드 채우기
        document.getElementById('customer_name').value = this.state.userData.name;
        document.getElementById('customer_phone').value = this.state.userData.phone;
        document.getElementById('customer_region').value = this.state.userData.region;
        document.getElementById('customer_district').value = this.state.userData.district;
        document.getElementById('privacy_consent').value = '동의함';
        
        document.getElementById('phone_model').value = product.model;
        document.getElementById('phone_brand').value = product.Brand;
        document.getElementById('phone_storage').value = product.Storage || '';
        document.getElementById('phone_carrier').value = product.carrier;
        document.getElementById('activation_type').value = product.activation;
        document.getElementById('contract_type').value = product.contract;
        
        document.getElementById('retail_price').value = product.retailPrice || 0;
        document.getElementById('monthly_device_fee').value = product.deviceFee || 0;
        document.getElementById('monthly_plan_fee').value = product.planFee || 0;
        document.getElementById('total_monthly_payment').value = product.total || 0;
        document.getElementById('extra_discount').value = product.discount || 0;
        
        document.getElementById('timestamp').value = new Date().toISOString();
        document.getElementById('session_id').value = sessionId;
        document.getElementById('product_json').value = JSON.stringify(product);
        
        // 폼 제출
        const form = document.getElementById('nofee-form');
        if (form) {
            console.log('폼 제출:', {
                customer: this.state.userData,
                product: product,
                sessionId: sessionId
            });
            
            // 실제 환경에서는 form.submit(); 을 호출
            // form.submit();
        }
    },

    // 메시지 추가 함수들
    addBotMessage: function(text) {
        const messageHTML = `
            <div class="nofee-message-group">
                <div class="nofee-message bot">
                    <div class="nofee-message-avatar">AI</div>
                    <div class="nofee-message-bubble">${text}</div>
                </div>
            </div>
        `;
        this.addToChat(messageHTML);
    },

    addUserMessage: function(text) {
        const messageHTML = `
            <div class="nofee-message-group">
                <div class="nofee-message user">
                    <div class="nofee-message-avatar">나</div>
                    <div class="nofee-message-bubble">${text}</div>
                </div>
            </div>
        `;
        this.addToChat(messageHTML);
    },

    // 채팅에 추가 (최신 메시지가 위로)
    addToChat: function(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        this.chatContainer.insertBefore(tempDiv.firstElementChild, this.chatContainer.firstChild);
    },

    // 옵션 지우기
    clearOptions: function() {
        const options = this.chatContainer.querySelectorAll('.nofee-button-options, .nofee-choice-cards, #nofee-input-field, .nofee-consent-box');
        options.forEach(opt => opt.parentElement.remove());
    },

    // 채팅 초기화
    clearChat: function() {
        this.chatContainer.innerHTML = '';
    },

    // 타이핑 인디케이터
    showTypingIndicator: function() {
        const typingHTML = `
            <div class="nofee-message-group" id="nofee-typing-indicator">
                <div class="nofee-message bot">
                    <div class="nofee-message-avatar">AI</div>
                    <div class="nofee-message-bubble">
                        <div class="nofee-typing-indicator">
                            <div class="nofee-typing-dot"></div>
                            <div class="nofee-typing-dot"></div>
                            <div class="nofee-typing-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.addToChat(typingHTML);
    },

    hideTypingIndicator: function() {
        const indicator = document.getElementById('nofee-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    // 입력 필드 표시
    showInputField: function(type, placeholder, callback) {
        const inputHTML = `
            <div class="nofee-message-group" id="nofee-input-field">
                <div class="nofee-input-group">
                    <input type="${type}" 
                           placeholder="${placeholder}" 
                           id="nofee-user-input"
                           class="nofee-input-field"
                           onkeypress="if(event.key === 'Enter') document.getElementById('nofee-submit-btn').click()">
                    <button id="nofee-submit-btn"
                            class="nofee-submit-btn"
                            onclick="window.NofeeAI.submitInput()">
                        확인
                    </button>
                </div>
            </div>
        `;
        
        window.NofeeAI.currentInputCallback = callback;
        this.addToChat(inputHTML);
        
        setTimeout(() => {
            document.getElementById('nofee-user-input').focus();
        }, 100);
    },

    // 입력 제출
    submitInput: function() {
        const input = document.getElementById('nofee-user-input');
        const value = input.value.trim();
        
        if (value && this.currentInputCallback) {
            const result = this.currentInputCallback(value);
            if (result !== false) {
                document.getElementById('nofee-input-field').remove();
            }
        }
    },

    // 유틸리티 함수들
    formatPrice: function(price) {
        return price.toLocaleString('ko-KR');
    },

    showError: function(message) {
        const errorHTML = `
            <div class="nofee-message-group">
                <div class="nofee-message bot">
                    <div class="nofee-message-avatar">AI</div>
                    <div class="nofee-message-bubble" style="border-color: #FF6B6B;">
                        ❌ ${message}
                    </div>
                </div>
            </div>
        `;
        this.addToChat(errorHTML);
    },

    showRetryButton: function() {
        const optionsHTML = `
            <div class="nofee-button-options">
                <button class="nofee-option-btn" onclick="window.NofeeAI.resetChat()">
                    <span class="emoji">🔄</span>
                    <span>처음부터 다시 시작</span>
                </button>
            </div>
        `;
        this.addToChat(optionsHTML);
    },

    showCompleteButtons: function() {
        const optionsHTML = `
            <div class="nofee-button-options">
                <button class="nofee-option-btn" onclick="window.NofeeAI.resetChat()">
                    <span class="emoji">🏠</span>
                    <span>처음으로 돌아가기</span>
                </button>
            </div>
        `;
        this.addToChat(optionsHTML);
    },

    showMoreProducts: function() {
        this.clearOptions();
        this.addUserMessage('다른 상품 보기');
        this.resetChat();
    },

    showAllProducts: function() {
        this.clearChat();
        this.addBotMessage('전체 상품 목록을 보여드릴게요.');
        
        setTimeout(() => {
            const allProducts = this.state.phoneData.slice(0, 20);
            const productsHTML = `
                <div class="nofee-message-group">
                    ${allProducts.map((phone, index) => `
                        <div class="nofee-product-card" onclick="window.NofeeAI.selectProductDirect(${index})">
                            <div class="nofee-product-header">
                                <div class="nofee-product-title">${phone.model}</div>
                                ${phone.hasDiscount ? '<div class="nofee-product-badge">특가</div>' : ''}
                            </div>
                            <div class="nofee-product-details">${phone.activation} · ${phone.carrier} · ${phone.contract}</div>
                            <div class="nofee-product-price">월 ${this.formatPrice(phone.total)}원</div>
                        </div>
                    `).join('')}
                </div>
            `;
            window.NofeeAI.allProducts = allProducts;
            this.addToChat(productsHTML);
        }, 500);
    },

    selectProductDirect: function(index) {
        const product = this.allProducts[index];
        this.state.selectedProduct = product;
        this.currentRecommendations = [product];
        this.selectProduct(0);
    },

    // 채팅 리셋
    resetChat: function() {
        this.state.currentStep = 'intro';
        this.state.userData = {
            name: '',
            phone: '',
            dataUsage: '',
            priceRange: '',
            brand: '',
            preference: '',
            region: '',
            district: ''
        };
        this.state.selectedProduct = null;
        this.clearChat();
        this.showIntro();
    }
};

console.log('Nofee AI main.js 로드 완료');
