// 노피 AI 챗봇 - main.js
(function() {
    'use strict';
    
    // 전역 네임스페이스
    window.NofeeAI = {
        // 상태 관리
        state: {
            initialized: false,
            currentStep: 'intro',
            chatContainer: null,
            phoneData: [],
            regionData: [],
            filters: {
                priceRange: null,
                carrier: null,
                brand: null
            },
            selectedPhone: null,
            customerInfo: {
                name: '',
                phone: '',
                region: '',
                district: '',
                consent: false
            },
            sessionId: null,
            messageHistory: []
        },
        
        // GitHub CDN URLs
        config: {
            GITHUB_CDN_URL: 'https://cdn.jsdelivr.net/gh/Jacob-PO/nofee_chat@main/',
            BACKUP_URL: 'https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/',
            TYPING_SPEED: 30,
            AI_THINKING_DELAY: 1000
        },
        
        // 초기화
        init: async function() {
            if (this.state.initialized) return;
            
            console.log('노피 AI 초기화 시작...');
            
            this.state.chatContainer = document.getElementById('nofeeChat');
            if (!this.state.chatContainer) {
                console.error('채팅 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            // 세션 ID 생성
            this.state.sessionId = this.utils.generateSessionId();
            
            // URL 파라미터 체크
            this.checkUrlParams();
            
            // 데이터 로드
            await this.loadData();
            
            // 첫 인사
            await this.utils.delay(500);
            await this.showGreeting();
            
            // 키보드 이벤트
            this.setupKeyboardEvents();
            
            this.state.initialized = true;
            console.log('노피 AI 초기화 완료');
        },
        
        // 데이터 로드
        loadData: async function() {
            try {
                this.showAIThinking('데이터를 불러오는 중');
                
                const [phoneData, regionData] = await Promise.all([
                    this.fetchWithFallback('item.json'),
                    this.fetchWithFallback('regions.json')
                ]);
                
                this.state.phoneData = phoneData || [];
                this.state.regionData = regionData || [];
                
                console.log(`휴대폰 데이터: ${this.state.phoneData.length}개`);
                console.log(`지역 데이터: ${this.state.regionData.length}개`);
                
                this.hideAIThinking();
            } catch (error) {
                console.error('데이터 로드 실패:', error);
                this.hideAIThinking();
                this.addBotMessage('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
        },
        
        // Fallback 포함 데이터 가져오기
        fetchWithFallback: async function(filename) {
            try {
                const response = await fetch(this.config.GITHUB_CDN_URL + filename);
                if (!response.ok) throw new Error('Primary fetch failed');
                return await response.json();
            } catch (error) {
                console.log('Primary URL 실패, 백업 URL 시도중...');
                try {
                    const response = await fetch(this.config.BACKUP_URL + filename);
                    return await response.json();
                } catch (backupError) {
                    console.error('백업 URL도 실패:', backupError);
                    return null;
                }
            }
        },
        
        // 인사 메시지
        showGreeting: async function() {
            await this.addBotMessage('안녕하세요! 저는 노피 AI 매니저입니다 💙');
            await this.utils.delay(300);
            await this.addBotMessage('전국 어디서나 휴대폰 성지 가격으로!\n중고차 매물을 찾듯, 최고의 조건을 찾아드릴게요.');
            await this.utils.delay(500);
            
            this.showInitialOptions();
        },
        
        // 초기 옵션 표시
        showInitialOptions: function() {
            const optionsHTML = `
                <div class="nofee-message">
                    <div class="nofee-options-grid">
                        <div class="nofee-option-card blue" onclick="NofeeAI.startPhoneSelection('self')">
                            <h4>맞춤 추천 😎</h4>
                            <p>내 조건에 맞는 휴대폰 찾기</p>
                            <div class="nofee-option-icon">🎯</div>
                        </div>
                        <div class="nofee-option-card green" onclick="NofeeAI.startPhoneSelection('best')">
                            <h4>베스트 상품 🏆</h4>
                            <p>지금 가장 인기있는 상품</p>
                            <div class="nofee-option-icon">🔥</div>
                        </div>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', optionsHTML);
            this.scrollToBottom();
        },
        
        // 휴대폰 선택 시작
        startPhoneSelection: async function(type) {
            this.state.currentStep = 'price';
            
            if (type === 'self') {
                await this.addUserMessage('맞춤 추천');
                await this.showAIThinking('최적의 상품을 찾기 위해 분석 중');
                await this.addBotMessage('좋은 선택이에요! 😊\n몇 가지만 여쭤볼게요.');
            } else {
                await this.addUserMessage('베스트 상품');
                await this.showAIThinking('인기 상품 분석 중');
                await this.addBotMessage('지금 가장 핫한 상품들을 보여드릴게요! 🔥');
            }
            
            await this.utils.delay(300);
            this.askPriceRange();
        },
        
        // 가격대 질문
        askPriceRange: async function() {
            await this.addBotMessage('원하시는 월 납부금액대를 선택해주세요.');
            
            const priceRanges = [
                { label: '3만원 이하', value: '0-30000', emoji: '💰' },
                { label: '3-5만원', value: '30000-50000', emoji: '💵' },
                { label: '5-10만원', value: '50000-100000', emoji: '💸' },
                { label: '10만원 이상', value: '100000-9999999', emoji: '💎' }
            ];
            
            this.showChoiceButtons(priceRanges, (selected) => {
                this.state.filters.priceRange = selected.value;
                this.selectPrice(selected);
            });
        },
        
        // 가격 선택
        selectPrice: async function(selected) {
            await this.addUserMessage(selected.label);
            this.state.currentStep = 'carrier';
            
            await this.showAIThinking('통신사별 혜택 분석 중');
            await this.addBotMessage('어느 통신사를 사용하시나요? 📡');
            
            this.askCarrier();
        },
        
        // 통신사 질문
        askCarrier: function() {
            const carriers = [
                { label: 'SKT', value: 'SK', color: '#f53d3d' },
                { label: 'KT', value: 'KT', color: '#0070f3' },
                { label: 'LG U+', value: 'LG', color: '#e91e63' },
                { label: '상관없음', value: 'all', color: '#666' }
            ];
            
            const buttonsHTML = `
                <div class="nofee-message">
                    <div class="nofee-choice-buttons">
                        ${carriers.map(carrier => `
                            <button class="nofee-choice-btn" 
                                    onclick="NofeeAI.selectCarrier('${carrier.value}', '${carrier.label}')"
                                    style="border-color: ${carrier.color}; color: ${carrier.color};">
                                ${carrier.label}
                            </button>
                        `).join('')}
                    </div>
                    ${this.createBackButton()}
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', buttonsHTML);
            this.scrollToBottom();
        },
        
        // 통신사 선택
        selectCarrier: async function(value, label) {
            await this.addUserMessage(label);
            this.state.filters.carrier = value;
            this.state.currentStep = 'brand';
            
            await this.showAIThinking('브랜드별 상품 매칭 중');
            await this.addBotMessage('선호하는 브랜드가 있으신가요? 📱');
            
            this.askBrand();
        },
        
        // 브랜드 질문
        askBrand: function() {
            const brands = [
                { label: '삼성', value: '삼성', emoji: '🇰🇷' },
                { label: '애플', value: '애플', emoji: '🍎' },
                { label: 'LG', value: 'LG', emoji: '📱' },
                { label: '기타', value: '기타', emoji: '📱' },
                { label: '상관없음', value: 'all', emoji: '🤷' }
            ];
            
            this.showChoiceButtons(brands.map(b => ({
                ...b,
                label: `${b.emoji} ${b.label}`
            })), (selected) => {
                const brand = brands.find(b => `${b.emoji} ${b.label}` === selected.label);
                this.state.filters.brand = brand.value;
                this.selectBrand(brand);
            });
        },
        
        // 브랜드 선택 및 결과
        selectBrand: async function(brand) {
            await this.addUserMessage(brand.label);
            this.state.currentStep = 'results';
            
            await this.showAIThinking('맞춤 상품 검색 중');
            await this.utils.delay(1500);
            
            this.showFilteredPhones();
        },
        
        // 필터링된 휴대폰 표시
        showFilteredPhones: async function() {
            let filtered = [...this.state.phoneData];
            
            // 가격 필터링
            if (this.state.filters.priceRange && this.state.filters.priceRange !== 'all') {
                const [min, max] = this.state.filters.priceRange.split('-').map(Number);
                filtered = filtered.filter(phone => {
                    const monthlyPayment = phone['Total Monthly Payment'] || 0;
                    return monthlyPayment >= min && monthlyPayment <= max;
                });
            }
            
            // 통신사 필터링
            if (this.state.filters.carrier && this.state.filters.carrier !== 'all') {
                filtered = filtered.filter(phone => phone.Carrier === this.state.filters.carrier);
            }
            
            // 브랜드 필터링
            if (this.state.filters.brand && this.state.filters.brand !== 'all') {
                filtered = filtered.filter(phone => phone.Brand === this.state.filters.brand);
            }
            
            // 중복 제거 및 정렬
            const uniquePhones = this.utils.getUniquePhones(filtered);
            const displayPhones = uniquePhones.slice(0, 5);
            
            if (displayPhones.length === 0) {
                await this.addBotMessage('조건에 맞는 휴대폰이 없습니다. 😢\n다른 조건으로 다시 검색해보시겠어요?');
                this.showRetryButton();
                return;
            }
            
            await this.addBotMessage(`조건에 맞는 휴대폰 ${displayPhones.length}개를 찾았어요! 🎉`);
            
            const phonesHTML = `
                <div class="nofee-message">
                    ${displayPhones.map((phone, index) => `
                        <div class="nofee-phone-card" onclick="NofeeAI.selectPhone(${index})">
                            <div class="nofee-phone-header">
                                <div class="nofee-phone-info">
                                    <h4>${phone.Model}</h4>
                                    <p>${phone.Storage || '128GB'} | ${phone.Plan || '5G 베이직'}</p>
                                </div>
                                <div class="nofee-carrier-badge ${this.utils.getCarrierClass(phone.Carrier)}">
                                    ${phone.Carrier}
                                </div>
                            </div>
                            <div class="nofee-price-info">
                                <div class="nofee-price-item">
                                    <div class="nofee-price-label">정가</div>
                                    <div class="nofee-price-value">${this.utils.formatPrice(phone['Retail Price'])}원</div>
                                </div>
                                <div class="nofee-price-item">
                                    <div class="nofee-price-label">월 납부금</div>
                                    <div class="nofee-price-value highlight">${this.utils.formatPrice(phone['Total Monthly Payment'])}원</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${this.createBackButton()}
                </div>
            `;
            
            // 전역 변수에 저장
            window.NofeeDisplayedPhones = displayPhones;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', phonesHTML);
            this.scrollToBottom();
        },
        
        // 휴대폰 선택
        selectPhone: async function(index) {
            const phone = window.NofeeDisplayedPhones[index];
            this.state.selectedPhone = phone;
            this.state.currentStep = 'purchase';
            
            await this.addUserMessage(`${phone.Model} 선택`);
            await this.showAIThinking('상품 정보 확인 중');
            await this.addBotMessage(`${phone.Model}을 선택하셨네요! 훌륭한 선택이에요! 👍`);
            
            // 체크리스트 표시
            const checklistHTML = `
                <div class="nofee-message">
                    <div class="nofee-checklist">
                        <div class="nofee-checklist-item">
                            <span class="check">✓</span> 전국 최저가 보장
                        </div>
                        <div class="nofee-checklist-item">
                            <span class="check">✓</span> 정품 새제품 100%
                        </div>
                        <div class="nofee-checklist-item">
                            <span class="check">✓</span> 안전 결제 시스템
                        </div>
                        <div class="nofee-checklist-item">
                            <span class="check">✓</span> 전문 상담사 1:1 케어
                        </div>
                    </div>
                    <div class="nofee-choice-buttons" style="margin-top: 20px;">
                        <button class="nofee-choice-btn" onclick="NofeeAI.startPurchase()">
                            🛒 구매 신청하기
                        </button>
                        <button class="nofee-choice-btn" onclick="NofeeAI.showPhoneList()">
                            📱 다른 휴대폰 보기
                        </button>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', checklistHTML);
            this.scrollToBottom();
        },
        
        // 구매 시작
        startPurchase: async function() {
            this.state.currentStep = 'customer_name';
            
            await this.addUserMessage('구매 신청하기');
            await this.showAIThinking('신청서 준비 중');
            await this.addBotMessage('구매 신청을 도와드릴게요! 📝\n먼저 성함을 알려주세요.');
            
            this.showInputField('text', '홍길동', (value) => {
                this.state.customerInfo.name = value;
                this.askPhone();
            });
        },
        
        // 전화번호 입력
        askPhone: async function() {
            this.state.currentStep = 'customer_phone';
            
            await this.showAIThinking('연락처 입력 준비');
            await this.addBotMessage('연락 가능한 전화번호를 입력해주세요.\n("-" 없이 숫자만 입력)');
            
            this.showInputField('tel', '01012345678', (value) => {
                if (!this.utils.validatePhone(value)) {
                    this.showError('올바른 전화번호를 입력해주세요');
                    return false;
                }
                this.state.customerInfo.phone = value;
                this.askRegion();
            });
        },
        
        // 지역 선택
        askRegion: async function() {
            this.state.currentStep = 'customer_region';
            
            await this.showAIThinking('지역 정보 확인');
            await this.addBotMessage('거주 중이신 시/도를 선택해주세요.');
            
            const regions = this.state.regionData.map(r => r.name);
            
            this.showSelectField(regions, (value) => {
                this.state.customerInfo.region = value;
                this.askDistrict();
            });
        },
        
        // 구/군 선택
        askDistrict: async function() {
            this.state.currentStep = 'customer_district';
            
            const region = this.state.regionData.find(r => r.name === this.state.customerInfo.region);
            const districts = region ? region.districts : [];
            
            if (districts.length === 0) {
                this.state.customerInfo.district = this.state.customerInfo.region;
                this.askConsent();
                return;
            }
            
            await this.showAIThinking('세부 지역 확인');
            await this.addBotMessage('구/군을 선택해주세요.');
            
            this.showSelectField(districts, (value) => {
                this.state.customerInfo.district = value;
                this.askConsent();
            });
        },
        
        // 개인정보 동의
        askConsent: async function() {
            this.state.currentStep = 'consent';
            
            await this.showAIThinking('마지막 단계');
            await this.addBotMessage('개인정보 수집 및 이용에 동의하십니까?');
            
            const consentHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <a href="/privacy" target="_blank" class="nofee-privacy-link">
                            개인정보 처리방침 보기
                        </a>
                        <div class="nofee-choice-buttons">
                            <button class="nofee-choice-btn" onclick="NofeeAI.handleConsent(true)">
                                동의합니다
                            </button>
                            <button class="nofee-choice-btn" onclick="NofeeAI.handleConsent(false)">
                                동의하지 않습니다
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', consentHTML);
            this.scrollToBottom();
        },
        
        // 동의 처리
        handleConsent: async function(agreed) {
            if (agreed) {
                await this.addUserMessage('동의합니다');
                this.state.customerInfo.consent = true;
                
                await this.showAIThinking('신청 접수 중');
                
                // 폼 데이터 채우기
                this.fillFormData();
                
                // 제출
                this.submitForm();
                
                // 성공 메시지
                await this.addBotMessage('신청이 완료되었습니다! 🎉');
                await this.utils.delay(300);
                await this.addBotMessage('담당 매니저가 곧 연락드릴 예정입니다.\n노피를 선택해주셔서 감사합니다! 💙');
                
                this.showSuccessAnimation();
            } else {
                await this.addUserMessage('동의하지 않습니다');
                await this.addBotMessage('개인정보 동의 없이는 진행할 수 없습니다.\n메인 페이지로 돌아가시겠어요?');
                
                this.showChoiceButtons([
                    { label: '네', value: 'yes' },
                    { label: '아니요', value: 'no' }
                ], (selected) => {
                    if (selected.value === 'yes') {
                        window.location.href = '/';
                    } else {
                        this.askConsent();
                    }
                });
            }
        },
        
        // 폼 데이터 채우기
        fillFormData: function() {
            const data = {
                customer_name: this.state.customerInfo.name,
                customer_phone: this.state.customerInfo.phone,
                customer_region: this.state.customerInfo.region,
                customer_district: this.state.customerInfo.district,
                privacy_consent: '동의함',
                phone_model: this.state.selectedPhone.Model,
                phone_carrier: this.state.selectedPhone.Carrier,
                phone_plan: this.state.selectedPhone.Plan || '5G 베이직',
                phone_price: this.state.selectedPhone['Retail Price'],
                monthly_payment: this.state.selectedPhone['Total Monthly Payment'],
                contract_type: this.state.selectedPhone['Contract Type'] || '공시지원',
                activation_type: this.state.selectedPhone['Activation Type'] || '신규',
                timestamp: new Date().toISOString(),
                session_id: this.state.sessionId,
                utm_source: this.utils.getUrlParam('utm_source') || 'direct',
                utm_medium: this.utils.getUrlParam('utm_medium') || 'none',
                utm_campaign: this.utils.getUrlParam('utm_campaign') || 'none'
            };
            
            console.log('폼 데이터:', data);
            
            // 폼 필드 채우기
            Object.entries(data).forEach(([key, value]) => {
                const field = document.getElementById(key);
                if (field && value !== undefined && value !== null) {
                    field.value = value;
                }
            });
        },
        
        // 폼 제출
        submitForm: function() {
            setTimeout(() => {
                const form = document.getElementById('nofee-purchase-form');
                if (!form) {
                    console.error('폼을 찾을 수 없습니다');
                    return;
                }
                
                // Submit 버튼 클릭
                const submitBtn = form.querySelector('input[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    console.log('폼 제출 완료');
                }
            }, 300);
        },
        
        // 메시지 추가 함수들
        addBotMessage: async function(text) {
            const messageHTML = `
                <div class="nofee-message">
                    <div class="nofee-bot-message">
                        <div class="nofee-bot-avatar">🤖</div>
                        <div class="nofee-bot-info">
                            <div class="nofee-bot-name">노피 AI (bot)</div>
                            <div class="nofee-message-bubble" id="msg-${Date.now()}"></div>
                        </div>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.scrollToBottom();
            
            // 타이핑 효과
            const bubble = this.state.chatContainer.querySelector(`#msg-${Date.now()}`);
            if (bubble) {
                await this.typeText(bubble, text);
            }
            
            // 메시지 히스토리 저장
            this.state.messageHistory.push({ type: 'bot', text, time: Date.now() });
        },
        
        addUserMessage: async function(text) {
            const messageHTML = `
                <div class="nofee-message">
                    <div class="nofee-user-message">
                        <div class="nofee-message-bubble">${text}</div>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.scrollToBottom();
            
            // 메시지 히스토리 저장
            this.state.messageHistory.push({ type: 'user', text, time: Date.now() });
            
            await this.utils.delay(300);
        },
        
        // AI 생각중 표시
        showAIThinking: async function(text = 'AI가 분석 중입니다') {
            const thinking = document.getElementById('aiThinking');
            if (thinking) {
                thinking.querySelector('.nofee-ai-thinking-text').textContent = text + '...';
                thinking.classList.add('show');
                
                await this.utils.delay(this.config.AI_THINKING_DELAY);
            }
        },
        
        hideAIThinking: function() {
            const thinking = document.getElementById('aiThinking');
            if (thinking) {
                thinking.classList.remove('show');
            }
        },
        
        // 선택 버튼 표시
        showChoiceButtons: function(options, callback) {
            const buttonsHTML = `
                <div class="nofee-message">
                    <div class="nofee-choice-buttons">
                        ${options.map(option => `
                            <button class="nofee-choice-btn" data-value="${option.value}">
                                ${option.label}
                            </button>
                        `).join('')}
                    </div>
                    ${this.state.currentStep !== 'intro' ? this.createBackButton() : ''}
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', buttonsHTML);
            
            // 이벤트 리스너 추가
            const buttons = this.state.chatContainer.querySelectorAll('.nofee-choice-btn[data-value]');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-value');
                    const option = options.find(o => o.value === value);
                    if (callback) callback(option);
                });
            });
            
            this.scrollToBottom();
        },
        
        // 입력 필드 표시
        showInputField: function(type, placeholder, callback) {
            const inputHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <input type="${type}" 
                               class="nofee-input-field" 
                               placeholder="${placeholder}"
                               ${type === 'tel' ? 'maxlength="11"' : ''}
                               id="input-${Date.now()}">
                        <button class="nofee-input-btn">입력</button>
                        ${this.createBackButton()}
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', inputHTML);
            
            const input = this.state.chatContainer.querySelector(`#input-${Date.now()}`);
            const button = input.parentElement.querySelector('.nofee-input-btn');
            
            // 자동 포커스
            setTimeout(() => input.focus(), 100);
            
            // 이벤트 리스너
            const handleSubmit = async () => {
                const value = input.value.trim();
                if (!value) {
                    input.classList.add('error');
                    return;
                }
                
                const result = callback(value);
                if (result !== false) {
                    input.parentElement.parentElement.remove();
                    await this.addUserMessage(value);
                }
            };
            
            button.addEventListener('click', handleSubmit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSubmit();
            });
            
            this.scrollToBottom();
        },
        
        // 선택 필드 표시
        showSelectField: function(options, callback) {
            const selectHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <select class="nofee-input-field" id="select-${Date.now()}">
                            <option value="">선택해주세요</option>
                            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>
                        ${this.createBackButton()}
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', selectHTML);
            
            const select = this.state.chatContainer.querySelector(`#select-${Date.now()}`);
            
            select.addEventListener('change', async () => {
                if (select.value) {
                    select.parentElement.parentElement.remove();
                    await this.addUserMessage(select.value);
                    callback(select.value);
                }
            });
            
            this.scrollToBottom();
        },
        
        // 백 버튼 생성
        createBackButton: function() {
            return `<button class="nofee-back-button" onclick="NofeeAI.goBack()">
                ← 이전으로
            </button>`;
        },
        
        // 뒤로가기
        goBack: function() {
            const steps = ['intro', 'price', 'carrier', 'brand', 'results', 'purchase'];
            const currentIndex = steps.indexOf(this.state.currentStep);
            
            if (currentIndex > 0) {
                // 마지막 사용자 메시지와 관련 요소 제거
                const messages = this.state.chatContainer.querySelectorAll('.nofee-message');
                if (messages.length > 2) {
                    messages[messages.length - 1].remove(); // 현재 입력
                    messages[messages.length - 2].remove(); // 사용자 메시지
                }
                
                this.state.currentStep = steps[currentIndex - 1];
                
                // 이전 단계 다시 표시
                switch (this.state.currentStep) {
                    case 'intro':
                        this.showInitialOptions();
                        break;
                    case 'price':
                        this.askPriceRange();
                        break;
                    case 'carrier':
                        this.askCarrier();
                        break;
                    case 'brand':
                        this.askBrand();
                        break;
                }
            }
        },
        
        // 다시 시도 버튼
        showRetryButton: function() {
            const retryHTML = `
                <div class="nofee-message">
                    <button class="nofee-choice-btn" onclick="NofeeAI.resetChat()">
                        🔄 다시 검색하기
                    </button>
                </div>
            `;
            this.state.chatContainer.insertAdjacentHTML('beforeend', retryHTML);
            this.scrollToBottom();
        },
        
        // 성공 애니메이션
        showSuccessAnimation: function() {
            const successHTML = `
                <div class="nofee-message" style="text-align: center;">
                    <div class="nofee-success-icon"></div>
                </div>
            `;
            this.state.chatContainer.insertAdjacentHTML('beforeend', successHTML);
            this.scrollToBottom();
        },
        
        // 에러 표시
        showError: function(message) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #ff4444; font-size: 14px; margin-top: 5px;';
            errorDiv.textContent = message;
            
            const lastInput = this.state.chatContainer.querySelector('.nofee-input-field:last-child');
            if (lastInput) {
                lastInput.classList.add('error');
                lastInput.parentElement.appendChild(errorDiv);
                
                setTimeout(() => errorDiv.remove(), 3000);
            }
        },
        
        // 타이핑 효과
        typeText: async function(element, text) {
            element.textContent = '';
            for (let i = 0; i < text.length; i++) {
                element.textContent += text[i];
                await this.utils.delay(this.config.TYPING_SPEED);
            }
        },
        
        // 스크롤 하단으로
        scrollToBottom: function() {
            this.state.chatContainer.scrollTop = this.state.chatContainer.scrollHeight;
        },
        
        // 리셋
        resetChat: function() {
            this.state = {
                ...this.state,
                currentStep: 'intro',
                filters: {
                    priceRange: null,
                    carrier: null,
                    brand: null
                },
                selectedPhone: null,
                customerInfo: {
                    name: '',
                    phone: '',
                    region: '',
                    district: '',
                    consent: false
                },
                messageHistory: []
            };
            
            this.state.chatContainer.innerHTML = `
                <div class="nofee-intro-section">
                    <div class="nofee-intro-avatar">
                        <span>💙</span>
                    </div>
                    <h2>노피 AI 매니저에 문의하기</h2>
                    <div class="nofee-time-badge" onclick="toggleOperatingHours()">
                        운영시간 보기 ›
                    </div>
                </div>
                <div class="nofee-operating-hours" id="operatingHours">
                    <p>평일: 오전 10:00 - 오후 7:00</p>
                    <p>주말: 오전 11:00 - 오후 6:00</p>
                    <p>공휴일: 휴무</p>
                </div>
            `;
            
            this.showGreeting();
        },
        
        // 휴대폰 목록 보기
        showPhoneList: function() {
            this.resetChat();
        },
        
        // 배송 정보
        showDeliveryInfo: async function() {
            await this.addBotMessage('전국 무료배송! 🚚\n주문 후 1-2일 내 수령 가능합니다.');
        },
        
        // URL 파라미터 체크
        checkUrlParams: function() {
            const params = new URLSearchParams(window.location.search);
            
            // UTM 파라미터 저장
            ['utm_source', 'utm_medium', 'utm_campaign'].forEach(param => {
                const value = params.get(param);
                if (value) {
                    sessionStorage.setItem(param, value);
                }
            });
            
            // 사전 선택된 상품 체크
            const modelName = params.get('model');
            if (modelName) {
                const phone = this.state.phoneData.find(p => p.Model === modelName);
                if (phone) {
                    this.state.selectedPhone = phone;
                    this.state.currentStep = 'purchase';
                    // 바로 구매 플로우로
                    setTimeout(() => this.startPurchase(), 1000);
                }
            }
        },
        
        // 키보드 이벤트 설정
        setupKeyboardEvents: function() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const backBtn = this.state.chatContainer.querySelector('.nofee-back-button:last-child');
                    if (backBtn) backBtn.click();
                }
            });
        },
        
        // 유틸리티 함수들
        utils: {
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            
            formatPrice: (value) => {
                if (!value) return '0';
                return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            },
            
            getCarrierClass: (carrier) => {
                switch(carrier) {
                    case 'SK': return 'skt';
                    case 'KT': return 'kt';
                    case 'LG': return 'lgu';
                    default: return '';
                }
            },
            
            validatePhone: (phone) => {
                const cleaned = phone.replace(/[^0-9]/g, '');
                return /^01[0-9]{8,9}$/.test(cleaned);
            },
            
            getUniquePhones: (phones) => {
                const seen = new Set();
                return phones.filter(phone => {
                    const key = `${phone.Model}-${phone.Carrier}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            },
            
            generateSessionId: () => {
                return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            },
            
            getUrlParam: (param) => {
                const params = new URLSearchParams(window.location.search);
                return params.get(param) || sessionStorage.getItem(param);
            }
        }
    };
    
    // 전역 에러 핸들러
    window.addEventListener('error', (e) => {
        console.error('노피 AI 에러:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('노피 AI Promise 에러:', e.reason);
        e.preventDefault();
    });
    
})();
