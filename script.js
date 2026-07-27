// script.js - إصلاح سلوك الكمبيوتر
let gameState = {};
let aiTimer = null;

// ===== بدء اللعبة =====
function startGameOriginal() {
    let names = JSON.parse(localStorage.getItem('tempCoachNames') || '[]');
    const mode = localStorage.getItem('gameMode') || 'local';
    
    if (mode === 'online') {
        if (names.length < 4) {
            const playerName = names.length > 0 ? names[0] : 'أنت';
            names = [
                playerName,
                'كمبيوتر (سهل) 🤖',
                'كمبيوتر (متوسط) 🤖',
                'كمبيوتر (صعب) 🤖'
            ];
        }
        localStorage.setItem('tempCoachNames', JSON.stringify(names));
    }
    
    if (names.length < 2) {
        alert('يرجى إدخال اسمين على الأقل');
        return;
    }

    const budget = parseInt(document.getElementById('budget').value);
    const formation = document.getElementById('formation').value;

    if (typeof playersData === 'undefined') {
        alert('❌ البيانات غير محملة. تأكد من وجود ملف players.js');
        return;
    }

    const shuffledLegends = shuffleArray([...playersData.legends]);
    const shuffledNormals = shuffleArray([...playersData.normals]);
    const shuffledVeryWeak = shuffleArray([...playersData.veryWeak]);

    const isAIMode = mode === 'ai' || mode === 'online';
    const coaches = names.map((name, idx) => {
        let isAI = false;
        let aiDifficulty = 'medium';
        
        if (mode === 'online') {
            if (idx === 0) {
                isAI = false;
            } else if (idx === 1) {
                isAI = true;
                aiDifficulty = 'easy';
            } else if (idx === 2) {
                isAI = true;
                aiDifficulty = 'medium';
            } else if (idx === 3) {
                isAI = true;
                aiDifficulty = 'hard';
            }
        } else if (mode === 'ai') {
            isAI = idx > 0;
            aiDifficulty = localStorage.getItem('aiDifficulty') || 'medium';
        }
        
        return {
            name: name,
            budget: budget,
            team: [],
            coach: null,
            totalPower: 0,
            hasEnded: false,
            isAI: isAI,
            aiDifficulty: aiDifficulty
        };
    });

    gameState = {
        coaches: coaches,
        formation: formation,
        remainingLegends: shuffledLegends,
        remainingNormals: shuffledNormals,
        remainingVeryWeak: shuffledVeryWeak,
        currentBid: 5,
        currentBidder: null,
        round: 0,
        phase: 'legend',
        bidHistory: [],
        endCount: 0,
        allEnded: false,
        skipCount: 0,
        skipMode: false,
        isGameOver: false,
        isAIMode: isAIMode,
        gameMode: mode,
        aiDifficulty: 'medium',
        aiDelay: 1000,
        isAIProcessing: false
    };

    localStorage.setItem('gameState', JSON.stringify(gameState));
    window.location.href = 'auction.html';
}

window.startGameOriginal = startGameOriginal;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ===== تحميل شاشة المزاد =====
function loadAuction() {
    const saved = localStorage.getItem('gameState');
    if (!saved) {
        window.location.href = 'index.html';
        return;
    }
    gameState = JSON.parse(saved);
    if (typeof playersData === 'undefined') {
        alert('❌ البيانات غير محملة');
        return;
    }
    if (!gameState.endCount) gameState.endCount = 0;
    if (!gameState.allEnded) gameState.allEnded = false;
    if (!gameState.remainingNormals) gameState.remainingNormals = [];
    if (!gameState.remainingVeryWeak) gameState.remainingVeryWeak = [];
    if (!gameState.skipCount) gameState.skipCount = 0;
    if (!gameState.skipMode) gameState.skipMode = false;
    if (!gameState.isGameOver) gameState.isGameOver = false;
    if (!gameState.isAIProcessing) gameState.isAIProcessing = false;
    if (!gameState.aiDelay) gameState.aiDelay = 1000;

    updateAuctionUI();
    
    if (gameState.isAIMode) {
        processAI();
    }
}

