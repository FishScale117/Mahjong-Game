// 麻将游戏核心逻辑

// 生成麻将牌池（万、条、筒，每种1-9各4张）
function generateDeck() {
    const suits = ['万', '条', '筒'];
    const deck = [];
    
    for (const suit of suits) {
        for (let i = 1; i <= 9; i++) {
            // 每种牌添加4张
            for (let j = 0; j < 4; j++) {
                deck.push(`${i}${suit}`);
            }
        }
    }
    
    return deck;
}

// 玩家类
class Player {
    constructor() {
        this.hand_cards = []; // 手牌列表
        this.exposed_cards = []; // 吃/碰/杠亮出的牌
        this.missing_suit = null; // 缺门花色（万/条/筒）
        this.is_hu = false; // 是否已胡牌
        this.is_huazhu = false; // 是否花猪
        this.score = 0; // 当前分数
        this.has_jiao = false; // 是否听牌
    }
}

// 游戏全局状态
class GameState {
    constructor() {
        this.banker = 0; // 当前庄家（玩家索引）
        this.wall_cards = []; // 牌墙剩余牌列表
        this.discarded_pile = []; // 桌面弃牌堆
        this.gang_pool = 0; // 杠牌计分池
        this.current_turn = 0; // 当前出牌玩家索引
        this.game_over = false; // 游戏是否结束
    }
}

// 初始化游戏（发牌）
function initGame() {
    const gameState = new GameState();
    const players = [new Player(), new Player(), new Player(), new Player()];
    
    // 生成并洗牌
    gameState.wall_cards = generateDeck();
    shuffleArray(gameState.wall_cards);
    
    // 定庄家（首次随机）
    gameState.banker = Math.floor(Math.random() * 4);
    gameState.current_turn = gameState.banker;
    
    // 摸初始手牌（庄家14张，其他玩家13张）
    for (let i = 0; i < 4; i++) {
        // 庄家取14张，其他玩家取13张
        const cardsCount = (i === gameState.banker) ? 14 : 13;
        const cards = gameState.wall_cards.splice(0, cardsCount);
        players[i].hand_cards = players[i].hand_cards.concat(cards);
    }
    
    return { gameState, players };
}

// 执行换三张和定缺操作
function performExchangeAndMissing(players, gameState, selectedCards) {
    // 换三张
    performCardExchange(players, gameState, selectedCards);
    
    // 为AI玩家自动定缺门
    for (let i = 1; i < 4; i++) {
        players[i].missing_suit = determineMissingSuit(players[i].hand_cards);
    }
    
    return { gameState, players };
}

