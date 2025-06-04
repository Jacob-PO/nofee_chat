// 노피 AI 챗봇 - main.js (확장된 AI 추천 로직)
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
            userData: {
                dataUsage: null,      // 데이터 사용량 (high/medium/low)
                preference: null,     // 사용 패턴 (camera/game/battery)
                name: '',
                phone: '',
                region: '',
                district: '',
                consent: false
            },
            selectedProduct: null,
            sessionId: null,
            messageHistory: [],
            recommendationScore: {}   // 추천 점수 저장
        },
        
        // GitHub CDN URLs
        config: {
            GITHUB_CDN_URL: 'https://cdn.jsdelivr.net/gh/Jacob-PO/nofee_chat@main/',
            BACKUP_URL: 'https://raw.githubusercontent.com/Jacob-PO/nofee_chat/main/',
            TYPING_SPEED: 30,
            AI_THINKING_DELAY: 1000
        },
        
        // 모델명 한글 매핑
        modelKoMap: {
            'Samsung Galaxy S25 256GB': '갤럭시 S25 256GB',
            'Samsung Galaxy S25 Plus 256GB': '갤럭시 S25 플러스 256GB',
            'Samsung Galaxy S25 Ultra 256GB': '갤럭시 S25 울트라 256GB',
            'Samsung Galaxy S24 FE': '갤럭시 S24 FE',
            'Samsung Galaxy Z Flip6 256GB': '갤럭시 Z 플립6 256GB',
            'Samsung Galaxy Z Fold6 256GB': '갤럭시 Z 폴드6 256GB',
            'Samsung Galaxy A35 128GB': '갤럭시 A35 128GB',
            'Samsung Galaxy A16': '갤럭시 A16',
            'iPhone 16 128GB': '아이폰 16 128GB',
            'iPhone 16 256GB': '아이폰 16 256GB',
            'iPhone 16 Pro 128GB': '아이폰 16 Pro 128GB',
            'iPhone 16 Pro 256GB': '아이폰 16 Pro 256GB',
            'iPhone 16 Pro Max 256GB': '아이폰 16 Pro Max 256GB',
            'iPhone 15 128GB': '아이폰 15 128GB',
            'iPhone 15 Pro 128GB': '아이폰 15 Pro 128GB'
        },
        
        // 초기화
        init: async function() {
            if (this.state.initialized) return;
            
            console.log('노피 AI 초기화 시작...');
            
            // 컨테이너 찾기 재시도
            let retries = 0;
            const maxRetries = 10;
            
            const findContainer = () => {
                this.state.chatContainer = document.getElementById('nofeeChat');
                if (!this.state.chatContainer && retries < maxRetries) {
                    retries++;
                    console.log(`컨테이너 찾기 재시도 중... (${retries}/${maxRetries})`);
                    setTimeout(findContainer, 500);
                    return;
                } else if (!this.state.chatContainer) {
                    console.error('채팅 컨테이너를 찾을 수 없습니다. ID를 확인해주세요: nofeeChat');
                    return;
                }
                
                // 컨테이너를 찾았을 때 초기화 계속 진행
                this.continueInit();
            };
            
            findContainer();
        },
        
        // 초기화 계속
        continueInit: async function() {
            
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
                
                // 데이터 변환
                this.state.phoneData = this.transformProducts(phoneData || []);
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
        
        // 상품 데이터 변환
        transformProducts: function(rawData) {
            return rawData.map(item => {
                const transformed = {
                    ...item,
                    model: this.modelKoMap[item.Model] || item.Model,
                    storage: item.Storage || '128GB',
                    activation: item['Activation Type'] || '신규',
                    contract: item['Contract Type'] || '공시',
                    carrier: item.Carrier || 'SKT',
                    total: item['Total Monthly Payment'] || 0,
                    deviceDiscount: item['Monthly Device Fee'] || 0,
                    planFee: item['Monthly Plan Fee'] || 0,
                    devicePrice: item['Retail Price'] || 0,
                    margin: item.Margin || 0,
                    marginAmount: item['Margin Amount'] || 0,
                    dealerSubsidy: item['Dealer Subsidy'] || 0,
                    officialSubsidy: item['Official Subsidy'] || 0
                };
                
                // 추가 계산 필드
                transformed.planPortion = transformed.planFee / transformed.total;
                transformed.hasExtraDiscount = transformed.deviceDiscount < 0;
                transformed.extraDiscountAmount = Math.abs(Math.min(0, transformed.deviceDiscount));
                
                return transformed;
            });
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
            await this.addBotMessage('안녕하세요! 수수료 NO, 최저가 휴대폰 노피 AI입니다 ✨');
            await this.utils.delay(300);
            await this.addBotMessage('고객님께 딱 맞는 휴대폰을 찾아드릴게요!\n몇 가지만 여쭤볼게요 😊');
            await this.utils.delay(500);
            
            this.askDataUsage();
        },
        
        // 데이터 사용량 질문 (새로운 단계)
        askDataUsage: async function() {
            this.state.currentStep = 'dataUsage';
            
            await this.showAIThinking('사용 패턴 분석 준비');
            await this.addBotMessage('먼저 데이터 사용량이 궁금해요!\n평소 유튜브나 게임을 많이 하시나요? 📱');
            
            const options = [
                { label: '📺 많이 써요 (무제한 필요)', value: 'high', emoji: '📺' },
                { label: '📱 보통이에요', value: 'medium', emoji: '📱' },
                { label: '💬 적게 써요 (SNS 정도)', value: 'low', emoji: '💬' }
            ];
            
            this.showChoiceButtons(options, (selected) => {
                this.state.userData.dataUsage = selected.value;
                this.selectDataUsage(selected);
            });
        },
        
        // 데이터 사용량 선택
        selectDataUsage: async function(selected) {
            await this.addUserMessage(selected.label);
            
            let message = '';
            switch(selected.value) {
                case 'high':
                    message = '무제한 요금제가 필요하시군요! 데이터 걱정 없는 플랜으로 추천드릴게요 🚀';
                    break;
                case 'medium':
                    message = '적절한 데이터 요금제로 추천드릴게요! 균형잡힌 선택이네요 👍';
                    break;
                case 'low':
                    message = '알뜰한 요금제로 추천드릴게요! 스마트한 선택이에요 💰';
                    break;
            }
            
            await this.showAIThinking('맞춤 요금제 분석 중');
            await this.addBotMessage(message);
            await this.utils.delay(300);
            
            this.askPriceRange();
        },
        
        // 가격대 질문
        askPriceRange: async function() {
            this.state.currentStep = 'price';
            await this.addBotMessage('선호하시는 월 납부 요금대를 골라주세요 💳');
            
            const priceRanges = [
                { label: '3~5만원', value: '30000-50000', range: [30000, 50000] },
                { label: '5~7만원', value: '50000-70000', range: [50000, 70000] },
                { label: '7~9만원', value: '70000-90000', range: [70000, 90000] },
                { label: '9~10만원', value: '90000-100000', range: [90000, 100000] },
                { label: '10만원 이상', value: '100000-9999999', range: [100000, 9999999] }
            ];
            
            const buttonsHTML = `
                <div class="nofee-message">
                    <div class="nofee-choice-buttons">
                        ${priceRanges.map(range => `
                            <button class="nofee-choice-btn" 
                                    onclick="NofeeAI.selectPrice('${range.value}', '${range.label}')">
                                ${range.label}
                            </button>
                        `).join('')}
                    </div>
                    ${this.state.currentStep !== 'dataUsage' ? this.createBackButton() : ''}
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', buttonsHTML);
            this.scrollToBottom();
        },
        
        // 가격 선택
        selectPrice: async function(value, label) {
            await this.addUserMessage(label);
            this.state.filters.priceRange = value;
            this.state.currentStep = 'brand';
            
            await this.showAIThinking('브랜드별 최적 상품 분석 중');
            await this.addBotMessage('어느 브랜드를 원하시나요? 🏢');
            
            this.askBrand();
        },
        
        // 브랜드 질문
        askBrand: function() {
            const brands = [
                { label: '삼성', value: '삼성' },
                { label: '애플', value: '애플' },
                { label: '기타', value: '기타' }
            ];
            
            const buttonsHTML = `
                <div class="nofee-message">
                    <div class="nofee-choice-buttons">
                        ${brands.map(brand => `
                            <button class="nofee-choice-btn" 
                                    onclick="NofeeAI.selectBrand('${brand.value}', '${brand.label}')">
                                ${brand.label}
                            </button>
                        `).join('')}
                    </div>
                    ${this.createBackButton()}
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', buttonsHTML);
            this.scrollToBottom();
        },
        
        // 브랜드 선택
        selectBrand: async function(value, label) {
            await this.addUserMessage(label);
            this.state.filters.brand = value;
            this.state.currentStep = 'preference';
            
            await this.showAIThinking('사용 패턴 파악 중');
            await this.addBotMessage('마지막으로, 가장 중요하게 생각하시는 건 무엇인가요? 🤔');
            
            this.askPreference();
        },
        
        // 사용 패턴 질문 (새로운 단계)
        askPreference: function() {
            const preferences = [
                { label: '📸 카메라 (사진/영상)', value: 'camera', emoji: '📸' },
                { label: '🎮 성능 (게임/앱)', value: 'game', emoji: '🎮' },
                { label: '🔋 배터리 (오래 사용)', value: 'battery', emoji: '🔋' },
                { label: '💰 가격 (가성비)', value: 'price', emoji: '💰' }
            ];
            
            this.showChoiceButtons(preferences, (selected) => {
                this.state.userData.preference = selected.value;
                this.selectPreference(selected);
            });
        },
        
        // 선호도 선택 후 결과 표시
        selectPreference: async function(selected) {
            await this.addUserMessage(selected.label);
            this.state.currentStep = 'results';
            
            await this.showAIThinking('AI가 최적의 상품을 찾고 있어요');
            await this.utils.delay(1500);
            
            this.showFilteredPhones();
        },
        
        // 스마트 추천 알고리즘
        rankProducts: function(products) {
            const { dataUsage, preference } = this.state.userData;
            
            return products.map(phone => {
                let score = 100;
                
                // 1. 기본 가격 점수 (낮을수록 높은 점수)
                score -= (phone.total / 1000);
                
                // 2. 추가 할인 점수
                if (phone.hasExtraDiscount) {
                    score += phone.extraDiscountAmount / 500;
                }
                
                // 3. 데이터 사용량에 따른 요금제 비중 점수
                if (dataUsage === 'high' && phone.planPortion > 0.5) {
                    score += 20; // 무제한 요금제 선호
                } else if (dataUsage === 'low' && phone.planPortion < 0.3) {
                    score += 20; // 저렴한 요금제 선호
                }
                
                // 4. 선호도에 따른 모델 점수
                if (preference === 'camera') {
                    // 프로/울트라/플러스 모델 가산점
                    if (phone.model.includes('Pro') || phone.model.includes('울트라') || phone.model.includes('플러스')) {
                        score += 30;
                    }
                } else if (preference === 'game') {
                    // 최신 모델 가산점
                    if (phone.model.includes('S25') || phone.model.includes('16')) {
                        score += 25;
                    }
                } else if (preference === 'battery') {
                    // 플러스/울트라/맥스 모델 가산점
                    if (phone.model.includes('플러스') || phone.model.includes('울트라') || phone.model.includes('Max')) {
                        score += 20;
                    }
                } else if (preference === 'price') {
                    // 추가 할인이 큰 상품 가산점
                    score += phone.extraDiscountAmount / 300;
                }
                
                // 5. 마진율이 낮은 "숨은 딜" 가산점
                if (phone.margin < 0.25 && phone.margin > 0) {
                    score += 15;
                }
                
                // 점수 저장
                this.state.recommendationScore[phone.model] = score;
                
                return { ...phone, score };
            }).sort((a, b) => b.score - a.score);
        },
        
        // 필터링된 휴대폰 표시
        showFilteredPhones: async function() {
            let filtered = [...this.state.phoneData];
            
            // 가격 필터링
            if (this.state.filters.priceRange) {
                const [min, max] = this.state.filters.priceRange.split('-').map(Number);
                filtered = filtered.filter(phone => phone.total >= min && phone.total <= max);
            }
            
            // 브랜드 필터링
            if (this.state.filters.brand && this.state.filters.brand !== '기타') {
                filtered = filtered.filter(phone => phone.Brand === this.state.filters.brand);
            }
            
            // 스마트 랭킹 적용
            const ranked = this.rankProducts(filtered);
            
            // 중복 제거
            const uniquePhones = this.utils.getUniquePhones(ranked);
            let displayPhones = uniquePhones.slice(0, 5);
            
            // 결과가 없으면 조건 완화
            if (displayPhones.length === 0) {
                await this.addBotMessage('정확한 조건의 상품이 없어서 유사한 상품을 찾아봤어요! 🔍');
                
                // 가격대 ±10000원으로 확장
                const [min, max] = this.state.filters.priceRange.split('-').map(Number);
                filtered = this.state.phoneData.filter(phone => 
                    phone.total >= (min - 10000) && phone.total <= (max + 10000)
                );
                
                const relaxedRanked = this.rankProducts(filtered);
                displayPhones = this.utils.getUniquePhones(relaxedRanked).slice(0, 5);
            }
            
            if (displayPhones.length === 0) {
                await this.addBotMessage('조건에 맞는 휴대폰이 없습니다. 😢\n다른 조건으로 다시 검색해보시겠어요?');
                this.showRetryButton();
                return;
            }
            
            // AI 추천 메시지
            let recommendMessage = `추천드릴 수 있는 상품입니다! `;
            if (this.state.userData.preference === 'camera') {
                recommendMessage += '📸 카메라 성능이 뛰어난 모델 위주로 선별했어요!';
            } else if (this.state.userData.preference === 'game') {
                recommendMessage += '🎮 최신 프로세서로 게임도 끊김없이!';
            } else if (this.state.userData.preference === 'battery') {
                recommendMessage += '🔋 대용량 배터리로 하루종일 든든해요!';
            } else if (this.state.userData.preference === 'price') {
                recommendMessage += '💰 가성비 최고! 추가 할인이 큰 상품들이에요!';
            }
            
            await this.addBotMessage(recommendMessage);
            
            // 상품 카드 표시
            const phonesHTML = `
                <div class="nofee-message">
                    ${displayPhones.map((phone, index) => {
                        const hasSpecialDeal = phone.margin < 0.25 && phone.margin > 0;
                        const hasMegaDiscount = phone.extraDiscountAmount > 10000;
                        
                        return `
                        <div class="nofee-phone-card" onclick="NofeeAI.selectPhone(${index})">
                            ${hasSpecialDeal ? '<span class="nofee-special-badge">⚡️ 숨은 특가</span>' : ''}
                            ${hasMegaDiscount ? '<span class="nofee-mega-badge">🔥 초특가</span>' : ''}
                            <div class="nofee-phone-header">
                                <div class="nofee-phone-info">
                                    <h4>${phone.model}</h4>
                                    <p>${phone.activation} · ${phone.carrier} · ${phone.contract} · ${phone.storage}</p>
                                </div>
                                <div class="nofee-carrier-badge ${this.utils.getCarrierClass(phone.carrier)}">
                                    ${phone.carrier}
                                </div>
                            </div>
                            <div class="nofee-price-info">
                                <div class="nofee-price-item">
                                    <div class="nofee-price-label">정가</div>
                                    <div class="nofee-price-value">${this.utils.formatPrice(phone.devicePrice)}원</div>
                                </div>
                                <div class="nofee-price-item">
                                    <div class="nofee-price-label">월 납부금</div>
                                    <div class="nofee-price-value highlight">
                                        ₩${this.utils.formatPrice(phone.total)}
                                    </div>
                                </div>
                            </div>
                            ${phone.hasExtraDiscount ? `
                                <div class="nofee-extra-discount">
                                    <span>(-${this.utils.formatPrice(phone.extraDiscountAmount)}원 추가 할인)</span>
                                </div>
                            ` : ''}
                            ${this.checkUpgradeOption(phone, displayPhones) || ''}
                        </div>
                    `}).join('')}
                    ${this.createBackButton()}
                </div>
            `;
            
            // 전역 변수에 저장
            window.NofeeDisplayedPhones = displayPhones;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', phonesHTML);
            this.scrollToBottom();
        },
        
        // 업그레이드 옵션 체크
        checkUpgradeOption: function(phone, allPhones) {
            // 같은 모델의 더 큰 용량 찾기
            const sameModelHigherStorage = allPhones.find(p => 
                p.model === phone.model && 
                parseInt(p.storage) > parseInt(phone.storage)
            );
            
            if (sameModelHigherStorage) {
                const priceDiff = sameModelHigherStorage.total - phone.total;
                if (priceDiff < 3000 && priceDiff > 0) {
                    const storageDiff = parseInt(sameModelHigherStorage.storage) - parseInt(phone.storage);
                    return `<div class="nofee-upgrade-tip">
                        💡 ${storageDiff}GB 더 큰 용량이 월 ${this.utils.formatPrice(priceDiff)}원 차이!
                    </div>`;
                }
            }
            return '';
        },
        
        // 휴대폰 선택
        selectPhone: async function(index) {
            const phone = window.NofeeDisplayedPhones[index];
            this.state.selectedProduct = phone;
            this.state.currentStep = 'confirm';
            
            await this.addUserMessage(`${phone.model} 선택`);
            await this.showAIThinking('선택하신 상품 정보 확인 중');
            
            // 확인 메시지
            let confirmMessage = `📱 ${phone.model} (${phone.storage})\n`;
            confirmMessage += `📝 ${phone.activation} · ${phone.carrier} · ${phone.contract}\n`;
            confirmMessage += `💰 월 ${this.utils.formatPrice(phone.total)}원`;
            
            if (phone.hasExtraDiscount) {
                confirmMessage += ` (-${this.utils.formatPrice(phone.extraDiscountAmount)}원 추가 할인)`;
            }
            
            confirmMessage += '\n\n신청을 진행할까요?';
            
            await this.addBotMessage(confirmMessage);
            
            // AI 추천 이유 설명
            if (this.state.recommendationScore[phone.model] > 100) {
                let reason = '✨ AI 추천 이유: ';
                if (phone.hasExtraDiscount && phone.extraDiscountAmount > 5000) {
                    reason += '추가 할인이 크고, ';
                }
                if (this.state.userData.preference === 'camera' && 
                    (phone.model.includes('Pro') || phone.model.includes('울트라'))) {
                    reason += '카메라 성능이 뛰어나며, ';
                }
                if (phone.margin < 0.25) {
                    reason += '특별 할인 상품이에요!';
                } else {
                    reason += '고객님 조건에 딱 맞아요!';
                }
                
                await this.utils.delay(300);
                await this.addBotMessage(reason);
            }
            
            // 선택 버튼
            this.showChoiceButtons([
                { label: '예', value: 'yes' },
                { label: '아니요', value: 'no' }
            ], (selected) => {
                if (selected.value === 'yes') {
                    this.startPurchase();
                } else {
                    this.state.currentStep = 'price';
                    this.askPriceRange();
                }
            });
        },
        
        // 구매 시작
        startPurchase: async function() {
            this.state.currentStep = 'customer_name';
            
            await this.addUserMessage('예');
            await this.showAIThinking('신청서 준비 중');
            await this.addBotMessage('좋은 선택이세요! 👍\n신청을 도와드릴게요. 성함을 입력해주세요.');
            
            this.showInputField('text', '홍길동', (value) => {
                this.state.customerInfo.name = value;
                this.askPhone();
            });
        },
        
        // 전화번호 입력
        askPhone: async function() {
            this.state.currentStep = 'customer_phone';
            
            await this.showAIThinking();
            await this.addBotMessage('전화번호를 입력해주세요. (\'-\' 없이)');
            
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
            
            await this.showAIThinking();
            await this.addBotMessage('거주 중이신 시(도)를 선택해주세요.');
            
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
            
            await this.showAIThinking();
            await this.addBotMessage('군/구를 선택해주세요.');
            
            this.showSelectField(districts, (value) => {
                this.state.customerInfo.district = value;
                this.askConsent();
            });
        },
        
        // 개인정보 동의
        askConsent: async function() {
            this.state.currentStep = 'consent';
            
            await this.showAIThinking('마지막 단계');
            await this.addBotMessage('개인정보 수집·이용에 동의하십니까?');
            
            const consentHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <a href="/privacy" target="_blank" class="nofee-privacy-link">
                            개인정보 처리방침 보기
                        </a>
                        <div class="nofee-choice-buttons">
                            <button class="nofee-choice-btn" onclick="NofeeAI.handleConsent(true)">
                                동의
                            </button>
                            <button class="nofee-choice-btn" onclick="NofeeAI.handleConsent(false)">
                                비동의
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
                await this.addUserMessage('동의');
                this.state.customerInfo.consent = true;
                
                await this.showAIThinking('신청을 접수 중입니다');
                
                // 폼 데이터 채우기
                this.fillFormData();
                
                // 제출
                this.submitForm();
                
                // 성공 메시지
                await this.addBotMessage('감사합니다. 신청을 접수 중입니다! 🎉');
                await this.utils.delay(500);
                
                // 예상 절약 금액 계산
                const monthlyDiscount = this.state.selectedProduct.extraDiscountAmount || 0;
                const yearlyDiscount = monthlyDiscount * 24; // 2년 약정 기준
                
                if (yearlyDiscount > 0) {
                    await this.addBotMessage(`💰 노피를 통해 2년간 ${this.utils.formatPrice(yearlyDiscount)}원을 절약하게 되셨어요!`);
                }
                
                await this.utils.delay(300);
                await this.addBotMessage('담당 매니저가 곧 연락드릴 예정입니다.\n노피를 선택해주셔서 감사합니다! 💙');
                
                this.showSuccessAnimation();
            } else {
                await this.addUserMessage('비동의');
                await this.addBotMessage('개인정보 동의 없이는 진행할 수 없습니다.\n나가시겠어요?');
                
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
                phone_model: this.state.selectedProduct.model,
                phone_carrier: this.state.selectedProduct.carrier,
                phone_plan: this.state.selectedProduct.Plan || '5G 베이직',
                phone_price: this.state.selectedProduct.devicePrice,
                monthly_payment: this.state.selectedProduct.total,
                contract_type: this.state.selectedProduct.contract,
                activation_type: this.state.selectedProduct.activation,
                timestamp: new Date().toISOString(),
                session_id: this.state.sessionId,
                utm_source: this.utils.getUrlParam('utm_source') || 'direct',
                utm_medium: this.utils.getUrlParam('utm_medium') || 'none',
                utm_campaign: this.utils.getUrlParam('utm_campaign') || 'none',
                // 추가 데이터
                data_usage: this.state.userData.dataUsage,
                user_preference: this.state.userData.preference,
                ai_score: this.state.recommendationScore[this.state.selectedProduct.model] || 0
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
            const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const messageHTML = `
                <div class="nofee-message">
                    <div class="nofee-bot-message">
                        <div class="nofee-bot-avatar">🤖</div>
                        <div class="nofee-bot-info">
                            <div class="nofee-bot-name">노피 AI (bot)</div>
                            <div class="nofee-message-bubble" id="${messageId}"></div>
                        </div>
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.scrollToBottom();
            
            // 타이핑 효과
            const bubble = document.getElementById(messageId);
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
                const textElement = thinking.querySelector('.nofee-ai-thinking-text');
                if (textElement) {
                    textElement.textContent = text + '...';
                }
                thinking.style.display = 'block';
                thinking.classList.add('show');
                
                // 채팅 영역에 추가
                if (this.state.chatContainer) {
                    this.state.chatContainer.appendChild(thinking);
                }
                
                await this.utils.delay(this.config.AI_THINKING_DELAY);
            }
        },
        
        hideAIThinking: function() {
            const thinking = document.getElementById('aiThinking');
            if (thinking) {
                thinking.classList.remove('show');
                thinking.style.display = 'none';
                // 원래 위치로 되돌리기
                const wrapper = document.getElementById('nofee-ai-wrapper');
                if (wrapper && thinking.parentNode !== wrapper) {
                    wrapper.appendChild(thinking);
                }
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
                    ${this.state.currentStep !== 'dataUsage' ? this.createBackButton() : ''}
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
            const inputId = 'input-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const inputHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <input type="${type}" 
                               class="nofee-input-field" 
                               placeholder="${placeholder}"
                               ${type === 'tel' ? 'maxlength="11"' : ''}
                               id="${inputId}">
                        <button class="nofee-input-btn">입력</button>
                        ${this.createBackButton()}
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', inputHTML);
            
            const input = document.getElementById(inputId);
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
            const selectId = 'select-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const selectHTML = `
                <div class="nofee-message">
                    <div class="nofee-input-wrapper">
                        <select class="nofee-input-field" id="${selectId}">
                            <option value="">선택해주세요</option>
                            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>
                        ${this.createBackButton()}
                    </div>
                </div>
            `;
            
            this.state.chatContainer.insertAdjacentHTML('beforeend', selectHTML);
            
            const select = document.getElementById(selectId);
            
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
            const steps = ['dataUsage', 'price', 'brand', 'preference', 'results', 'confirm', 'purchase'];
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
                    case 'dataUsage':
                        this.askDataUsage();
                        break;
                    case 'price':
                        this.askPriceRange();
                        break;
                    case 'brand':
                        this.askBrand();
                        break;
                    case 'preference':
                        this.askPreference();
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
                currentStep: 'dataUsage',
                filters: {
                    priceRange: null,
                    carrier: null,
                    brand: null
                },
                userData: {
                    dataUsage: null,
                    preference: null,
                    name: '',
                    phone: '',
                    region: '',
                    district: '',
                    consent: false
                },
                selectedProduct: null,
                messageHistory: [],
                recommendationScore: {}
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
                if (!value && value !== 0) return '0';
                const absValue = Math.abs(value);
                return absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            },
            
            getCarrierClass: (carrier) => {
                const carrierMap = {
                    'SK': 'skt',
                    'SKT': 'skt',
                    'KT': 'kt',
                    'LG': 'lgu',
                    'LGU': 'lgu',
                    'LG U+': 'lgu'
                };
                return carrierMap[carrier] || '';
            },
            
            validatePhone: (phone) => {
                const cleaned = phone.replace(/[^0-9]/g, '');
                return /^01[0-9]{8,9}$/.test(cleaned);
            },
            
            getUniquePhones: (phones) => {
                const seen = new Set();
                return phones.filter(phone => {
                    const key = `${phone.model}-${phone.carrier}-${phone.storage}`;
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
    
    // 디버깅용 - 콘솔에서 확인 가능
    console.log('노피 AI 객체 로드 완료:', window.NofeeAI);
    
})();