// ===== تحديث واجهة المزاد =====
function updateAuctionUI() {
    const round = gameState.round;
    const legends = gameState.remainingLegends;
    const totalPlayers = legends.length;

    document.getElementById('roundInfo').textContent = `${round + 1} / ${totalPlayers}`;
    document.getElementById('myBudget').textContent = gameState.coaches[0]?.budget || 0;

    let player = null;
    if (round < legends.length) {
        player = legends[round];
    }
    if (player) {
        displayPlayer(player, true);
    }

    const highest = getHighestBid();
    if (highest) {
        document.getElementById('currentBid').textContent = highest.amount;
        document.getElementById('currentBidder').textContent = `(${highest.coach})`;
    } else {
        document.getElementById('currentBid').textContent = '5';
        document.getElementById('currentBidder').textContent = '(لا يوجد)';
    }

    renderCoachPanels();
}

function getHighestBid() {
    if (gameState.bidHistory.length === 0) return null;
    let highest = gameState.bidHistory[0];
    for (let bid of gameState.bidHistory) {
        if (bid.amount > highest.amount) {
            highest = bid;
        }
    }
    return highest;
}

// ===== عرض اللاعب =====
function displayPlayer(player, isLegend) {
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('playerPosition').textContent = player.position;
    document.getElementById('pAttack').textContent = player.attack;
    document.getElementById('pDefense').textContent = player.defense;
    document.getElementById('pSpeed').textContent = player.speed;
    
    const rating = player.rating || Math.round((player.attack + player.defense + player.speed) / 3);
    document.getElementById('pRating').textContent = rating;

    const img = document.getElementById('playerImage');
    if (player.image) {
        img.src = `images/${player.image}`;
    } else {
        img.src = 'images/default.png';
    }
    img.onerror = function() {
        this.src = 'images/default.png';
    };

    const badge = document.getElementById('legendBadge');
    if (isLegend) {
        badge.textContent = '⭐ أسطورة';
        badge.style.display = 'inline-block';
    }
}

// ===== إنشاء لوحات المدربين =====
function renderCoachPanels() {
    const container = document.getElementById('coachPanels');
    if (!container) {
        console.error('❌ coachPanels not found!');
        return;
    }
    
    const oldPanels = container.querySelectorAll('.coach-panel');
    oldPanels.forEach(el => el.remove());

    gameState.coaches.forEach((coach, idx) => {
        const panel = document.createElement('div');
        panel.className = 'coach-panel';
        panel.dataset.index = idx;

        if (gameState.currentBidder === idx) {
            panel.classList.add('active-panel');
        }

        const aiBadge = coach.isAI ? ' 🤖' : '';

        const header = document.createElement('div');
        header.className = 'coach-header';
        header.innerHTML = `
            <span class="coach-name">${coach.name}${aiBadge}</span>
            <span class="coach-budget">💰 ${coach.budget}م</span>
        `;
        panel.appendChild(header);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'coach-buttons';

        if (!coach.isAI) {
            const bidAmounts = [1, 5, 10];
            bidAmounts.forEach(amount => {
                const btn = document.createElement('button');
                btn.textContent = `+${amount}م`;
                btn.className = `bid-btn-small`;
                btn.style.background = amount === 1 ? '#3498db' : amount === 5 ? '#2ecc71' : '#e67e22';
                btn.style.color = 'white';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    placeBid(idx, amount);
                };
                buttonsDiv.appendChild(btn);
            });
        }

        if (!coach.isAI) {
            const endBtn = document.createElement('button');
            endBtn.textContent = coach.hasEnded ? '✅ أنهيت' : '⏹ إنهاء';
            endBtn.className = `end-btn bid-btn-small ${coach.hasEnded ? 'done' : ''}`;
            endBtn.onclick = (e) => {
                e.stopPropagation();
                endBid(idx);
            };
            buttonsDiv.appendChild(endBtn);
        } else {
            const statusBtn = document.createElement('button');
            statusBtn.textContent = coach.hasEnded ? '🤖 أنهى' : '🤖 يتفكر...';
            statusBtn.className = `end-btn bid-btn-small ${coach.hasEnded ? 'done' : ''}`;
            statusBtn.style.cursor = 'default';
            statusBtn.style.opacity = '0.7';
            buttonsDiv.appendChild(statusBtn);
        }

        panel.appendChild(buttonsDiv);

        const playersDiv = document.createElement('div');
        playersDiv.className = 'coach-players';
        if (coach.team.length === 0) {
            const empty = document.createElement('span');
            empty.textContent = '...';
            empty.style.color = '#666';
            empty.style.fontSize = '0.6em';
            playersDiv.appendChild(empty);
        } else {
            coach.team.forEach(p => {
                const tag = document.createElement('span');
                tag.className = 'player-tag';
                tag.textContent = p.name;
                if (p.type === 'veryWeak') {
                    tag.style.color = '#ff6b6b';
                    tag.style.borderColor = 'rgba(255,107,107,0.3)';
                }
                playersDiv.appendChild(tag);
            });
        }
        panel.appendChild(playersDiv);

        container.appendChild(panel);
    });
}