// 执行换三张操作
function performCardExchange(players, gameState, selectedCards) {
    console.log("=== 开始换三张 ===");
    
    // 生成全局的换牌点数（2-12）
    const globalExchangeNumber = Math.floor(Math.random() * 11) + 2; // 2-12
    console.log(`全局换牌点数: ${globalExchangeNumber}`);
    
    // 确定每位玩家的换牌对象
    const exchangeTargets = [];
    for (let i = 0; i < 4; i++) {
        let target;
        
        if ([3, 5, 7, 9, 11].includes(globalExchangeNumber)) {
            // 与对家交换
            target = (i + 2) % 4;
            console.log(`玩家${i}与对家玩家${target}交换牌`);
        } else if ([2, 6, 10].includes(globalExchangeNumber)) {
            // 从下家拿牌
            target = (i + 1) % 4;
            console.log(`玩家${i}从下家玩家${target}拿牌`);
        } else if ([4, 8, 12].includes(globalExchangeNumber)) {
            // 从上家拿牌
            target = (i + 3) % 4;
            console.log(`玩家${i}从上家玩家${target}拿牌`);
        }
        
        exchangeTargets.push(target);
    }
    
    // 每位玩家选择三张同牌型的牌
    const cardsToExchange = [];
    for (let i = 0; i < 4; i++) {
        const player = players[i];
        const cards = player.hand_cards;
        
        if (i === 0 && selectedCards) {
            // 玩家0使用传入的selectedCards
            cardsToExchange.push(selectedCards);
            console.log(`玩家${i}选择交换的牌: ${selectedCards.join(', ')}`);
            
            // 从手牌中移除这些牌
            for (const card of selectedCards) {
                const index = player.hand_cards.indexOf(card);
                if (index !== -1) {
                    player.hand_cards.splice(index, 1);
                }
            }
        } else {
            // AI自动选择牌
            // 按牌型分组
            const suitGroups = { '万': [], '条': [], '筒': [] };
            for (const card of cards) {
                const suit = card.slice(-1);
                suitGroups[suit].push(card);
            }
            
            // 选择数量最多的花色
            let maxSuit = null;
            let maxCount = 0;
            for (const [suit, suitCards] of Object.entries(suitGroups)) {
                if (suitCards.length >= 3 && suitCards.length > maxCount) {
                    maxSuit = suit;
                    maxCount = suitCards.length;
                }
            }
            
            // 如果没有足够的同牌型，随机选择
            let aiCardsToExchange;
            if (maxSuit) {
                aiCardsToExchange = suitGroups[maxSuit].slice(0, 3);
            } else {
                // 随机选择三张牌
                aiCardsToExchange = cards.slice(0, 3);
            }
            
            cardsToExchange.push(aiCardsToExchange);
            console.log(`玩家${i}选择交换的牌: ${aiCardsToExchange.join(', ')}`);
            
            // 从手牌中移除这些牌
            for (const card of aiCardsToExchange) {
                const index = player.hand_cards.indexOf(card);
                if (index !== -1) {
                    player.hand_cards.splice(index, 1);
                }
            }
        }
    }
    
    // 执行换牌
    const receivedCards = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
        const target = exchangeTargets[i];
        receivedCards[target] = receivedCards[target].concat(cardsToExchange[i]);
    }
    
    // 将收到的牌添加到每位玩家的手牌中
    for (let i = 0; i < 4; i++) {
        players[i].hand_cards = players[i].hand_cards.concat(receivedCards[i]);
        console.log(`玩家${i}收到的牌: ${receivedCards[i].join(', ')}`);
        console.log(`玩家${i}换牌后的手牌: ${players[i].hand_cards.join(', ')}`);
    }
    
    console.log("=== 换三张完成 ===");
}

// 洗牌函数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 确定缺门花色
function determineMissingSuit(handCards) {
    const suitCount = { '万': 0, '条': 0, '筒': 0 };
    
    for (const card of handCards) {
        const suit = card.slice(-1);
        suitCount[suit]++;
    }
    
    // 找出数量最少的花色
    let minCount = Infinity;
    let missingSuit = null;
    
    for (const [suit, count] of Object.entries(suitCount)) {
        if (count < minCount) {
            minCount = count;
            missingSuit = suit;
        }
    }
    
    return missingSuit;
}

// 检查胡牌条件
function checkHuCondition(player, targetCard = null, isSelfDraw = false) {
    // 条件1：缺门合规
    const allCards = player.hand_cards.concat(player.exposed_cards);
    const suits = allCards.map(card => card.slice(-1));
    if (player.missing_suit && suits.includes(player.missing_suit)) {
        return false;
    }
    
    // 条件2：牌型合法
    let tempCards = player.hand_cards.slice();
    if (!isSelfDraw && targetCard) {
        tempCards.push(targetCard);
    }
    
    if (!checkValidPattern(tempCards)) {
        return false;
    }
    
    // 条件3：番数≥1
    const fanCount = calculateFan(player, isSelfDraw, targetCard);
    if (fanCount < 1) {
        return false;
    }
    
    return true;
}

// 检查合法牌型
function checkValidPattern(cards) {
    // 排序手牌
    const sortedCards = sortCards(cards);
    
    // 检查小七对
    if (checkXiaoQiDui(sortedCards)) {
        return true;
    }
    
    // 检查常规牌型（1对将 + 若干顺子/刻子/杠子）
    for (let i = 0; i < sortedCards.length; i++) {
        // 尝试找将牌
        if (i > 0 && sortedCards[i] === sortedCards[i-1]) {
            const remainingCards = sortedCards.slice(0, i-1).concat(sortedCards.slice(i+1));
            if (checkMelds(remainingCards)) {
                return true;
            }
        }
    }
    
    return false;
}