// ===== المزايدة =====
function placeBid(coachIdx, amount) {
    const coach = gameState.coaches[coachIdx];
    const highest = getHighestBid();
    const currentHighest = highest ? highest.amount : 5;
    const newBid = currentHighest + amount;

    if (newBid > coach.budget) {
        showNotification(`❌ ${coach.name} ليس لديه رصيد كافٍ`);
        return;
    }

    if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
    }

    gameState.coaches.forEach(c => c.hasEnded = false);
    gameState.endCount = 0;
    gameState.allEnded = false;
    gameState.skipMode = false;
    gameState.isAIProcessing = false;

    gameState.bidHistory.push({
        coach: coach.name,
        coachIdx: coachIdx,
        amount: newBid,
        time: new Date().toLocaleTimeString()
    });

    gameState.currentBidder = coachIdx;

    document.getElementById('currentBid').textContent = newBid;
    document.getElementById('currentBidder').textContent = `(${coach.name})`;
    renderCoachPanels();

    localStorage.setItem('gameState', JSON.stringify(gameState));

    if (gameState.isAIMode) {
        processAI();
    }
}

// ===== إنهاء المزايدة (لللاعب) =====
function endBid(coachIdx) {
    const coach = gameState.coaches[coachIdx];
    if (coach.hasEnded) {
        showNotification(`⚠️ ${coach.name} سبق وأنهى المزايدة`);
        return;
    }

    if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
    }

    // اللاعب ينهي
    coach.hasEnded = true;
    gameState.endCount = (gameState.endCount || 0) + 1;

    // ===== إجبار الكمبيوتر على إنهاء المزايدة فوراً =====
    gameState.coaches.forEach((c) => {
        if (c.isAI && !c.hasEnded) {
            c.hasEnded = true;
            gameState.endCount = (gameState.endCount || 0) + 1;
        }
    });

    renderCoachPanels();

    // التحقق من أن جميع المدربين أنهوا
    const allEnded = gameState.coaches.every(c => c.hasEnded === true);
    if (allEnded) {
        gameState.allEnded = true;
        const highest = getHighestBid();
        if (highest) {
            endAuction();
        } else {
            showChangePlayerDialog();
        }
        return;
    }

    localStorage.setItem('gameState', JSON.stringify(gameState));

    if (gameState.isAIMode) {
        // لو لسه في مدربين كمبيوتر لم ينهوا، ننهيهم فوراً
        const remainingAI = gameState.coaches.filter(c => c.isAI && !c.hasEnded);
        if (remainingAI.length > 0) {
            remainingAI.forEach(c => {
                c.hasEnded = true;
                gameState.endCount = (gameState.endCount || 0) + 1;
            });
            renderCoachPanels();
            localStorage.setItem('gameState', JSON.stringify(gameState));
            
            // بعد إنهاء الكل، ننهي المزاد
            const allEndedNow = gameState.coaches.every(c => c.hasEnded === true);
            if (allEndedNow) {
                gameState.allEnded = true;
                const highest = getHighestBid();
                if (highest) {
                    endAuction();
                } else {
                    showChangePlayerDialog();
                }
                return;
            }
        }
        processAI();
    }
}

// ===== ذكاء الكمبيوتر =====
function processAI() {
    if (gameState.isAIProcessing) return;
    if (gameState.allEnded) return;
    if (gameState.isGameOver) return;

    const round = gameState.round;
    if (round >= gameState.remainingLegends.length) return;

    const player = gameState.remainingLegends[round];
    if (!player) return;

    const aiCoaches = gameState.coaches.filter(c => c.isAI && !c.hasEnded);
    if (aiCoaches.length === 0) {
        // لو كل الكمبيوتر أنهى، نتحقق من إنهاء المزاد
        const allEnded = gameState.coaches.every(c => c.hasEnded === true);
        if (allEnded) {
            gameState.allEnded = true;
            const highest = getHighestBid();
            if (highest) {
                endAuction();
            } else {
                showChangePlayerDialog();
            }
        }
        return;
    }

    gameState.isAIProcessing = true;

    const delay = gameState.aiDelay || 1000;
    aiTimer = setTimeout(() => {
        aiTimer = null;
        gameState.isAIProcessing = false;

        if (gameState.allEnded || gameState.isGameOver) return;

        const currentPlayer = gameState.remainingLegends[gameState.round];
        if (!currentPlayer) return;

        const highest = getHighestBid();
        const currentPrice = highest ? highest.amount : 5;

        // لكل مدرب كمبيوتر لم ينهي بعد
        for (let coach of aiCoaches) {
            if (coach.hasEnded) continue;
            if (gameState.allEnded) break;

            const decision = aiDecision(coach, currentPlayer, currentPrice);
            
            if (decision.action === 'bid') {
                const amount = decision.amount || 1;
                const newBid = currentPrice + amount;
                
                if (newBid <= coach.budget) {
                    gameState.coaches.forEach(c => c.hasEnded = false);
                    gameState.endCount = 0;
                    gameState.allEnded = false;
                    gameState.skipMode = false;

                    gameState.bidHistory.push({
                        coach: coach.name,
                        coachIdx: gameState.coaches.indexOf(coach),
                        amount: newBid,
                        time: new Date().toLocaleTimeString()
                    });

                    gameState.currentBidder = gameState.coaches.indexOf(coach);

                    document.getElementById('currentBid').textContent = newBid;
                    document.getElementById('currentBidder').textContent = `(${coach.name})`;
                    renderCoachPanels();

                    localStorage.setItem('gameState', JSON.stringify(gameState));
                    
                    // الكمبيوتر يزايد تاني بعد تأخير بسيط
                    setTimeout(() => {
                        if (!gameState.allEnded && !gameState.isGameOver) {
                            processAI();
                        }
                    }, 500);
                    return;
                }
            } else if (decision.action === 'end') {
                // الكمبيوتر ينهي
                coach.hasEnded = true;
                gameState.endCount = (gameState.endCount || 0) + 1;
                renderCoachPanels();
                localStorage.setItem('gameState', JSON.stringify(gameState));

                // التحقق من إنهاء الكل
                const allEnded = gameState.coaches.every(c => c.hasEnded === true);
                if (allEnded) {
                    gameState.allEnded = true;
                    const highestBid = getHighestBid();
                    if (highestBid) {
                        endAuction();
                    } else {
                        showChangePlayerDialog();
                    }
                    return;
                }
            }
        }

        // لو لسه في مدربين كمبيوتر لم ينهوا، نكرر العملية
        const remainingAI = gameState.coaches.filter(c => c.isAI && !c.hasEnded);
        if (remainingAI.length > 0 && !gameState.allEnded && !gameState.isGameOver) {
            // ننهي كل الكمبيوتر المتبقي تلقائياً إذا مر وقت طويل
            if (gameState.endCount > 0) {
                // لو اللاعب أنهى، الكمبيوتر ينهي فوراً
                remainingAI.forEach(c => {
                    c.hasEnded = true;
                    gameState.endCount = (gameState.endCount || 0) + 1;
                });
                renderCoachPanels();
                localStorage.setItem('gameState', JSON.stringify(gameState));
                
                const allEndedNow = gameState.coaches.every(c => c.hasEnded === true);
                if (allEndedNow) {
                    gameState.allEnded = true;
                    const highestBid = getHighestBid();
                    if (highestBid) {
                        endAuction();
                    } else {
                        showChangePlayerDialog();
                    }
                }
            } else {
                setTimeout(() => processAI(), 500);
            }
        }

    }, delay);
}