// 排序手牌
function sortCards(cards) {
    const suitOrder = { '万': 0, '条': 1, '筒': 2 };
    return cards.sort((a, b) => {
        const suitA = a.slice(-1);
        const suitB = b.slice(-1);
        const numA = parseInt(a.slice(0, -1));
        const numB = parseInt(b.slice(0, -1));
        
        if (suitOrder[suitA] !== suitOrder[suitB]) {
            return suitOrder[suitA] - suitOrder[suitB];
        }
        return numA - numB;
    });
}

// 检查小七对
function checkXiaoQiDui(cards) {
    if (cards.length !== 14) return false;
    
    const countMap = {};
    for (const card of cards) {
        countMap[card] = (countMap[card] || 0) + 1;
    }
    
    // 小七对：7个对子
    const pairs = Object.values(countMap).filter(count => count === 2);
    return pairs.length === 7;
}

// 检查龙七对
function checkLongQiDui(cards) {
    if (cards.length !== 14) return false;
    
    const countMap = {};
    for (const card of cards) {
        countMap[card] = (countMap[card] || 0) + 1;
    }
    
    // 龙七对：6个对子 + 1个杠子
    const pairs = Object.values(countMap).filter(count => count === 2);
    const gangs = Object.values(countMap).filter(count => count === 4);
    return pairs.length === 6 && gangs.length === 1;
}

// 检查剩余牌是否能分解为顺子、刻子或杠子
function checkMelds(cards) {
    if (cards.length === 0) return true;
    
    // 尝试杠子（4张相同的牌）
    if (cards.length >= 4 && cards[0] === cards[1] && cards[1] === cards[2] && cards[2] === cards[3]) {
        return checkMelds(cards.slice(4));
    }
    
    // 尝试刻子（3张相同的牌）
    if (cards.length >= 3 && cards[0] === cards[1] && cards[1] === cards[2]) {
        return checkMelds(cards.slice(3));
    }
    
    // 尝试顺子
    if (cards.length >= 3) {
        const firstNum = parseInt(cards[0].slice(0, -1));
        const secondNum = parseInt(cards[1].slice(0, -1));
        const thirdNum = parseInt(cards[2].slice(0, -1));
        const firstSuit = cards[0].slice(-1);
        const secondSuit = cards[1].slice(-1);
        const thirdSuit = cards[2].slice(-1);
        
        if (firstSuit === secondSuit && secondSuit === thirdSuit &&
            secondNum === firstNum + 1 && thirdNum === secondNum + 1) {
            return checkMelds(cards.slice(3));
        }
    }
    
    return false;
}

// 计算番数
function calculateFan(player, isSelfDraw, targetCard) {
    let fan = 0;
    
    // 平胡基础番
    fan += 1;
    
    // 自摸
    if (isSelfDraw) {
        fan += 1;
    }
    
    // 检查对对胡
    if (checkDuiDuiHu(player.hand_cards)) {
        fan += 2;
    }
    
    // 检查清一色
    if (checkQingYiSe(player.hand_cards, player.exposed_cards)) {
        fan += 4;
    }
    
    // 检查小七对
    if (checkXiaoQiDui(player.hand_cards)) {
        fan += 4;
    }
    
    // 检查龙七对
    if (checkLongQiDui(player.hand_cards)) {
        fan += 8;
    }
    
    return fan;
}

// 检查对对胡
function checkDuiDuiHu(cards) {
    if (cards.length !== 14) return false;
    
    const sortedCards = sortCards(cards);
    
    // 找将牌
    let hasJiang = false;
    let i = 0;
    
    while (i < sortedCards.length) {
        if (i + 1 < sortedCards.length && sortedCards[i] === sortedCards[i+1]) {
            if (!hasJiang) {
                // 找到将牌
                hasJiang = true;
                i += 2;
            } else if (i + 2 < sortedCards.length && sortedCards[i] === sortedCards[i+1] && sortedCards[i] === sortedCards[i+2]) {
                // 找到刻子
                i += 3;
            } else {
                return false;
            }
        } else if (i + 3 < sortedCards.length && sortedCards[i] === sortedCards[i+1] && sortedCards[i] === sortedCards[i+2] && sortedCards[i] === sortedCards[i+3]) {
            // 找到杠子
            i += 4;
        } else {
            return false;
        }
    }
    
    return hasJiang;
}