// ===== قرار الكمبيوتر =====
function aiDecision(coach, player, currentPrice) {
    const difficulty = coach.aiDifficulty || 'medium';
    
    const neededPositions = getNeededPositions(coach);
    const isNeeded = neededPositions.includes(player.position) || neededPositions.includes('any');
    
    const rating = player.rating || Math.round((player.attack + player.defense + player.speed) / 3);
    let maxPrice = 10;
    if (rating >= 95) maxPrice = 45;
    else if (rating >= 90) maxPrice = 35;
    else if (rating >= 85) maxPrice = 25;
    else if (rating >= 80) maxPrice = 18;
    else if (rating >= 75) maxPrice = 12;
    else maxPrice = 8;

    if (difficulty === 'easy') {
        maxPrice = maxPrice * 0.5;
    } else if (difficulty === 'hard') {
        maxPrice = maxPrice * 1.3;
    }

    const priceIsGood = currentPrice < maxPrice;
    const activeBidders = gameState.bidHistory.filter(b => b.amount >= currentPrice).length;
    const competition = activeBidders > 2 ? 0.6 : activeBidders > 1 ? 0.8 : 1;
    const hasMoney = coach.budget > currentPrice + 1;

    const shouldBid = isNeeded && priceIsGood && hasMoney && Math.random() < competition;
    const shouldEnd = !shouldBid || (currentPrice > coach.budget * 0.4 && difficulty !== 'hard');

    let bidAmount = 1;
    if (difficulty === 'easy') bidAmount = 1;
    else if (difficulty === 'medium') bidAmount = Math.random() > 0.5 ? 1 : 5;
    else bidAmount = Math.random() > 0.6 ? 5 : 10;

    if (rating >= 90 && isNeeded && difficulty === 'hard') {
        bidAmount = Math.random() > 0.5 ? 10 : 5;
    }

    if (shouldBid && currentPrice + bidAmount <= coach.budget) {
        return { action: 'bid', amount: bidAmount };
    } else if (shouldEnd || currentPrice > maxPrice) {
        return { action: 'end' };
    } else {
        return { action: 'wait' };
    }
}

function getNeededPositions(coach) {
    const positions = coach.team.map(p => p.position);
    const needed = [];
    
    const attackers = positions.filter(p => p.includes('هجوم') || p.includes('جناح') || p.includes('مهاجم'));
    if (attackers.length < 3) needed.push('هجوم');
    
    const midfielders = positions.filter(p => p.includes('وسط') || p.includes('صانع'));
    if (midfielders.length < 3) needed.push('وسط');
    
    const defenders = positions.filter(p => p.includes('دفاع') || p.includes('ظهير') || p.includes('قلب'));
    if (defenders.length < 4) needed.push('دفاع');
    
    const goalkeepers = positions.filter(p => p.includes('حارس'));
    if (goalkeepers.length < 1) needed.push('حارس');
    
    if (coach.team.length === 0) {
        return ['any'];
    }
    
    return needed.length > 0 ? needed : ['any'];
}