// 检查清一色
function checkQingYiSe(handCards, exposedCards) {
    const allCards = handCards.concat(exposedCards);
    if (allCards.length === 0) return false;
    
    const suit = allCards[0].slice(-1);
    return allCards.every(card => card.slice(-1) === suit);
}

// 检查吃牌条件
function checkChiCondition(player, targetCard) {
    // 检查targetCard是否为null
    if (!targetCard) {
        return false;
    }
    
    const handCards = player.hand_cards;
    const targetNum = parseInt(targetCard.slice(0, -1));
    const targetSuit = targetCard.slice(-1);
    
    // 检查是否有缺门违规
    if (player.missing_suit === targetSuit) {
        return false;
    }
    
    // 统计手牌中同花色的牌
    const sameSuitCards = handCards.filter(card => card.slice(-1) === targetSuit);
    const numCounts = {};
    
    for (const card of sameSuitCards) {
        const num = parseInt(card.slice(0, -1));
        numCounts[num] = (numCounts[num] || 0) + 1;
    }
    
    // 检查是否能组成顺子
    // 可能的顺子组合：targetNum-2, targetNum-1, targetNum 或 targetNum-1, targetNum, targetNum+1 或 targetNum, targetNum+1, targetNum+2
    const possibleCombinations = [
        [targetNum-2, targetNum-1, targetNum],
        [targetNum-1, targetNum, targetNum+1],
        [targetNum, targetNum+1, targetNum+2]
    ];
    
    for (const combo of possibleCombinations) {
        if (combo.every(num => num >= 1 && num <= 9)) {
            const [a, b, c] = combo;
            if (a === targetNum) {
                // 需要b和c
                if (numCounts[b] && numCounts[c]) {
                    return true;
                }
            } else if (b === targetNum) {
                // 需要a和c
                if (numCounts[a] && numCounts[c]) {
                    return true;
                }
            } else if (c === targetNum) {
                // 需要a和b
                if (numCounts[a] && numCounts[b]) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 检查碰牌条件
function checkPengCondition(player, targetCard) {
    // 检查targetCard是否为null
    if (!targetCard) {
        return false;
    }
    
    // 检查是否有缺门违规
    if (player.missing_suit === targetCard.slice(-1)) {
        return false;
    }
    
    // 统计手牌中相同牌的数量
    const count = player.hand_cards.filter(card => card === targetCard).length;
    return count >= 2;
}

// 检查杠牌条件（明杠）
function checkGangCondition(player, targetCard) {
    // 检查targetCard是否为null
    if (!targetCard) {
        return false;
    }
    
    // 检查是否有缺门违规
    if (player.missing_suit === targetCard.slice(-1)) {
        return false;
    }
    
    // 统计手牌中相同牌的数量
    const count = player.hand_cards.filter(card => card === targetCard).length;
    return count >= 3;
}

// 检查暗杠条件
function checkAnGangCondition(player) {
    // 统计手牌中每种牌的数量
    const countMap = {};
    for (const card of player.hand_cards) {
        countMap[card] = (countMap[card] || 0) + 1;
    }
    
    // 检查是否有4张相同的牌且不违反缺门规则
    for (const [card, count] of Object.entries(countMap)) {
        if (count === 4 && player.missing_suit !== card.slice(-1)) {
            return card;
        }
    }
    return null;
}

// 检查补杠条件
function checkBuGangCondition(player) {
    // 统计手牌中每种牌的数量
    const countMap = {};
    for (const card of player.hand_cards) {
        countMap[card] = (countMap[card] || 0) + 1;
    }
    
    // 统计已碰牌中每种牌的数量
    const exposedCountMap = {};
    for (const cardGroup of player.exposed_cards) {
        if (cardGroup.length === 3) {
            const card = cardGroup[0];
            if (card === cardGroup[1] && card === cardGroup[2]) {
                exposedCountMap[card] = (exposedCountMap[card] || 0) + 1;
            }
        }
    }
    
    // 检查是否有已碰的牌且手牌中有1张相同的牌
    for (const [card, count] of Object.entries(exposedCountMap)) {
        if (count > 0 && countMap[card] === 1 && player.missing_suit !== card.slice(-1)) {
            return card;
        }
    }
    return null;
}

// 处理吃牌
function handleChi(player, targetCard) {
    // 实现吃牌逻辑
    console.log(`玩家吃牌: ${targetCard}`);
    // 这里需要具体实现如何选择吃牌的组合
    // 简化处理，假设玩家选择了正确的组合
    player.exposed_cards.push(targetCard);
    // 从手牌中移除对应牌
    // 实际实现需要根据具体组合移除
    player.hand_cards = player.hand_cards.filter(card => card !== targetCard);
    // 玩家需要打出一张牌
    const discardedCard = chooseDiscardCard(player);
    // 只移除一张相同的牌
    const index = player.hand_cards.indexOf(discardedCard);
    if (index !== -1) {
        player.hand_cards.splice(index, 1);
    }
    return discardedCard;
}

// 处理碰牌
function handlePeng(player, targetCard) {
    console.log(`玩家碰牌: ${targetCard}`);
    // 添加到亮出的牌（作为一个数组，表示一组碰牌）
    player.exposed_cards.push([targetCard, targetCard, targetCard]);
    // 从手牌中移除两张
    let removedCount = 0;
    player.hand_cards = player.hand_cards.filter(card => {
        if (card === targetCard && removedCount < 2) {
            removedCount++;
            return false;
        }
        return true;
    });
    // 玩家需要打出一张牌
    const discardedCard = chooseDiscardCard(player);
    // 只移除一张相同的牌
    const index = player.hand_cards.indexOf(discardedCard);
    if (index !== -1) {
        player.hand_cards.splice(index, 1);
    }
    return discardedCard;
}

// 处理杠牌
function handleGang(player, targetCard, gameState, isAnGang = false, isBuGang = false) {
    console.log(`玩家杠牌: ${targetCard}`);
    // 添加到亮出的牌（作为一个数组，表示一组杠牌）
    player.exposed_cards.push([targetCard, targetCard, targetCard, targetCard]);
    // 从手牌中移除三张（如果是明杠或补杠）或四张（如果是暗杠）
    if (isAnGang) {
        // 暗杠：从手牌中移除四张
        let removedCount = 0;
        player.hand_cards = player.hand_cards.filter(card => {
            if (card === targetCard && removedCount < 4) {
                removedCount++;
                return false;
            }
            return true;
        });
    } else {
        // 明杠或补杠：从手牌中移除三张
        let removedCount = 0;
        player.hand_cards = player.hand_cards.filter(card => {
            if (card === targetCard && removedCount < 3) {
                removedCount++;
                return false;
            }
            return true;
        });
    }
    // 从牌墙补一张牌
    if (gameState.wall_cards.length > 0) {
        const drawnCard = gameState.wall_cards.pop(0);
        player.hand_cards.push(drawnCard);
        console.log(`玩家杠牌后摸牌：${drawnCard}`);
    }
    // 玩家需要打出一张牌
    const discardedCard = chooseDiscardCard(player);
    // 只移除一张相同的牌
    const index = player.hand_cards.indexOf(discardedCard);
    if (index !== -1) {
        player.hand_cards.splice(index, 1);
    }
    return discardedCard;
}

// 计算分数
function calculateScore(winner, isSelfDraw, dianpaoPlayer = null, targetCard = null) {
    const baseScore = 1;
    const fanCount = calculateFan(winner, isSelfDraw, targetCard);
    const totalScore = baseScore * fanCount;
    
    if (isSelfDraw) {
        // 自摸：所有未胡牌玩家各支付
        console.log(`自摸！赢家得分: ${totalScore * 3}`);
        winner.score += totalScore * 3;
    } else {
        // 点炮：点炮者单独支付
        console.log(`点炮！赢家得分: ${totalScore}`);
        winner.score += totalScore;
        if (dianpaoPlayer) {
            dianpaoPlayer.score -= totalScore;
        }
    }
}

// 检查游戏是否结束
function checkGameOver(gameState, players) {
    // 检查是否所有玩家都胡牌
    const allHu = players.every(player => player.is_hu);
    if (allHu) {
        gameState.game_over = true;
        console.log("游戏结束：所有玩家都胡牌了！");
        return true;
    }
    
    // 检查牌墙是否摸完
    if (gameState.wall_cards.length === 0) {
        gameState.game_over = true;
        console.log("游戏结束：牌墙已摸完，流局！");
        // 触发查叫查花猪
        checkLiuJu(players);
        return true;
    }
    
    return false;
}

// 检查玩家是否听牌
function checkTingCondition(player) {
    // 检查是否已经胡牌
    if (player.is_hu) {
        return false;
    }
    
    // 检查手牌数量是否正确
    if (player.hand_cards.length !== 14) {
        return false;
    }
    
    // 检查是否有缺门违规
    const allCards = player.hand_cards.concat(player.exposed_cards);
    const suits = allCards.map(card => card.slice(-1));
    if (player.missing_suit && suits.includes(player.missing_suit)) {
        return false;
    }
    
    // 模拟打出每一张牌，看是否能听牌
    const uniqueCards = [...new Set(player.hand_cards)];
    for (const card of uniqueCards) {
        // 复制手牌并移除一张
        const tempCards = player.hand_cards.filter(c => c !== card);
        
        // 检查是否为听牌状态
        if (canTing(tempCards)) {
            return true;
        }
    }
    
    return false;
}

// 检查是否为听牌状态
function canTing(cards) {
    // 听牌状态：手牌可以组成4个刻子/顺子 + 1个对子
    // 或者七对子
    
    // 检查七对子
    if (checkXiaoQiDui(cards)) {
        return true;
    }
    
    // 检查常规牌型
    return checkRegularPattern(cards);
}

// 检查常规牌型是否为听牌状态
function checkRegularPattern(cards) {
    // 复制并排序牌
    const sortedCards = sortCards(cards.slice());
    
    // 尝试所有可能的对子
    for (let i = 0; i < sortedCards.length - 1; i++) {
        if (sortedCards[i] === sortedCards[i + 1]) {
            // 假设这是对子
            const remaining = [...sortedCards.slice(0, i), ...sortedCards.slice(i + 2)];
            if (checkAllGroups(remaining)) {
                return true;
            }
        }
    }
    
    return false;
}

// 检查是否可以组成听牌的所有牌组
function checkAllGroups(cards) {
    if (cards.length === 0) {
        return true;
    }
    
    // 尝试组成刻子
    if (cards.length >= 3 && cards[0] === cards[1] && cards[1] === cards[2]) {
        const remaining = cards.slice(3);
        if (checkAllGroups(remaining)) {
            return true;
        }
    }
    
    // 尝试组成顺子
    if (cards.length >= 3) {
        const first = cards[0];
        const second = getNextCard(first);
        const third = getNextCard(second);
        
        if (cards.includes(second) && cards.includes(third)) {
            const remaining = [...cards];
            remaining.splice(remaining.indexOf(first), 1);
            remaining.splice(remaining.indexOf(second), 1);
            remaining.splice(remaining.indexOf(third), 1);
            
            if (checkAllGroups(remaining)) {
                return true;
            }
        }
    }
    
    return false;
}

// 获取下一张牌
function getNextCard(card) {
    const rank = parseInt(card.slice(0, -1));
    const suit = card.slice(-1);
    
    if (rank >= 9) {
        return null;
    }
    
    return (rank + 1) + suit;
}

// 流局查叫查花猪
function checkLiuJu(players) {
    const baseScore = 1;
    
    // 查花猪
    const nonHuazhuPlayers = players.filter(player => !player.is_huazhu);
    const huazhuPlayers = players.filter(player => player.is_huazhu);
    
    for (const huazhuPlayer of huazhuPlayers) {
        const penalty = baseScore * 16 * nonHuazhuPlayers.length;
        huazhuPlayer.score -= penalty;
        for (const nonHuazhuPlayer of nonHuazhuPlayers) {
            nonHuazhuPlayer.score += baseScore * 16;
        }
        console.log(`花猪惩罚：${huazhuPlayer.score}分`);
    }
    
    // 查叫
    const hasJiaoPlayers = players.filter(player => player.has_jiao && !player.is_hu);
    const noJiaoPlayers = players.filter(player => !player.has_jiao && !player.is_hu);
    
    for (const noJiaoPlayer of noJiaoPlayers) {
        for (const hasJiaoPlayer of hasJiaoPlayers) {
            const fanCount = calculateFan(hasJiaoPlayer, false);
            const penalty = baseScore * fanCount;
            noJiaoPlayer.score -= penalty;
            hasJiaoPlayer.score += penalty;
            console.log(`查叫惩罚：${noJiaoPlayer.score}分，${hasJiaoPlayer.score}分`);
        }
    }
}

// 选择要打出的牌（智能策略）
function chooseDiscardCard(player) {
    // 统计手牌中每种牌的数量
    const cardCount = {};
    player.hand_cards.forEach(card => {
        cardCount[card] = (cardCount[card] || 0) + 1;
    });
    
    // 计算每张牌的优先级分数（分数越高越应该打出）
    const cardScores = {};
    player.hand_cards.forEach(card => {
        let score = 0;
        
        // 1. 缺门花色的牌优先级高（应该优先打出）
        const suit = card.slice(-1);
        if (suit === player.missing_suit) {
            score += 200; // 提高缺门花色的优先级
            
            // 1.1 缺门花色的对子也应该优先打出
            if (cardCount[card] === 2) {
                score += 100; // 缺门花色的对子优先级更高
            }
            
            // 1.2 缺门花色的三张也应该优先打出
            if (cardCount[card] === 3) {
                score += 50; // 缺门花色的三张优先级较高
            }
        }
        
        // 2. 单张牌优先级高（没有对子的牌）
        if (cardCount[card] === 1) {
            score += 50;
            
            // 2.1 检查单张牌是否能组成顺子
            const rank = parseInt(card.slice(0, -1));
            const suit = card.slice(-1);
            const prevCard = (rank - 1) + suit;
            const nextCard = (rank + 1) + suit;
            const prevPrevCard = (rank - 2) + suit;
            const nextNextCard = (rank + 2) + suit;
            
            // 检查是否有相邻的牌可以组成顺子
            const hasAdjacent = player.hand_cards.includes(prevCard) || player.hand_cards.includes(nextCard);
            const hasTwoAway = player.hand_cards.includes(prevPrevCard) || player.hand_cards.includes(nextNextCard);
            
            if (hasAdjacent) {
                score -= 30; // 如果有相邻牌，降低优先级
            }
            if (hasTwoAway) {
                score -= 20; // 如果有隔一张的牌，降低优先级
            }
        }
        
        // 3. 边张牌（1或9）优先级较高
        const rank = parseInt(card.slice(0, -1));
        if (rank === 1 || rank === 9) {
            score += 30;
        }
        
        // 4. 坎张牌（2或8）优先级中等
        if (rank === 2 || rank === 8) {
            score += 20;
        }
        
        // 5. 中张牌（3-7）优先级较低
        if (rank >= 3 && rank <= 7) {
            score += 10;
        }
        
        // 6. 对子优先级低（应该保留）
        if (cardCount[card] === 2) {
            score -= 20;
        }
        
        // 7. 三张牌优先级更低（可以碰或杠）
        if (cardCount[card] === 3) {
            score -= 40;
        }
        
        // 8. 四张牌优先级最低（可以杠）
        if (cardCount[card] === 4) {
            score -= 60;
        }
        
        // 9. 听牌时的策略：避免打出可能点炮的牌
        if (player.has_jiao) {
            // 简单实现：如果是单张，且可能组成顺子，降低优先级
            if (cardCount[card] === 1) {
                const rank = parseInt(card.slice(0, -1));
                const suit = card.slice(-1);
                const prevCard = (rank - 1) + suit;
                const nextCard = (rank + 1) + suit;
                
                if (player.hand_cards.includes(prevCard) || player.hand_cards.includes(nextCard)) {
                    score -= 50; // 听牌时，保留可能组成顺子的单张
                }
            }
        }
        
        // 10. 花色分布策略：避免花猪
        const suitCount = {};
        player.hand_cards.forEach(c => {
            const s = c.slice(-1);
            suitCount[s] = (suitCount[s] || 0) + 1;
        });
        
        // 如果某花色只有1张，优先打出
        if (suitCount[suit] === 1) {
            score += 40;
        }
        
        cardScores[card] = score;
    });
    
    // 找出优先级最高的牌
    let highestScore = -Infinity;
    let cardsToDiscard = [];
    
    for (const [card, score] of Object.entries(cardScores)) {
        if (score > highestScore) {
            highestScore = score;
            cardsToDiscard = [card];
        } else if (score === highestScore) {
            cardsToDiscard.push(card);
        }
    }
    
    // 从优先级最高的牌中随机选择一张
    const randomIndex = Math.floor(Math.random() * cardsToDiscard.length);
    return cardsToDiscard[randomIndex];
}

// 主游戏循环
function gameLoop() {
    const { gameState, players } = initGame();
    
    console.log("游戏开始！");
    console.log(`庄家是玩家${gameState.banker}`);
    
    // 打印初始手牌
    for (let i = 0; i < 4; i++) {
        console.log(`玩家${i}的手牌：${players[i].hand_cards.join(', ')}`);
        console.log(`玩家${i}的缺门：${players[i].missing_suit}`);
    }
    
    // 游戏循环
    while (!gameState.game_over) {
        const currentPlayer = players[gameState.current_turn];
        
        if (currentPlayer.is_hu) {
            // 已胡牌的玩家跳过
            gameState.current_turn = (gameState.current_turn + 1) % 4;
            continue;
        }
        
        console.log(`\n轮到玩家${gameState.current_turn}出牌`);
        
        // 步骤1：摸牌
        if (gameState.wall_cards.length > 0) {
            const drawCard = gameState.wall_cards.pop(0);
            currentPlayer.hand_cards.push(drawCard);
            console.log(`玩家${gameState.current_turn}摸牌：${drawCard}`);
        }
        
        // 步骤2：判断是否自摸胡牌
        if (checkHuCondition(currentPlayer, null, true)) {
            currentPlayer.is_hu = true;
            console.log(`玩家${gameState.current_turn}自摸胡牌！`);
            calculateScore(currentPlayer, true, null, null);
            if (checkGameOver(gameState, players)) {
                break;
            }
            gameState.current_turn = (gameState.current_turn + 1) % 4;
            continue;
        }
        
        // 步骤3：出牌
        const discardCard = chooseDiscardCard(currentPlayer);
        gameState.discarded_pile.push(discardCard);
        currentPlayer.hand_cards = currentPlayer.hand_cards.filter(card => card !== discardCard);
        console.log(`玩家${gameState.current_turn}出牌：${discardCard}`);
        
        // 步骤4：其他玩家响应
        let hasAction = false;
        
        // 按逆时针顺序检查其他玩家
        for (let i = 1; i <= 3; i++) {
            const otherPlayerIndex = (gameState.current_turn + i) % 4;
            const otherPlayer = players[otherPlayerIndex];
            
            if (otherPlayer.is_hu) {
                continue;
            }
            
            // 检查是否能胡
            if (checkHuCondition(otherPlayer, discardCard, false)) {
                otherPlayer.is_hu = true;
                console.log(`玩家${otherPlayerIndex}胡牌！`);
                calculateScore(otherPlayer, false, currentPlayer, discardCard);
                hasAction = true;
                if (checkGameOver(gameState, players)) {
                    break;
                }
                break;
            }
            
            // 检查是否能杠
            else if (checkGangCondition(otherPlayer, discardCard)) {
                const discarded = handleGang(otherPlayer, discardCard, gameState);
                if (discarded) {
                    gameState.discarded_pile.push(discarded);
                }
                hasAction = true;
                break;
            }
            
            // 检查是否能碰
            else if (checkPengCondition(otherPlayer, discardCard)) {
                const discarded = handlePeng(otherPlayer, discardCard);
                if (discarded) {
                    gameState.discarded_pile.push(discarded);
                }
                hasAction = true;
                break;
            }
            
            // 检查是否能吃（仅下家）
            else if (i === 1 && checkChiCondition(otherPlayer, discardCard)) {
                const discarded = handleChi(otherPlayer, discardCard);
                if (discarded) {
                    gameState.discarded_pile.push(discarded);
                }
                hasAction = true;
                break;
            }
        }
        
        if (!hasAction) {
            // 没有人响应，轮到下一个玩家
            gameState.current_turn = (gameState.current_turn + 1) % 4;
        }
        
        // 检查游戏结束
        if (checkGameOver(gameState, players)) {
            break;
        }
    }
    
    // 游戏结束，打印最终分数
    console.log("\n游戏结束！最终分数：");
    for (let i = 0; i < 4; i++) {
        console.log(`玩家${i}：${players[i].score}分`);
    }
}

// 运行游戏
gameLoop();