// ===== مربع حوار تغيير اللاعب =====
function showChangePlayerDialog() {
    document.querySelector('.coach-panels').style.pointerEvents = 'none';
    
    const dialog = document.createElement('div');
    dialog.className = 'change-player-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(10, 14, 26, 0.95);
        backdrop-filter: blur(20px);
        border: 2px solid var(--gold);
        border-radius: 24px;
        padding: 30px 40px;
        z-index: 999;
        text-align: center;
        max-width: 90%;
        width: 400px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        direction: rtl;
    `;
    dialog.innerHTML = `
        <h2 style="color:var(--gold);font-size:1.5em;margin-bottom:10px;">⚠️ لا توجد مزايدة</h2>
        <p style="color:var(--text-secondary);font-size:1em;margin-bottom:20px;">
            جميع المدربين أنهوا المزايدة دون رفع السعر.<br>
            هل تريد تغيير اللاعب الحالي بآخر جديد؟
        </p>
        <div style="display:flex;gap:15px;justify-content:center;">
            <button class="btn btn-success" onclick="changePlayer()" style="padding:10px 30px;font-size:1em;">
                ✅ نعم، غيّر اللاعب
            </button>
            <button class="btn btn-gold-outline" onclick="cancelChangePlayer()" style="padding:10px 30px;font-size:1em;">
                ❌ لا، استمر
            </button>
        </div>
    `;
    document.body.appendChild(dialog);
}

function changePlayer() {
    const dialog = document.querySelector('.change-player-dialog');
    if (dialog) dialog.remove();
    document.querySelector('.coach-panels').style.pointerEvents = 'auto';
    
    const round = gameState.round;
    if (round < gameState.remainingLegends.length) {
        gameState.remainingLegends.splice(round, 1);
    }
    
    gameState.currentBid = 5;
    gameState.currentBidder = null;
    gameState.endCount = 0;
    gameState.allEnded = false;
    gameState.coaches.forEach(c => c.hasEnded = false);
    gameState.bidHistory = [];
    gameState.skipMode = false;
    gameState.isAIProcessing = false;
    
    localStorage.setItem('gameState', JSON.stringify(gameState));
    updateAuctionUI();
    showNotification('🔄 تم تغيير اللاعب، ابدأ المزايدة من جديد');
    
    if (gameState.isAIMode) {
        processAI();
    }
}

function cancelChangePlayer() {
    const dialog = document.querySelector('.change-player-dialog');
    if (dialog) dialog.remove();
    document.querySelector('.coach-panels').style.pointerEvents = 'auto';
    
    gameState.endCount = 0;
    gameState.allEnded = false;
    gameState.coaches.forEach(c => c.hasEnded = false);
    gameState.skipMode = true;
    gameState.isAIProcessing = false;
    
    localStorage.setItem('gameState', JSON.stringify(gameState));
    updateAuctionUI();
    showNotification('🔄 استمرار المزايدة على نفس اللاعب');
    
    if (gameState.isAIMode) {
        processAI();
    }
}

// ===== إنهاء المزاد =====
function endAuction() {
    const round = gameState.round;
    const legends = gameState.remainingLegends;

    if (round >= legends.length) {
        gameState.isGameOver = true;
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'result.html';
        return;
    }

    const player = legends[round];
    const highest = getHighestBid();
    let winnerIdx = null;

    if (highest) {
        winnerIdx = highest.coachIdx;
        const winner = gameState.coaches[winnerIdx];
        const price = highest.amount;
        if (winner.budget >= price) {
            winner.budget -= price;
            winner.team.push({ ...player, price: price, type: 'legend' });
            showNotification(`✅ ${winner.name} كسب ${player.name} بـ ${price} مليون`);
        } else {
            showNotification(`❌ ${winner.name} ليس لديه رصيد كافٍ، تم توزيع اللاعب تلقائياً`);
            distributePlayerAutomatically(player);
            winnerIdx = null;
        }
    } else {
        distributePlayerAutomatically(player);
        winnerIdx = null;
    }

    const losers = gameState.coaches.filter((c, idx) => idx !== winnerIdx);
    losers.forEach((coach) => {
        if (coach.budget >= 3 && gameState.remainingNormals.length > 0) {
            const p = gameState.remainingNormals.shift();
            coach.budget -= 3;
            coach.team.push({ ...p, price: 3, type: 'normal' });
            showNotification(`🟢 ${coach.name} أخذ ${p.name} (عادي) بـ 3 مليون`);
        } else if (gameState.remainingVeryWeak.length > 0) {
            const p = gameState.remainingVeryWeak.shift();
            coach.team.push({ ...p, price: 0, type: 'veryWeak' });
            showNotification(`🔴 ${coach.name} أخذ ${p.name} (ضعيف جداً) مجاناً`);
        } else {
            showNotification(`⚠️ لا يوجد لاعبين لتوزيعهم على ${coach.name}`);
        }
    });

    if (round < gameState.remainingLegends.length) {
        gameState.remainingLegends.splice(round, 1);
    }

    gameState.currentBid = 5;
    gameState.currentBidder = null;
    gameState.endCount = 0;
    gameState.allEnded = false;
    gameState.coaches.forEach(c => c.hasEnded = false);
    gameState.bidHistory = [];
    gameState.skipMode = false;
    gameState.isAIProcessing = false;

    localStorage.setItem('gameState', JSON.stringify(gameState));

    const allComplete = gameState.coaches.every(coach => coach.team.length >= 11);
    if (allComplete || gameState.remainingLegends.length === 0) {
        gameState.isGameOver = true;
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'result.html';
        return;
    }

    setTimeout(() => {
        nextPlayerAuto();
    }, 1500);
}

function distributePlayerAutomatically(player) {
    const price = 5;
    for (let coach of gameState.coaches) {
        if (!coach.hasEnded && coach.budget >= price) {
            coach.budget -= price;
            coach.team.push({ ...player, price: price, type: 'auto' });
            showNotification(`⚠️ ${coach.name} أخذ ${player.name} بـ ${price} مليون (تلقائي)`);
            return;
        }
    }
    for (let coach of gameState.coaches) {
        if (coach.budget >= price) {
            coach.budget -= price;
            coach.team.push({ ...player, price: price, type: 'auto' });
            showNotification(`⚠️ ${coach.name} أخذ ${player.name} بـ ${price} مليون (تلقائي)`);
            return;
        }
    }
    showNotification(`❌ لا يوجد مدرب قادر على شراء ${player.name}`);
}

function nextPlayerAuto() {
    gameState.currentBid = 5;
    gameState.currentBidder = null;
    gameState.endCount = 0;
    gameState.allEnded = false;
    gameState.coaches.forEach(c => c.hasEnded = false);
    gameState.bidHistory = [];
    gameState.skipMode = false;
    gameState.isAIProcessing = false;

    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    if (gameState.remainingLegends.length === 0) {
        gameState.isGameOver = true;
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'result.html';
        return;
    }
    
    updateAuctionUI();
    showNotification(`🔄 لاعب جديد: ${gameState.remainingLegends[0].name}`);
    
    if (gameState.isAIMode) {
        processAI();
    }
}

function showNotification(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 50%;
        left: 50%;
        transform: translate(-50%, 50%);
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(20px);
        padding: 12px 24px;
        border-radius: 16px;
        border: 1px solid var(--gold);
        color: white;
        font-size: 0.9em;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        animation: slideUp 0.5s ease-out;
        max-width: 90%;
        text-align: center;
        pointer-events: none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 600);
    }, 3500);
}

function showResult() {
    const saved = localStorage.getItem('gameState');
    if (!saved) { window.location.href = 'index.html'; return; }
    gameState = JSON.parse(saved);

    let winner = null;
    let maxPower = -1;

    const grid = document.getElementById('resultGrid');
    grid.innerHTML = gameState.coaches.map((coach, idx) => {
        let total = 0;
        coach.team.forEach(p => {
            const power = p.rating || Math.round((p.attack + p.defense + p.speed) / 3);
            total += power;
        });
        const avgPower = coach.team.length > 0 ? (total / coach.team.length) : 0;
        const coachBonus = coach.coach ? coach.coach.bonus : 0;
        const finalPower = avgPower + coachBonus;
        coach.totalPower = finalPower;

        const positions = coach.team.map(p => p.position);
        const hasGK = positions.includes('حارس');
        const hasDef = positions.filter(p => p === 'دفاع').length >= 2;
        const hasMid = positions.filter(p => p === 'وسط').length >= 2;
        const hasAtt = positions.filter(p => p === 'هجوم').length >= 1;
        let bonus = 0;
        if (hasGK) bonus += 2;
        if (hasDef) bonus += 2;
        if (hasMid) bonus += 2;
        if (hasAtt) bonus += 2;
        const finalWithBonus = finalPower + bonus;

        if (finalWithBonus > maxPower) {
            maxPower = finalWithBonus;
            winner = idx;
        }

        const aiBadge = coach.isAI ? ' 🤖' : '';

        return `
            <div class="result-card ${idx === winner ? 'winner' : ''}">
                <div class="team-name">${idx === winner ? '🏆 ' : ''} ${coach.name}${aiBadge}</div>
                <div class="power-score">${finalWithBonus.toFixed(1)}</div>
                <div style="display:flex;justify-content:space-between;font-size:0.8em;color:var(--text-secondary);">
                    <span>🧑‍🤝‍🧑 ${coach.team.length} لاعب</span>
                    <span>💰 ${coach.budget}م متبقي</span>
                </div>
                ${coach.coach ? `<div class="coach-info">مدرب: ${coach.coach.name} (+${coach.coach.bonus}%)</div>` : '<div class="coach-info">بدون مدرب</div>'}
                <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:3px;">
                    ${coach.team.map(p => `<span class="badge ${p.type === 'legend' ? 'badge-legend' : p.type === 'veryWeak' ? 'badge-veryweak' : ''}">${p.name}</span>`).join('')}
                </div>
            </div>
        `;
    }).join('');

    if (winner !== null) {
        document.getElementById('winnerName').textContent = gameState.coaches[winner].name;
        document.getElementById('winnerAnnounce').textContent = `🏆 التشكيلة الأقوى: ${gameState.coaches[winner].name} 🎉`;
    }
}

window.onload = function() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        // index
    } else if (path.includes('auction.html')) {
        loadAuction();
    } else if (path.includes('result.html')) {
        showResult();
    }
};

window.placeBid = placeBid;
window.endBid = endBid;
window.changePlayer = changePlayer;
window.cancelChangePlayer = cancelChangePlayer;

